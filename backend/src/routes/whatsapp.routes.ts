import { Router, Request, Response, NextFunction } from 'express';
import { whatsappService } from '../services/whatsapp.service';
import { validationService } from '../services/validation.service';
import { claudeService } from '../services/claude.service';
import { ocrService } from '../services/ocr.service';
import { countryRequirementsService } from '../services/countryRequirements.service';
import { logger } from '../utils/logger';
import { WhatsAppWebhookPayload, UploadedDocument } from '../models/types';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';

const router = Router();

// In-memory session tracking (use Redis in production)
const userSessions: Map<string, {
  country: string | null;
  travelDate: string | null;
  documents: UploadedDocument[];
  lastActivity: number;
}> = new Map();

/**
 * GET /api/whatsapp/webhook
 * Webhook verification for WhatsApp
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const result = whatsappService.verifyWebhook(mode, token, challenge);

  if (result) {
    res.status(200).send(result);
  } else {
    res.status(403).send('Verification failed');
  }
});

/**
 * POST /api/whatsapp/webhook
 * Handle incoming WhatsApp messages
 */
router.post('/webhook', async (req: Request, res: Response) => {
  // Always respond quickly to WhatsApp
  res.status(200).send('OK');

  try {
    const payload = req.body as WhatsAppWebhookPayload;
    const { messages, contacts } = whatsappService.parseWebhookPayload(payload);

    for (const message of messages) {
      await handleWhatsAppMessage(message, contacts);
    }
  } catch (error) {
    logger.error('WhatsApp webhook error:', error);
  }
});

/**
 * Handle individual WhatsApp message
 */
async function handleWhatsAppMessage(
  message: any,
  contacts: Array<{ name: string; wa_id: string }>
) {
  const from = message.from;
  const userName = contacts.find(c => c.wa_id === from)?.name || 'User';

  // Get or create user session
  let session = userSessions.get(from);
  if (!session) {
    session = {
      country: null,
      travelDate: null,
      documents: [],
      lastActivity: Date.now(),
    };
    userSessions.set(from, session);
  }
  session.lastActivity = Date.now();

  // Handle different message types
  if (message.type === 'text') {
    await handleTextMessage(from, message.text.body, session, userName);
  } else if (message.type === 'image') {
    await handleImageMessage(from, message.image, session);
  } else if (message.type === 'document') {
    await handleDocumentMessage(from, message.document, session);
  }
}

/**
 * Handle text messages
 */
async function handleTextMessage(
  from: string,
  text: string,
  session: any,
  userName: string
) {
  const lowerText = text.toLowerCase().trim();

  // Check for greetings / start
  if (
    lowerText.includes('سلام') ||
    lowerText.includes('hello') ||
    lowerText.includes('hi') ||
    lowerText === 'start' ||
    lowerText === '/start'
  ) {
    await whatsappService.sendTextMessage(
      from,
      `🇵🇰 *Welcome to BEOE Document Validator*

السلام علیکم ${userName}!

I'll help you verify your travel documents before you go to the airport.

آپ کی دستاویزات کی تصدیق میں مدد کروں گا۔

Which country are you traveling to?
آپ کس ملک جا رہے ہیں؟

Reply with country name (e.g., Saudi Arabia, UAE, Qatar)`
    );
    return;
  }

  // Check for country selection
  const countries = ['saudi', 'uae', 'qatar', 'oman', 'kuwait', 'bahrain', 'malaysia', 'uk', 'usa', 'canada'];
  const matchedCountry = countries.find(c => lowerText.includes(c));

  if (matchedCountry || !session.country) {
    if (matchedCountry) {
      session.country = countryRequirementsService.normalizeCountryCode(matchedCountry);
      const requirements = await countryRequirementsService.getRequirements(session.country);

      let docList = '1️⃣ Passport (photo page)\n2️⃣ Visa copy';
      if (requirements?.beoe_registration) {
        docList += '\n3️⃣ BEOE registration';
      }
      if (requirements?.medical_required) {
        docList += `\n4️⃣ ${requirements.medical_type || 'Medical'} certificate`;
      }
      docList += '\n5️⃣ Airline ticket';

      await whatsappService.sendTextMessage(
        from,
        `✅ Great! You're traveling to *${matchedCountry.toUpperCase()}*

Please send me photos of these documents:
براہ کرم یہ دستاویزات بھیجیں:

${docList}

Send documents one by one as photos.
ایک ایک کر کے تصاویر بھیجیں۔

Type "done" or "تصدیق" when finished to get validation results.`
      );
    } else {
      await whatsappService.sendTextMessage(
        from,
        `Please tell me your destination country first.
پہلے بتائیں کہ آپ کس ملک جا رہے ہیں۔

Example: Saudi Arabia, UAE, Qatar, Malaysia, UK, USA`
      );
    }
    return;
  }

  // Check for validation trigger
  if (
    lowerText === 'done' ||
    lowerText === 'validate' ||
    lowerText.includes('تصدیق') ||
    lowerText === 'check'
  ) {
    if (session.documents.length === 0) {
      await whatsappService.sendTextMessage(
        from,
        `⚠️ You haven't sent any documents yet.
آپ نے ابھی تک کوئی دستاویز نہیں بھیجی۔

Please send your documents as photos first.`
      );
      return;
    }

    await whatsappService.sendTextMessage(from, '⏳ Validating your documents...\nآپ کی دستاویزات کی تصدیق ہو رہی ہے...');

    try {
      // Run validation
      const { result } = await validationService.validate(
        session.country!,
        session.travelDate,
        session.documents,
        from
      );

      // Generate and send response
      const { english, urdu } = await claudeService.generateResponseMessage(result);
      await whatsappService.sendValidationResult(from, english, urdu);

      // Clear session documents after validation
      session.documents = [];
    } catch (error) {
      logger.error('Validation error:', error);
      await whatsappService.sendTextMessage(
        from,
        '❌ Sorry, there was an error processing your documents. Please try again.\nمعذرت، دستاویزات کی تصدیق میں خرابی ہوئی۔ براہ کرم دوبارہ کوشش کریں۔'
      );
    }
    return;
  }

  // Check for help
  if (lowerText === 'help' || lowerText === 'مدد') {
    await whatsappService.sendTextMessage(
      from,
      `📋 *How to use BEOE Document Validator*

1️⃣ Tell me your destination country
2️⃣ Send photos of your documents one by one
3️⃣ Type "done" to get validation results

Commands:
• "start" - Start over
• "done" - Validate documents
• "help" - Show this message

مدد:
• "start" - دوبارہ شروع کریں
• "تصدیق" - دستاویزات کی تصدیق
• "مدد" - یہ پیغام دیکھیں`
    );
    return;
  }

  // Default response
  await whatsappService.sendTextMessage(
    from,
    `I didn't understand that. Send "help" for instructions.
سمجھ نہیں آیا۔ "مدد" لکھیں ہدایات کے لیے۔`
  );
}

/**
 * Handle image messages
 */
async function handleImageMessage(from: string, image: any, session: any) {
  if (!session.country) {
    await whatsappService.sendTextMessage(
      from,
      `Please tell me your destination country first before sending documents.
پہلے بتائیں کہ آپ کس ملک جا رہے ہیں۔`
    );
    return;
  }

  try {
    // Get media URL and download
    const mediaUrl = await whatsappService.getMediaUrl(image.id);
    if (!mediaUrl) {
      throw new Error('Could not get media URL');
    }

    const mediaBuffer = await whatsappService.downloadMedia(mediaUrl);
    if (!mediaBuffer) {
      throw new Error('Could not download media');
    }

    // Add to session documents
    session.documents.push({
      type: 'other',
      file: mediaBuffer,
      filename: `document_${Date.now()}.jpg`,
      mimetype: image.mime_type || 'image/jpeg',
    });

    await whatsappService.sendTextMessage(
      from,
      `✅ Document received (${session.documents.length} total)
دستاویز موصول ہو گئی (کل ${session.documents.length})

Send more documents or type "done" to validate.
مزید دستاویزات بھیجیں یا "تصدیق" لکھیں۔`
    );
  } catch (error) {
    logger.error('Image processing error:', error);
    await whatsappService.sendTextMessage(
      from,
      '❌ Could not process image. Please try again with a clearer photo.\nتصویر پروسیس نہیں ہو سکی۔ واضح تصویر بھیجیں۔'
    );
  }
}

/**
 * Handle document messages (PDF, etc)
 */
async function handleDocumentMessage(from: string, document: any, session: any) {
  if (!session.country) {
    await whatsappService.sendTextMessage(
      from,
      `Please tell me your destination country first before sending documents.
پہلے بتائیں کہ آپ کس ملک جا رہے ہیں۔`
    );
    return;
  }

  try {
    const mediaUrl = await whatsappService.getMediaUrl(document.id);
    if (!mediaUrl) {
      throw new Error('Could not get media URL');
    }

    const mediaBuffer = await whatsappService.downloadMedia(mediaUrl);
    if (!mediaBuffer) {
      throw new Error('Could not download media');
    }

    session.documents.push({
      type: 'other',
      file: mediaBuffer,
      filename: document.filename || `document_${Date.now()}.pdf`,
      mimetype: document.mime_type || 'application/pdf',
    });

    await whatsappService.sendTextMessage(
      from,
      `✅ Document "${document.filename}" received
دستاویز موصول ہو گئی

Send more or type "done" to validate.`
    );
  } catch (error) {
    logger.error('Document processing error:', error);
    await whatsappService.sendTextMessage(
      from,
      '❌ Could not process document. Please try again.\nدستاویز پروسیس نہیں ہو سکی۔'
    );
  }
}

// Cleanup old sessions periodically
setInterval(() => {
  const cutoff = Date.now() - 3600000; // 1 hour
  for (const [key, session] of userSessions.entries()) {
    if (session.lastActivity < cutoff) {
      userSessions.delete(key);
    }
  }
}, 600000); // Every 10 minutes

export default router;

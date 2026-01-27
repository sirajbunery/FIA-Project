import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { WhatsAppMessage, WhatsAppWebhookPayload } from '../models/types';

interface WhatsAppMediaResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
}

export class WhatsAppService {
  private client: AxiosInstance;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(config.whatsappApiKey && config.whatsappPhoneNumberId);

    this.client = axios.create({
      baseURL: config.whatsappApiUrl,
      headers: {
        'Authorization': `Bearer ${config.whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Verify webhook callback
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === config.whatsappWebhookVerifyToken) {
      logger.info('WhatsApp webhook verified');
      return challenge;
    }
    return null;
  }

  /**
   * Parse incoming webhook payload
   */
  parseWebhookPayload(payload: WhatsAppWebhookPayload): {
    messages: WhatsAppMessage[];
    contacts: Array<{ name: string; wa_id: string }>;
  } {
    const messages: WhatsAppMessage[] = [];
    const contacts: Array<{ name: string; wa_id: string }> = [];

    if (payload.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            messages.push(...change.value.messages);
          }
          if (change.value.contacts) {
            contacts.push(
              ...change.value.contacts.map(c => ({
                name: c.profile.name,
                wa_id: c.wa_id,
              }))
            );
          }
        }
      }
    }

    return { messages, contacts };
  }

  /**
   * Send text message
   */
  async sendTextMessage(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('WhatsApp not configured, message not sent:', { to, message: message.substring(0, 50) });
      return false;
    }

    try {
      await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message },
      });
      return true;
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send interactive button message
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('WhatsApp not configured');
      return false;
    }

    try {
      await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.map(b => ({
              type: 'reply',
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      });
      return true;
    } catch (error) {
      logger.error('Failed to send button message:', error);
      return false;
    }
  }

  /**
   * Send list message for document selection
   */
  async sendListMessage(
    to: string,
    headerText: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('WhatsApp not configured');
      return false;
    }

    try {
      await this.client.post('/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: headerText },
          body: { text: bodyText },
          action: {
            button: buttonText,
            sections,
          },
        },
      });
      return true;
    } catch (error) {
      logger.error('Failed to send list message:', error);
      return false;
    }
  }

  /**
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string): Promise<string | null> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const response = await this.client.get<WhatsAppMediaResponse>(`/${mediaId}`);
      return response.data.url;
    } catch (error) {
      logger.error('Failed to get media URL:', error);
      return null;
    }
  }

  /**
   * Download media file
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer | null> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const response = await axios.get(mediaUrl, {
        headers: {
          'Authorization': `Bearer ${config.whatsappApiKey}`,
        },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download media:', error);
      return null;
    }
  }

  /**
   * Send welcome message with document instructions
   */
  async sendWelcomeMessage(to: string, country: string): Promise<void> {
    const welcomeMessage = `🇵🇰 *BEOE Document Validator*

Welcome! I'll help verify your travel documents for ${country}.

Please send me the following documents as photos:

1️⃣ Passport (photo page)
2️⃣ Visa copy
3️⃣ GAMCA/Medical certificate (if applicable)
4️⃣ BEOE registration (for work travel)
5️⃣ Airline ticket

Send documents one by one, and I'll validate each one.

آپ کی دستاویزات کی تصدیق میں مدد کے لیے خوش آمدید!`;

    await this.sendTextMessage(to, welcomeMessage);
  }

  /**
   * Send validation result message
   */
  async sendValidationResult(
    to: string,
    englishResult: string,
    urduResult: string
  ): Promise<void> {
    await this.sendTextMessage(to, englishResult);

    // Send Urdu version
    if (urduResult) {
      await this.sendTextMessage(to, `\n📝 *اردو میں خلاصہ:*\n${urduResult}`);
    }
  }

  /**
   * Send document received acknowledgment
   */
  async sendDocumentReceived(to: string, documentType: string): Promise<void> {
    await this.sendTextMessage(
      to,
      `✅ Document received: ${documentType}\n\nProcessing... Please wait.\n\nدستاویز موصول ہو گئی۔ تصدیق جاری ہے...`
    );
  }

  /**
   * Send processing status update
   */
  async sendProcessingUpdate(to: string, status: string): Promise<void> {
    await this.sendTextMessage(to, `⏳ ${status}`);
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;

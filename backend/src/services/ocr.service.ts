import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExtractedText, DocumentType } from '../models/types';

const EXTRACTION_PROMPT = `You are a document text extraction specialist. Extract ALL text from this document image.

For travel documents, pay special attention to:
- Names (full name, surname, given names)
- Document numbers (passport number, visa number, etc.)
- Dates (issue date, expiry date, date of birth, travel dates)
- Nationality/Citizenship
- Visa type/category
- Flight numbers and airlines
- Hotel names and booking references
- Bank names and account details
- Amounts and currencies
- Addresses
- Any stamps or seals text

Return the extracted information in this JSON format:
{
  "raw_text": "all text found in the document",
  "document_type": "passport|visa|airline_ticket|bank_statement|hotel_booking|medical_certificate|work_permit|educational_certificate|driving_license|relationship_proof|other",
  "fields": {
    "name": "extracted name if found",
    "passport_number": "passport number if found",
    "visa_number": "visa number if found",
    "visa_type": "visa type/category if found",
    "expiry_date": "expiry date if found",
    "issue_date": "issue date if found",
    "date_of_birth": "DOB if found",
    "nationality": "nationality if found",
    "flight_number": "flight number if found",
    "airline": "airline name if found",
    "departure_date": "departure date if found",
    "return_date": "return date if found",
    "hotel_name": "hotel name if found",
    "booking_reference": "booking ref if found",
    "bank_name": "bank name if found",
    "account_balance": "balance if found",
    "statement_date": "statement date if found",
    "institution_name": "school/university name if found",
    "degree_title": "degree/certificate title if found",
    "license_number": "license number if found",
    "license_expiry": "license expiry if found"
  },
  "confidence": 85
}

Only include fields that you actually find in the document. Return valid JSON only.`;

export class OCRService {
  private client: Anthropic | null = null;

  constructor() {
    if (config.anthropicApiKey) {
      this.client = new Anthropic({
        apiKey: config.anthropicApiKey,
      });
    } else {
      logger.warn('Anthropic API key not configured. OCR will be unavailable.');
    }
  }

  /**
   * Preprocess image for better results
   */
  async preprocessImage(imagePath: string): Promise<Buffer> {
    try {
      const buffer = await sharp(imagePath)
        .resize(1500, null, { withoutEnlargement: true })
        .normalize()
        .sharpen()
        .jpeg({ quality: 85 })
        .toBuffer();

      return buffer;
    } catch (error) {
      logger.error('Image preprocessing failed:', error);
      // Return original file as buffer
      return await fs.readFile(imagePath);
    }
  }

  /**
   * Extract text from image using Claude Vision
   */
  async extractText(imagePath: string): Promise<ExtractedText> {
    if (!this.client) {
      throw new Error('OCR service not configured');
    }

    try {
      // Preprocess and get image buffer
      const imageBuffer = await this.preprocessImage(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Determine media type
      const ext = path.extname(imagePath).toLowerCase();
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      if (ext === '.png') mediaType = 'image/png';
      else if (ext === '.webp') mediaType = 'image/webp';
      else if (ext === '.gif') mediaType = 'image/gif';

      // Call Claude Vision
      const response = await this.client.messages.create({
        model: config.claudeModel,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse response
      const result = this.parseExtractionResponse(content.text);
      return result;
    } catch (error) {
      logger.error('Claude Vision extraction failed:', error);
      throw new Error('Failed to extract text from document');
    }
  }

  /**
   * Extract text from base64 encoded image
   */
  async extractTextFromBase64(base64Data: string, filename: string): Promise<ExtractedText> {
    if (!this.client) {
      throw new Error('OCR service not configured');
    }

    try {
      // Remove data URL prefix if present
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');

      // Determine media type from filename or data URL
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.png') mediaType = 'image/png';
      else if (ext === '.webp') mediaType = 'image/webp';
      else if (ext === '.gif') mediaType = 'image/gif';

      // Call Claude Vision directly with base64
      const response = await this.client.messages.create({
        model: config.claudeModel,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseExtractionResponse(content.text);
    } catch (error) {
      logger.error('Claude Vision extraction failed:', error);
      throw new Error('Failed to extract text from document');
    }
  }

  /**
   * Extract text from buffer
   */
  async extractTextFromBuffer(buffer: Buffer, filename: string): Promise<ExtractedText> {
    if (!this.client) {
      throw new Error('OCR service not configured');
    }

    try {
      // Process image with sharp
      const processedBuffer = await sharp(buffer)
        .resize(1500, null, { withoutEnlargement: true })
        .normalize()
        .jpeg({ quality: 85 })
        .toBuffer();

      const base64Image = processedBuffer.toString('base64');

      // Determine media type
      const ext = path.extname(filename).toLowerCase();
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      if (ext === '.png') mediaType = 'image/png';
      else if (ext === '.webp') mediaType = 'image/webp';

      // Call Claude Vision
      const response = await this.client.messages.create({
        model: config.claudeModel,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseExtractionResponse(content.text);
    } catch (error) {
      logger.error('Claude Vision extraction failed:', error);
      throw new Error('Failed to extract text from document');
    }
  }

  /**
   * Parse Claude's extraction response
   */
  private parseExtractionResponse(text: string): ExtractedText {
    try {
      // Clean up response
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanedText);

      return {
        raw_text: parsed.raw_text || '',
        confidence: parsed.confidence || 80,
        fields: parsed.fields || {},
        ocr_engine: 'claude_vision',
        detected_type: parsed.document_type || 'other',
      };
    } catch (error) {
      logger.error('Failed to parse extraction response:', error);
      return {
        raw_text: text,
        confidence: 50,
        fields: {},
        ocr_engine: 'claude_vision',
      };
    }
  }

  /**
   * Detect document type from extracted text
   */
  detectDocumentType(text: string, fields: Record<string, string>, detectedType?: string): DocumentType {
    // If Claude already detected the type, use it
    if (detectedType && detectedType !== 'other') {
      return detectedType as DocumentType;
    }

    const lowerText = text.toLowerCase();

    // Check for passport indicators
    if (lowerText.includes('passport') || lowerText.includes('پاسپورٹ') || fields.passport_number) {
      return 'passport';
    }

    // Check for visa indicators
    if (lowerText.includes('visa') || lowerText.includes('ویزا') || fields.visa_type || fields.visa_number) {
      return 'visa';
    }

    // Check for BEOE registration
    if (lowerText.includes('beoe') || lowerText.includes('emigration') || lowerText.includes('overseas employment')) {
      return 'beoe_registration';
    }

    // Check for medical/GAMCA certificate
    if (lowerText.includes('gamca') || lowerText.includes('medical fitness') || lowerText.includes('medical certificate')) {
      return 'gamca_certificate';
    }

    // Check for airline ticket
    if (lowerText.includes('boarding') || lowerText.includes('flight') || lowerText.includes('airline') ||
        lowerText.includes('itinerary') || fields.flight_number) {
      return 'airline_ticket';
    }

    // Check for return ticket specifically
    if (lowerText.includes('return') && (lowerText.includes('flight') || lowerText.includes('ticket'))) {
      return 'return_ticket';
    }

    // Check for insurance
    if (lowerText.includes('insurance') || lowerText.includes('policy')) {
      return 'travel_insurance';
    }

    // Check for bank statement
    if (lowerText.includes('bank') || lowerText.includes('statement') || lowerText.includes('account') || fields.bank_name) {
      return 'bank_statement';
    }

    // Check for work permit/contract
    if (lowerText.includes('work permit') || lowerText.includes('employment') || lowerText.includes('labor') ||
        lowerText.includes('contract')) {
      return 'work_permit';
    }

    // Check for hotel booking
    if (lowerText.includes('hotel') || lowerText.includes('reservation') || lowerText.includes('booking') ||
        lowerText.includes('accommodation') || fields.hotel_name) {
      return 'hotel_booking';
    }

    // Check for educational certificate
    if (lowerText.includes('degree') || lowerText.includes('diploma') || lowerText.includes('certificate') ||
        lowerText.includes('university') || lowerText.includes('college') || fields.degree_title) {
      return 'educational_certificate';
    }

    // Check for driving license
    if (lowerText.includes('driving') || lowerText.includes('license') || lowerText.includes('licence') ||
        fields.license_number) {
      return 'driving_license';
    }

    // Check for relationship documents
    if (lowerText.includes('marriage') || lowerText.includes('birth certificate') || lowerText.includes('family')) {
      return 'relationship_proof';
    }

    return 'other';
  }
}

export const ocrService = new OCRService();
export default ocrService;

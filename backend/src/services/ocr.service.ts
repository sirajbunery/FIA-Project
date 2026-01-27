import tesseract from 'node-tesseract-ocr';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExtractedText, DocumentType } from '../models/types';

interface OCRConfig {
  lang: string;
  oem: number;
  psm: number;
}

const tesseractConfig: OCRConfig = {
  lang: config.tesseractLang,
  oem: 1,
  psm: 3,
};

export class OCRService {
  /**
   * Preprocess image for better OCR results
   */
  async preprocessImage(imagePath: string): Promise<string> {
    const outputPath = imagePath.replace(/\.[^.]+$/, '_processed.png');

    try {
      await sharp(imagePath)
        .resize(2000, null, { withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      logger.error('Image preprocessing failed:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  async extractText(imagePath: string): Promise<ExtractedText> {
    try {
      // Preprocess the image
      const processedPath = await this.preprocessImage(imagePath);

      // Run Tesseract OCR
      const text = await tesseract.recognize(processedPath, tesseractConfig);

      // Clean up processed image if different from original
      if (processedPath !== imagePath) {
        await fs.unlink(processedPath).catch(() => {});
      }

      // Extract structured fields
      const fields = this.extractFields(text);

      return {
        raw_text: text,
        confidence: this.calculateConfidence(text),
        fields,
        ocr_engine: 'tesseract',
      };
    } catch (error) {
      logger.error('OCR extraction failed:', error);
      throw new Error('Failed to extract text from document');
    }
  }

  /**
   * Extract text from base64 encoded image
   */
  async extractTextFromBase64(base64Data: string, filename: string): Promise<ExtractedText> {
    const uploadDir = config.uploadDir;
    await fs.mkdir(uploadDir, { recursive: true });

    const tempPath = path.join(uploadDir, `temp_${Date.now()}_${filename}`);

    try {
      // Remove data URL prefix if present
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Image, 'base64');

      await fs.writeFile(tempPath, imageBuffer);
      const result = await this.extractText(tempPath);

      return result;
    } finally {
      // Clean up temp file
      await fs.unlink(tempPath).catch(() => {});
    }
  }

  /**
   * Calculate confidence score based on text quality
   */
  private calculateConfidence(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    // Simple confidence calculation based on text characteristics
    const factors = {
      hasLetters: /[a-zA-Z]/.test(text) ? 20 : 0,
      hasNumbers: /\d/.test(text) ? 20 : 0,
      hasProperSpacing: /\s/.test(text) ? 15 : 0,
      hasDates: /\d{2}[\/-]\d{2}[\/-]\d{4}|\d{4}[\/-]\d{2}[\/-]\d{2}/.test(text) ? 15 : 0,
      hasMinLength: text.length > 50 ? 15 : text.length > 20 ? 10 : 5,
      noExcessiveGarbage: !/[^\x00-\x7F]{10,}/.test(text) ? 15 : 0,
    };

    return Object.values(factors).reduce((sum, val) => sum + val, 0);
  }

  /**
   * Extract structured fields from OCR text
   */
  private extractFields(text: string): Record<string, string> {
    const fields: Record<string, string> = {};
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Passport number patterns
    const passportMatch = text.match(/(?:passport\s*(?:no|number)?[:\s]*)?([A-Z]{2}\d{7})/i);
    if (passportMatch) fields.passport_number = passportMatch[1];

    // Date patterns (DD/MM/YYYY or YYYY/MM/DD)
    const datePatterns = text.match(/(\d{2}[\/-]\d{2}[\/-]\d{4}|\d{4}[\/-]\d{2}[\/-]\d{2})/g);
    if (datePatterns) {
      // Try to identify date types by context
      const expiryMatch = text.match(/(?:expiry|expiration|valid\s*until|date\s*of\s*expiry)[:\s]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i);
      if (expiryMatch) fields.expiry_date = expiryMatch[1];

      const issueMatch = text.match(/(?:issue|issued|date\s*of\s*issue)[:\s]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i);
      if (issueMatch) fields.issue_date = issueMatch[1];

      const dobMatch = text.match(/(?:date\s*of\s*birth|dob|birth)[:\s]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i);
      if (dobMatch) fields.date_of_birth = dobMatch[1];
    }

    // Name patterns
    const nameMatch = text.match(/(?:name|surname|given\s*name)[:\s]*([A-Za-z\s]+)/i);
    if (nameMatch) fields.name = nameMatch[1].trim();

    // Visa type
    const visaTypeMatch = text.match(/(?:visa\s*type|type\s*of\s*visa|category)[:\s]*([A-Za-z0-9\s]+)/i);
    if (visaTypeMatch) fields.visa_type = visaTypeMatch[1].trim();

    // Flight number
    const flightMatch = text.match(/(?:flight|flt)[:\s]*([A-Z]{2}\d{3,4})/i);
    if (flightMatch) fields.flight_number = flightMatch[1];

    // BEOE Registration
    const beoeMatch = text.match(/(?:beoe|registration)[:\s#]*(\d{6,})/i);
    if (beoeMatch) fields.beoe_registration = beoeMatch[1];

    // Nationality
    const nationalityMatch = text.match(/(?:nationality|citizenship)[:\s]*([A-Za-z]+)/i);
    if (nationalityMatch) fields.nationality = nationalityMatch[1].trim();

    return fields;
  }

  /**
   * Detect document type from extracted text
   */
  detectDocumentType(text: string, fields: Record<string, string>): DocumentType {
    const lowerText = text.toLowerCase();

    // Check for passport indicators
    if (lowerText.includes('passport') || lowerText.includes('پاسپورٹ') || fields.passport_number) {
      return 'passport';
    }

    // Check for visa indicators
    if (lowerText.includes('visa') || lowerText.includes('ویزا') || fields.visa_type) {
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
    if (lowerText.includes('boarding') || lowerText.includes('flight') || lowerText.includes('airline') || fields.flight_number) {
      return 'airline_ticket';
    }

    // Check for insurance
    if (lowerText.includes('insurance') || lowerText.includes('policy')) {
      return 'travel_insurance';
    }

    // Check for bank statement
    if (lowerText.includes('bank') || lowerText.includes('statement') || lowerText.includes('account')) {
      return 'bank_statement';
    }

    // Check for work permit
    if (lowerText.includes('work permit') || lowerText.includes('employment') || lowerText.includes('labor')) {
      return 'work_permit';
    }

    // Check for hotel booking
    if (lowerText.includes('hotel') || lowerText.includes('reservation') || lowerText.includes('booking')) {
      return 'hotel_booking';
    }

    return 'other';
  }
}

export const ocrService = new OCRService();
export default ocrService;

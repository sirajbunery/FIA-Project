import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getSupabaseClient } from '../config/supabase';
import { ocrService } from './ocr.service';
import { claudeService } from './claude.service';
import {
  ValidationSession,
  Document,
  ValidationResult,
  DocumentType,
  ExtractedText,
  RequirementDetails,
  UploadedDocument,
  VisaType,
  VISA_DOCUMENT_REQUIREMENTS,
} from '../models/types';
import { countryRequirementsService } from './countryRequirements.service';

interface ProcessedDocument {
  id: string;
  type: DocumentType;
  extractedText: ExtractedText;
  filePath: string;
}

export class ValidationService {
  private supabase = getSupabaseClient();

  /**
   * Create a new validation session
   */
  async createSession(
    destinationCountry: string,
    travelDate: string | null,
    userId: string | null,
    visaType: VisaType | null = null
  ): Promise<ValidationSession> {
    const session: ValidationSession = {
      id: uuidv4(),
      user_id: userId,
      destination_country: destinationCountry,
      visa_type: visaType,
      travel_date: travelDate,
      status: 'processing',
      result: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await this.supabase
        .from('validation_sessions')
        .insert(session);

      if (error) {
        logger.warn('Failed to save session to database:', error);
      }
    } catch (err) {
      logger.warn('Database not available, continuing with in-memory session');
    }

    return session;
  }

  /**
   * Process uploaded documents
   */
  async processDocuments(
    sessionId: string,
    documents: UploadedDocument[]
  ): Promise<ProcessedDocument[]> {
    const processedDocs: ProcessedDocument[] = [];

    for (const doc of documents) {
      try {
        // Save file temporarily
        const filePath = await this.saveDocument(sessionId, doc);

        // Extract text using OCR
        let extractedText: ExtractedText;
        if (typeof doc.file === 'string' && doc.file.startsWith('data:')) {
          extractedText = await ocrService.extractTextFromBase64(doc.file, doc.filename);
        } else {
          extractedText = await ocrService.extractText(filePath);
        }

        // Detect document type if not specified
        let documentType = doc.type;
        if (documentType === 'other' || !documentType) {
          documentType = ocrService.detectDocumentType(
            extractedText.raw_text,
            extractedText.fields
          );
        }

        const processedDoc: ProcessedDocument = {
          id: uuidv4(),
          type: documentType,
          extractedText,
          filePath,
        };

        processedDocs.push(processedDoc);

        // Save document record to database
        await this.saveDocumentRecord(sessionId, processedDoc, doc.filename);
      } catch (error) {
        logger.error(`Failed to process document ${doc.filename}:`, error);
      }
    }

    return processedDocs;
  }

  /**
   * Validate all documents for a session
   */
  async validateSession(
    session: ValidationSession,
    processedDocs: ProcessedDocument[]
  ): Promise<ValidationResult> {
    // Get country requirements
    const requirements = await countryRequirementsService.getRequirements(
      session.destination_country
    );

    // Prepare documents for Claude validation
    const docsForValidation = processedDocs.map(doc => ({
      type: doc.type,
      extractedText: doc.extractedText,
    }));

    // Validate using Claude AI
    const result = await claudeService.validateDocuments(
      docsForValidation,
      session.destination_country,
      session.travel_date,
      requirements,
      session.visa_type
    );

    // Update session with result
    await this.updateSession(session.id, {
      status: result.status.toLowerCase() as 'ready' | 'incomplete' | 'issues',
      result,
    });

    return result;
  }

  /**
   * Full validation flow
   */
  async validate(
    destinationCountry: string,
    travelDate: string | null,
    documents: UploadedDocument[],
    userId: string | null = null,
    visaType: VisaType | null = null
  ): Promise<{ session: ValidationSession; result: ValidationResult }> {
    // Create session
    const session = await this.createSession(destinationCountry, travelDate, userId, visaType);

    // Process documents
    const processedDocs = await this.processDocuments(session.id, documents);

    if (processedDocs.length === 0) {
      const errorResult: ValidationResult = {
        status: 'ISSUES',
        ready_to_travel: false,
        confidence_score: 0,
        missing_documents: [],
        concerns: [{
          severity: 'high',
          issue: 'No documents could be processed',
          resolution: 'Please upload clear images of your documents',
        }],
        recommendations: ['Ensure documents are clearly visible', 'Use good lighting'],
        next_steps: ['Re-upload documents'],
        urdu_summary: 'کوئی دستاویز پروسیس نہیں ہو سکی۔ براہ کرم واضح تصاویر اپ لوڈ کریں۔',
        beoe_contacts: { required: false, office: null, phone: null, address: null },
        validated_at: new Date().toISOString(),
      };

      await this.updateSession(session.id, { status: 'issues', result: errorResult });
      return { session: { ...session, status: 'issues', result: errorResult }, result: errorResult };
    }

    // Validate documents
    const result = await this.validateSession(session, processedDocs);

    return {
      session: { ...session, status: result.status.toLowerCase() as any, result },
      result,
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<ValidationSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('validation_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as ValidationSession;
    } catch (err) {
      logger.error('Failed to get session:', err);
      return null;
    }
  }

  /**
   * Update session
   */
  private async updateSession(
    sessionId: string,
    updates: Partial<ValidationSession>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('validation_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        logger.warn('Failed to update session in database:', error);
      }
    } catch (err) {
      logger.warn('Database update failed:', err);
    }
  }

  /**
   * Save document file
   */
  private async saveDocument(sessionId: string, doc: UploadedDocument): Promise<string> {
    const uploadDir = path.join(config.uploadDir, sessionId);
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}_${doc.filename}`;
    const filePath = path.join(uploadDir, filename);

    if (typeof doc.file === 'string') {
      // Base64 encoded
      const base64Data = doc.file.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'));
    } else {
      // Buffer
      await fs.writeFile(filePath, doc.file);
    }

    return filePath;
  }

  /**
   * Save document record to database
   */
  private async saveDocumentRecord(
    sessionId: string,
    processedDoc: ProcessedDocument,
    originalFilename: string
  ): Promise<void> {
    try {
      const document: Document = {
        id: processedDoc.id,
        session_id: sessionId,
        document_type: processedDoc.type,
        file_path: processedDoc.filePath,
        file_name: originalFilename,
        extracted_text: processedDoc.extractedText,
        validation_result: null,
        uploaded_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('documents')
        .insert(document);

      if (error) {
        logger.warn('Failed to save document record:', error);
      }
    } catch (err) {
      logger.warn('Database insert failed:', err);
    }
  }

  /**
   * Get user's validation history
   */
  async getUserHistory(userId: string, limit: number = 10): Promise<ValidationSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('validation_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to get user history:', error);
        return [];
      }

      return data as ValidationSession[];
    } catch (err) {
      logger.error('Database query failed:', err);
      return [];
    }
  }

  /**
   * Cleanup old documents
   */
  async cleanupOldDocuments(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.documentRetentionDays);

    try {
      // Get old sessions
      const { data: oldSessions, error } = await this.supabase
        .from('validation_sessions')
        .select('id')
        .lt('created_at', cutoffDate.toISOString());

      if (error || !oldSessions) {
        return;
      }

      for (const session of oldSessions) {
        // Delete files
        const sessionDir = path.join(config.uploadDir, session.id);
        await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {});

        // Delete database records
        await this.supabase.from('documents').delete().eq('session_id', session.id);
        await this.supabase.from('validation_sessions').delete().eq('id', session.id);
      }

      logger.info(`Cleaned up ${oldSessions.length} old validation sessions`);
    } catch (err) {
      logger.error('Cleanup failed:', err);
    }
  }
}

export const validationService = new ValidationService();
export default validationService;

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { validationService } from '../services/validation.service';
import { claudeService } from '../services/claude.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { DocumentType, UploadedDocument } from '../models/types';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (config.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, PDF'));
    }
  },
});

/**
 * POST /api/validate
 * Upload and validate documents
 */
router.post(
  '/',
  upload.array('documents', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { destination_country, travel_date, document_types, user_phone } = req.body;

      if (!destination_country) {
        throw createError('Destination country is required', 400);
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw createError('At least one document is required', 400);
      }

      // Parse document types if provided
      let types: DocumentType[] = [];
      if (document_types) {
        try {
          types = JSON.parse(document_types);
        } catch {
          types = document_types.split(',').map((t: string) => t.trim() as DocumentType);
        }
      }

      // Convert files to UploadedDocument format
      const documents: UploadedDocument[] = files.map((file, index) => ({
        type: types[index] || 'other',
        file: file.buffer,
        filename: file.originalname,
        mimetype: file.mimetype,
      }));

      logger.info(`Validating ${documents.length} documents for ${destination_country}`);

      // Run validation
      const { session, result } = await validationService.validate(
        destination_country,
        travel_date || null,
        documents,
        user_phone || null
      );

      // Generate response message
      const { english, urdu } = await claudeService.generateResponseMessage(result);

      res.json({
        success: true,
        session_id: session.id,
        status: result.status,
        result,
        message: {
          english,
          urdu,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/validate/base64
 * Validate documents from base64 encoded images
 */
router.post('/base64', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { destination_country, travel_date, documents, user_phone } = req.body;

    if (!destination_country) {
      throw createError('Destination country is required', 400);
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      throw createError('At least one document is required', 400);
    }

    // Convert to UploadedDocument format
    const uploadedDocs: UploadedDocument[] = documents.map((doc: any) => ({
      type: doc.type || 'other',
      file: doc.data, // base64 string
      filename: doc.filename || 'document.jpg',
      mimetype: doc.mimetype || 'image/jpeg',
    }));

    logger.info(`Validating ${uploadedDocs.length} base64 documents for ${destination_country}`);

    // Run validation
    const { session, result } = await validationService.validate(
      destination_country,
      travel_date || null,
      uploadedDocs,
      user_phone || null
    );

    // Generate response message
    const { english, urdu } = await claudeService.generateResponseMessage(result);

    res.json({
      success: true,
      session_id: session.id,
      status: result.status,
      result,
      message: {
        english,
        urdu,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/validate/status/:sessionId
 * Check validation status
 */
router.get('/status/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const session = await validationService.getSession(sessionId);

    if (!session) {
      throw createError('Session not found', 404);
    }

    res.json({
      success: true,
      session_id: session.id,
      status: session.status,
      destination_country: session.destination_country,
      travel_date: session.travel_date,
      result: session.result,
      created_at: session.created_at,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

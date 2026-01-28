import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { validationService } from '../services/validation.service';
import { claudeService } from '../services/claude.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import {
  DocumentType,
  UploadedDocument,
  VisaType,
  VISA_TYPE_LABELS,
  VISA_DOCUMENT_REQUIREMENTS,
  DOCUMENT_TYPE_LABELS,
} from '../models/types';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
    files: 15,
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (config.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, PDF'));
    }
  },
});

/**
 * GET /api/validate/visa-types
 * Get all available visa types
 */
router.get('/visa-types', (req: Request, res: Response) => {
  const visaTypes = Object.entries(VISA_TYPE_LABELS).map(([type, labels]) => ({
    type,
    ...labels,
  }));

  res.json({
    success: true,
    visa_types: visaTypes,
  });
});

/**
 * GET /api/validate/requirements/:visaType
 * Get document requirements for a specific visa type
 */
router.get('/requirements/:visaType', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visaType } = req.params;

    if (!VISA_DOCUMENT_REQUIREMENTS[visaType as VisaType]) {
      throw createError('Invalid visa type', 400);
    }

    const requirements = VISA_DOCUMENT_REQUIREMENTS[visaType as VisaType];

    // Add labels to required and optional documents
    const requiredDocs = requirements.required.map(type => ({
      type,
      ...DOCUMENT_TYPE_LABELS[type],
    }));

    const optionalDocs = requirements.optional.map(type => ({
      type,
      ...DOCUMENT_TYPE_LABELS[type],
    }));

    res.json({
      success: true,
      visa_type: visaType,
      visa_label: VISA_TYPE_LABELS[visaType as VisaType],
      required_documents: requiredDocs,
      optional_documents: optionalDocs,
      notes: requirements.notes,
      notes_urdu: requirements.notes_urdu,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/validate
 * Upload and validate documents
 */
router.post(
  '/',
  upload.array('documents', 15),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { destination_country, visa_type, travel_date, document_types, user_phone } = req.body;

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

      logger.info(`Validating ${documents.length} documents for ${destination_country} (${visa_type || 'unknown visa type'})`);

      // Run validation
      const { session, result } = await validationService.validate(
        destination_country,
        travel_date || null,
        documents,
        user_phone || null,
        visa_type || null
      );

      // Generate response message
      const { english, urdu } = await claudeService.generateResponseMessage(result);

      res.json({
        success: true,
        session_id: session.id,
        status: result.status,
        visa_type: visa_type || null,
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
    const { destination_country, visa_type, travel_date, documents, user_phone } = req.body;

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

    logger.info(`Validating ${uploadedDocs.length} base64 documents for ${destination_country} (${visa_type || 'unknown visa type'})`);

    // Run validation
    const { session, result } = await validationService.validate(
      destination_country,
      travel_date || null,
      uploadedDocs,
      user_phone || null,
      visa_type || null
    );

    // Generate response message
    const { english, urdu } = await claudeService.generateResponseMessage(result);

    res.json({
      success: true,
      session_id: session.id,
      status: result.status,
      visa_type: visa_type || null,
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
      visa_type: session.visa_type,
      travel_date: session.travel_date,
      result: session.result,
      created_at: session.created_at,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

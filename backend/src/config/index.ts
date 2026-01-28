import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',

  // Claude API
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',

  // Gemini API (for AI Interview)
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',

  // WhatsApp (360Dialog)
  whatsappApiKey: process.env.WHATSAPP_API_KEY || '',
  whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappApiUrl: process.env.WHATSAPP_API_URL || 'https://waba.360dialog.io/v1',

  // Google Cloud (Optional for Vision API fallback)
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',

  // OCR Settings
  tesseractLang: process.env.TESSERACT_LANG || 'eng+urd',
  ocrTimeout: parseInt(process.env.OCR_TIMEOUT || '30000', 10),

  // Security
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  documentRetentionDays: parseInt(process.env.DOCUMENT_RETENTION_DAYS || '30', 10),

  // Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,application/pdf').split(','),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};

export default config;

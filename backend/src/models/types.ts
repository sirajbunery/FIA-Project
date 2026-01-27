// Database Types
export interface User {
  id: string;
  phone_number: string;
  name: string | null;
  created_at: string;
}

export interface ValidationSession {
  id: string;
  user_id: string | null;
  destination_country: string;
  travel_date: string | null;
  status: 'processing' | 'ready' | 'incomplete' | 'issues';
  result: ValidationResult | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  session_id: string;
  document_type: DocumentType;
  file_path: string;
  file_name: string;
  extracted_text: ExtractedText | null;
  validation_result: DocumentValidation | null;
  uploaded_at: string;
}

export interface CountryRequirement {
  id: string;
  country_code: string;
  country_name: string;
  requirements: RequirementDetails;
  updated_at: string;
}

// Document Types
export type DocumentType =
  | 'passport'
  | 'visa'
  | 'work_permit'
  | 'beoe_registration'
  | 'airline_ticket'
  | 'medical_certificate'
  | 'gamca_certificate'
  | 'travel_insurance'
  | 'bank_statement'
  | 'hotel_booking'
  | 'employment_contract'
  | 'police_clearance'
  | 'educational_certificate'
  | 'other';

export interface ExtractedText {
  raw_text: string;
  confidence: number;
  fields: Record<string, string>;
  ocr_engine: 'tesseract' | 'easyocr' | 'google_vision';
}

export interface DocumentValidation {
  is_valid: boolean;
  document_type_detected: DocumentType;
  issues: string[];
  extracted_info: Record<string, string>;
}

// Validation Result Types
export interface ValidationResult {
  status: 'READY' | 'INCOMPLETE' | 'ISSUES';
  ready_to_travel: boolean;
  confidence_score: number;
  missing_documents: MissingDocument[];
  concerns: Concern[];
  recommendations: string[];
  next_steps: string[];
  urdu_summary: string;
  beoe_contacts: BeoeContact;
  validated_at: string;
}

export interface MissingDocument {
  document: string;
  required: boolean;
  reason: string;
}

export interface Concern {
  severity: 'high' | 'medium' | 'low';
  issue: string;
  resolution: string;
}

export interface BeoeContact {
  required: boolean;
  office: string | null;
  phone: string | null;
  address: string | null;
}

// Country Requirement Types
export interface RequirementDetails {
  visa_required: boolean;
  beoe_registration: boolean;
  medical_required: boolean;
  medical_type: string | null;
  police_clearance: boolean;
  travel_insurance: boolean;
  minimum_passport_validity_months: number;
  additional_documents: string[];
  special_notes: string[];
  embassy_info: {
    address: string;
    phone: string;
    email: string;
    website: string;
  } | null;
}

// API Request/Response Types
export interface ValidateRequest {
  destination_country: string;
  travel_date?: string;
  documents: UploadedDocument[];
  user_phone?: string;
}

export interface UploadedDocument {
  type: DocumentType;
  file: Buffer | string;
  filename: string;
  mimetype: string;
}

export interface ValidateResponse {
  session_id: string;
  status: 'processing' | 'ready' | 'incomplete' | 'issues';
  result: ValidationResult | null;
  message: string;
}

// WhatsApp Types
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; filename: string; sha256: string };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{ id: string; status: string; timestamp: string }>;
      };
      field: string;
    }>;
  }>;
}

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
  visa_type: VisaType | null;
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

// Visa Types
export type VisaType =
  | 'tourist'
  | 'visit'
  | 'family'
  | 'work_professional'
  | 'work_skilled'
  | 'student'
  | 'business'
  | 'transit';

export const VISA_TYPE_LABELS: Record<VisaType, { english: string; urdu: string }> = {
  tourist: { english: 'Tourist Visa', urdu: 'سیاحتی ویزا' },
  visit: { english: 'Visit Visa', urdu: 'وزٹ ویزا' },
  family: { english: 'Family Visa', urdu: 'فیملی ویزا' },
  work_professional: { english: 'Work Visa (Professional/Educated)', urdu: 'ورک ویزا (پروفیشنل)' },
  work_skilled: { english: 'Work Visa (Skilled Labor/Driver)', urdu: 'ورک ویزا (مزدور/ڈرائیور)' },
  student: { english: 'Student Visa', urdu: 'اسٹوڈنٹ ویزا' },
  business: { english: 'Business Visa', urdu: 'بزنس ویزا' },
  transit: { english: 'Transit Visa', urdu: 'ٹرانزٹ ویزا' },
};

// Document Types
export type DocumentType =
  | 'passport'
  | 'visa'
  | 'work_permit'
  | 'beoe_registration'
  | 'airline_ticket'
  | 'return_ticket'
  | 'medical_certificate'
  | 'gamca_certificate'
  | 'travel_insurance'
  | 'bank_statement'
  | 'hotel_booking'
  | 'employment_contract'
  | 'police_clearance'
  | 'educational_certificate'
  | 'driving_license'
  | 'skill_certificate'
  | 'relationship_proof'
  | 'sponsor_id'
  | 'sponsor_documents'
  | 'invitation_letter'
  | 'admission_letter'
  | 'company_registration'
  | 'other';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { english: string; urdu: string }> = {
  passport: { english: 'Passport', urdu: 'پاسپورٹ' },
  visa: { english: 'Visa', urdu: 'ویزا' },
  work_permit: { english: 'Work Permit', urdu: 'ورک پرمٹ' },
  beoe_registration: { english: 'BEOE Registration', urdu: 'بی ای او ای رجسٹریشن' },
  airline_ticket: { english: 'Airline Ticket', urdu: 'ہوائی ٹکٹ' },
  return_ticket: { english: 'Return Ticket', urdu: 'واپسی کا ٹکٹ' },
  medical_certificate: { english: 'Medical Certificate', urdu: 'میڈیکل سرٹیفکیٹ' },
  gamca_certificate: { english: 'GAMCA Certificate', urdu: 'گیمکا سرٹیفکیٹ' },
  travel_insurance: { english: 'Travel Insurance', urdu: 'ٹریول انشورنس' },
  bank_statement: { english: 'Bank Statement', urdu: 'بینک اسٹیٹمنٹ' },
  hotel_booking: { english: 'Hotel Booking', urdu: 'ہوٹل بکنگ' },
  employment_contract: { english: 'Employment Contract', urdu: 'ملازمت کا معاہدہ' },
  police_clearance: { english: 'Police Clearance', urdu: 'پولیس کلیئرنس' },
  educational_certificate: { english: 'Educational Certificate/Degree', urdu: 'تعلیمی سرٹیفکیٹ/ڈگری' },
  driving_license: { english: 'Driving License', urdu: 'ڈرائیونگ لائسنس' },
  skill_certificate: { english: 'Skill Certificate', urdu: 'ہنر کا سرٹیفکیٹ' },
  relationship_proof: { english: 'Relationship Proof (Marriage/Birth Certificate)', urdu: 'رشتے کا ثبوت' },
  sponsor_id: { english: 'Sponsor ID Card (Iqama/Emirates ID)', urdu: 'سپانسر آئی ڈی' },
  sponsor_documents: { english: 'Sponsor Documents', urdu: 'سپانسر کی دستاویزات' },
  invitation_letter: { english: 'Invitation Letter', urdu: 'دعوت نامہ' },
  admission_letter: { english: 'University Admission Letter', urdu: 'یونیورسٹی داخلہ خط' },
  company_registration: { english: 'Company Registration', urdu: 'کمپنی رجسٹریشن' },
  other: { english: 'Other Document', urdu: 'دیگر دستاویز' },
};

// Visa-specific document requirements
export interface VisaDocumentRequirements {
  required: DocumentType[];
  optional: DocumentType[];
  notes: string[];
  notes_urdu: string[];
}

export const VISA_DOCUMENT_REQUIREMENTS: Record<VisaType, VisaDocumentRequirements> = {
  tourist: {
    required: ['passport', 'visa', 'airline_ticket', 'return_ticket', 'hotel_booking', 'bank_statement'],
    optional: ['travel_insurance'],
    notes: [
      'Return ticket is mandatory for tourist visa',
      'Bank statement should be recent (within 3 months)',
      'Hotel booking for entire stay required',
    ],
    notes_urdu: [
      'سیاحتی ویزا کے لیے واپسی کا ٹکٹ لازمی ہے',
      'بینک اسٹیٹمنٹ حالیہ ہونی چاہیے (3 ماہ کے اندر)',
      'پوری قیام کے لیے ہوٹل بکنگ ضروری ہے',
    ],
  },
  visit: {
    required: ['passport', 'visa', 'airline_ticket', 'return_ticket', 'bank_statement'],
    optional: ['hotel_booking', 'invitation_letter', 'travel_insurance'],
    notes: [
      'Return ticket is mandatory',
      'Bank statement should show sufficient funds',
      'Invitation letter recommended if visiting family/friends',
    ],
    notes_urdu: [
      'واپسی کا ٹکٹ لازمی ہے',
      'بینک اسٹیٹمنٹ میں کافی رقم ہونی چاہیے',
      'خاندان/دوستوں سے ملنے پر دعوت نامہ تجویز کردہ',
    ],
  },
  family: {
    required: ['passport', 'visa', 'airline_ticket', 'relationship_proof', 'sponsor_id', 'sponsor_documents'],
    optional: ['bank_statement', 'travel_insurance'],
    notes: [
      'Relationship proof (marriage certificate, birth certificate) is mandatory',
      'Sponsor ID card from destination country required',
      'Sponsor documents must show ability to support',
    ],
    notes_urdu: [
      'رشتے کا ثبوت (شادی کا سرٹیفکیٹ، پیدائشی سرٹیفکیٹ) لازمی ہے',
      'منزل کے ملک سے سپانسر آئی ڈی کارڈ ضروری ہے',
      'سپانسر کی دستاویزات میں کفالت کی صلاحیت ہونی چاہیے',
    ],
  },
  work_professional: {
    required: ['passport', 'visa', 'airline_ticket', 'employment_contract', 'educational_certificate'],
    optional: ['beoe_registration', 'gamca_certificate', 'police_clearance', 'skill_certificate'],
    notes: [
      'Educational degree/diploma required for professional positions',
      'BEOE registration required for Gulf countries',
      'GAMCA medical required for Gulf countries',
    ],
    notes_urdu: [
      'پروفیشنل عہدوں کے لیے تعلیمی ڈگری/ڈپلوما ضروری ہے',
      'خلیجی ممالک کے لیے بی ای او ای رجسٹریشن ضروری ہے',
      'خلیجی ممالک کے لیے گیمکا میڈیکل ضروری ہے',
    ],
  },
  work_skilled: {
    required: ['passport', 'visa', 'airline_ticket', 'employment_contract'],
    optional: ['beoe_registration', 'gamca_certificate', 'driving_license', 'skill_certificate', 'police_clearance'],
    notes: [
      'Driving license required for driver positions',
      'Skill certificate recommended for technical jobs',
      'BEOE registration required for Gulf countries',
      'GAMCA medical required for Gulf countries',
    ],
    notes_urdu: [
      'ڈرائیور کی پوزیشن کے لیے ڈرائیونگ لائسنس ضروری ہے',
      'تکنیکی ملازمتوں کے لیے ہنر کا سرٹیفکیٹ تجویز کردہ',
      'خلیجی ممالک کے لیے بی ای او ای رجسٹریشن ضروری',
      'خلیجی ممالک کے لیے گیمکا میڈیکل ضروری',
    ],
  },
  student: {
    required: ['passport', 'visa', 'airline_ticket', 'admission_letter', 'educational_certificate', 'bank_statement'],
    optional: ['travel_insurance', 'police_clearance'],
    notes: [
      'University admission letter is mandatory',
      'Bank statement showing financial support required',
      'Previous educational certificates required',
    ],
    notes_urdu: [
      'یونیورسٹی کا داخلہ خط لازمی ہے',
      'بینک اسٹیٹمنٹ میں مالی معاونت دکھانی ضروری',
      'پچھلے تعلیمی سرٹیفکیٹ ضروری ہیں',
    ],
  },
  business: {
    required: ['passport', 'visa', 'airline_ticket', 'invitation_letter', 'company_registration', 'bank_statement'],
    optional: ['hotel_booking', 'travel_insurance'],
    notes: [
      'Business invitation letter from host company required',
      'Company registration documents needed',
      'Bank statement showing business funds',
    ],
    notes_urdu: [
      'میزبان کمپنی سے بزنس دعوت نامہ ضروری ہے',
      'کمپنی رجسٹریشن کی دستاویزات درکار ہیں',
      'بزنس فنڈز دکھانے والی بینک اسٹیٹمنٹ',
    ],
  },
  transit: {
    required: ['passport', 'visa', 'airline_ticket'],
    optional: ['travel_insurance'],
    notes: [
      'Onward journey ticket required',
      'Transit visa for layover countries',
    ],
    notes_urdu: [
      'آگے کے سفر کا ٹکٹ ضروری ہے',
      'لے اوور والے ممالک کے لیے ٹرانزٹ ویزا',
    ],
  },
};

export interface ExtractedText {
  raw_text: string;
  confidence: number;
  fields: Record<string, string>;
  ocr_engine: 'tesseract' | 'easyocr' | 'google_vision' | 'claude_vision';
  detected_type?: string;
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
  visa_type?: VisaType;
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

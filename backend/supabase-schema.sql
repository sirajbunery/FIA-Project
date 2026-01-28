-- ============================================
-- BEOE Document Validator - Supabase Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- Go to: https://app.supabase.com > Your Project > SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- ============================================
-- Validation Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS validation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  destination_country TEXT NOT NULL,
  travel_date DATE,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'incomplete', 'issues')),
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_user ON validation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON validation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON validation_sessions(created_at);

-- ============================================
-- Documents Table
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES validation_sessions(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  extracted_text JSONB,
  validation_result JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_documents_session ON documents(session_id);

-- ============================================
-- Country Requirements Table
-- ============================================
CREATE TABLE IF NOT EXISTS country_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  requirements JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for country lookups
CREATE INDEX IF NOT EXISTS idx_requirements_country ON country_requirements(country_code);

-- ============================================
-- Insert Default Country Requirements
-- ============================================
INSERT INTO country_requirements (country_code, country_name, requirements) VALUES
('SA', 'Saudi Arabia', '{
  "visa_required": true,
  "beoe_registration": true,
  "medical_required": true,
  "medical_type": "GAMCA",
  "police_clearance": true,
  "travel_insurance": false,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Employment contract", "Sponsor letter", "Mofa attestation"],
  "special_notes": ["GAMCA medical is mandatory for work visa", "BEOE registration required for work travel"]
}'::jsonb),
('AE', 'United Arab Emirates', '{
  "visa_required": true,
  "beoe_registration": true,
  "medical_required": true,
  "medical_type": "GAMCA",
  "police_clearance": false,
  "travel_insurance": false,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Employment contract", "Emirates ID for residents"],
  "special_notes": ["GAMCA medical required for work visa"]
}'::jsonb),
('QA', 'Qatar', '{
  "visa_required": true,
  "beoe_registration": true,
  "medical_required": true,
  "medical_type": "GAMCA",
  "police_clearance": false,
  "travel_insurance": false,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Employment contract", "QID for residents"],
  "special_notes": ["GAMCA medical mandatory for work visa"]
}'::jsonb),
('OM', 'Oman', '{
  "visa_required": true,
  "beoe_registration": true,
  "medical_required": true,
  "medical_type": "GAMCA",
  "police_clearance": true,
  "travel_insurance": false,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Employment contract", "Police clearance"],
  "special_notes": ["Police clearance mandatory"]
}'::jsonb),
('KW', 'Kuwait', '{
  "visa_required": true,
  "beoe_registration": true,
  "medical_required": true,
  "medical_type": "GAMCA",
  "police_clearance": true,
  "travel_insurance": false,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Employment contract", "Educational certificates"],
  "special_notes": ["GAMCA medical mandatory"]
}'::jsonb),
('BH', 'Bahrain', '{
  "visa_required": true,
  "beoe_registration": true,
  "medical_required": true,
  "medical_type": "GAMCA",
  "police_clearance": false,
  "travel_insurance": false,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Employment contract"],
  "special_notes": ["GAMCA medical required for work visa"]
}'::jsonb),
('MY', 'Malaysia', '{
  "visa_required": false,
  "beoe_registration": false,
  "medical_required": false,
  "medical_type": null,
  "police_clearance": false,
  "travel_insurance": true,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Return ticket", "Hotel booking", "Proof of funds"],
  "special_notes": ["Visa not required for tourism up to 30 days"]
}'::jsonb),
('GB', 'United Kingdom', '{
  "visa_required": true,
  "beoe_registration": false,
  "medical_required": false,
  "medical_type": null,
  "police_clearance": true,
  "travel_insurance": true,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Bank statements", "Employment letter", "Property documents"],
  "special_notes": ["Apply through VFS Global", "Biometrics required"]
}'::jsonb),
('US', 'United States', '{
  "visa_required": true,
  "beoe_registration": false,
  "medical_required": false,
  "medical_type": null,
  "police_clearance": true,
  "travel_insurance": true,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["DS-160 confirmation", "Bank statements", "Employment letter"],
  "special_notes": ["Interview required at US Embassy", "Long wait times for appointments"]
}'::jsonb),
('CA', 'Canada', '{
  "visa_required": true,
  "beoe_registration": false,
  "medical_required": true,
  "medical_type": "Panel Physician",
  "police_clearance": true,
  "travel_insurance": true,
  "minimum_passport_validity_months": 6,
  "additional_documents": ["Bank statements", "Employment letter", "Travel history"],
  "special_notes": ["Apply online through IRCC", "Biometrics required"]
}'::jsonb)
ON CONFLICT (country_code) DO NOTHING;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_requirements ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for backend)
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to sessions" ON validation_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to documents" ON documents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read country requirements" ON country_requirements
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify country requirements" ON country_requirements
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- Functions
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON validation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Storage Bucket (for document images)
-- ============================================
-- Run this in Supabase Storage settings or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policy for documents bucket
-- CREATE POLICY "Service role can access documents" ON storage.objects
--   FOR ALL USING (bucket_id = 'documents' AND auth.role() = 'service_role');

-- ============================================
-- Add visa_type to validation_sessions (if not exists)
-- Run this to update existing tables
-- ============================================
ALTER TABLE validation_sessions
ADD COLUMN IF NOT EXISTS visa_type TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_visa_type ON validation_sessions(visa_type);

-- ============================================
-- Interview Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visa_type TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  total_questions INTEGER NOT NULL DEFAULT 10,
  questions_asked JSONB DEFAULT '[]'::jsonb,
  overall_score INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  feedback TEXT,
  improvements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for interview sessions
CREATE INDEX IF NOT EXISTS idx_interview_sessions_visa_type ON interview_sessions(visa_type);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_passed ON interview_sessions(passed);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created ON interview_sessions(created_at);

-- RLS for interview sessions
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to interview_sessions" ON interview_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read interview_sessions" ON interview_sessions
  FOR SELECT USING (true);

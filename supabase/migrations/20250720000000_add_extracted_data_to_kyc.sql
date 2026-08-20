-- Add extracted_data JSONB column to kyc_documents for storing Dojah verification results
ALTER TABLE kyc_documents ADD COLUMN IF NOT EXISTS extracted_data JSONB;

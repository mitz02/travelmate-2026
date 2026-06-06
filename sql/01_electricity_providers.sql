CREATE TABLE IF NOT EXISTS electricity_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the providers
INSERT INTO electricity_providers (service_id, name) VALUES
('ikeja-electric', 'Ikeja Electric (IKEDC)'),
('eko-electric', 'Eko Electric (EKEDC)'),
('kano-electric', 'Kano Electric (KEDCO)'),
('portharcourt-electric', 'Port Harcourt Electric (PHED)'),
('jos-electric', 'Jos Electric (JED)'),
('ibadan-electric', 'Ibadan Electric (IBEDC)'),
('kaduna-electric', 'Kaduna Electric (KAEDCO)'),
('abuja-electric', 'Abuja Electric (AEDC)'),
('enugu-electric', 'Enugu Electric (EEDC)'),
('benin-electric', 'Benin Electric (BEDC)'),
('aba-electric', 'Aba Electric (ABA)')
ON CONFLICT (service_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS electricity_meter_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the meter types
INSERT INTO electricity_meter_types (type_id, name) VALUES
('prepaid', 'Prepaid'),
('postpaid', 'Postpaid')
ON CONFLICT (type_id) DO NOTHING;

-- Grant permissions (if needed)
-- GRANT ALL ON electricity_providers TO anon, authenticated;

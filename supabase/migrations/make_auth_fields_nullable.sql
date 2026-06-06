-- Make password_hash and phone nullable to support Google OAuth users
ALTER TABLE profiles ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;

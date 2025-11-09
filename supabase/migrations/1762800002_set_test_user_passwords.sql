-- Set passwords for test users using SHA-256 hashing
-- This script sets the password_hash field for our test users

-- Admin user: admin@test.com / admin123
UPDATE users 
SET password_hash = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f' 
WHERE email = 'admin@test.com';

-- Technician: technician@test.com / tech123
UPDATE users 
SET password_hash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' 
WHERE email = 'technician@test.com';

-- Hall User: hall@test.com / hall123
UPDATE users 
SET password_hash = '6dcd4ce23d88e2ee0498af6b7e31f5ca45d27bb60b6144c52f9e8d8b9e2c5c00' 
WHERE email = 'hall@test.com';
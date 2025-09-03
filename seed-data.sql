-- Insert test users
INSERT INTO "User" (name, email, password, role, "inQueue", "updatedAt") VALUES 
('Test User 1', 'user1@test.com', '$2b$10$temp', 'PLAYER', false, NOW()),
('Test User 2', 'user2@test.com', '$2b$10$temp', 'PLAYER', false, NOW()),
('Test User 3', 'user3@test.com', '$2b$10$temp', 'PLAYER', false, NOW()),
('Test User 4', 'user4@test.com', '$2b$10$temp', 'PLAYER', false, NOW()),
('Test User 5', 'user5@test.com', '$2b$10$temp', 'PLAYER', false, NOW()),
('Admin User', 'admin@test.com', '$2b$10$temp', 'ADMIN', false, NOW()),
('Seller User', 'seller@test.com', '$2b$10$temp', 'SELLER', false, NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert test simulators
INSERT INTO "Simulator" (name, active) VALUES 
('Racing Simulator', true),
('Flight Simulator', true),
('VR Experience', true)
ON CONFLICT DO NOTHING;

-- Insert time patterns
INSERT INTO "TimePattern" (name, "timeMinutes", price, active, "updatedAt") VALUES 
('Quick Session', 5, 15.00, true, NOW()),
('Standard Session', 10, 25.00, true, NOW()),
('Extended Session', 15, 35.00, true, NOW()),
('Premium Session', 30, 60.00, true, NOW())
ON CONFLICT DO NOTHING;
-- Seed data for simqueue database
-- Run these SQL commands to populate your database with initial test data

-- Insert test players
INSERT INTO "User" (name, email, password, role, "inQueue", "createdAt", "updatedAt") VALUES 
('Test User 1', 'user1@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 2', 'user2@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 3', 'user3@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 4', 'user4@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 5', 'user5@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 6', 'user6@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 7', 'user7@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 8', 'user8@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 9', 'user9@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 10', 'user10@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 11', 'user11@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 12', 'user12@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 13', 'user13@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 14', 'user14@test.com', 'temp', 'PLAYER', false, NOW(), NOW()),
('Test User 15', 'user15@test.com', 'temp', 'PLAYER', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert test simulators
INSERT INTO "Simulator" (name, active) VALUES 
('Simulator 1', true),
('Simulator 2', true),
('Simulator 3', true),
('Simulator 4', true),
('Simulator 5', true)
ON CONFLICT DO NOTHING;

-- Queue entries removed to avoid test conflicts
-- Tests will create their own queue data as needed
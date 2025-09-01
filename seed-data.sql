-- Seed data for simqueue database
-- Run these SQL commands to populate your database with initial test data

-- Insert test players
INSERT INTO "Player" (name, "inQueue", "createdAt") VALUES 
('Test User 1', false, NOW()),
('Test User 2', false, NOW()),
('Test User 3', false, NOW()),
('Test User 4', false, NOW()),
('Test User 5', false, NOW()),
('Test User 6', false, NOW()),
('Test User 7', false, NOW()),
('Test User 8', false, NOW()),
('Test User 9', false, NOW()),
('Test User 10', false, NOW()),
('Test User 11', false, NOW()),
('Test User 12', false, NOW()),
('Test User 13', false, NOW()),
('Test User 14', false, NOW()),
('Test User 15', false, NOW());

-- Insert test simulators
INSERT INTO "Simulator" (name, active) VALUES 
('Simulator 1', true),
('Simulator 2', true),
('Simulator 3', true),
('Simulator 4', true),
('Simulator 5', true);

-- Insert queue entries for testing
INSERT INTO "Queue" ("PlayerId", "SimulatorId", position, status, "updatedAt") VALUES 
(1, 1, 1, 'WAITING', NOW()),
(2, 1, 2, 'WAITING', NOW()),
(3, 1, 3, 'WAITING', NOW()),
(4, 2, 1, 'WAITING', NOW()),
(5, 2, 2, 'WAITING', NOW()),
(6, 2, 3, 'WAITING', NOW()),
(7, 3, 1, 'WAITING', NOW()),
(8, 3, 2, 'WAITING', NOW()),
(9, 3, 3, 'WAITING', NOW()),
(10, 4, 1, 'WAITING', NOW()),
(11, 4, 2, 'WAITING', NOW()),
(12, 4, 3, 'WAITING', NOW()),
(13, 5, 1, 'WAITING', NOW()),
(14, 5, 2, 'WAITING', NOW()),
(15, 5, 3, 'WAITING', NOW());
-- Seed data for simqueue database
-- Run these SQL commands to populate your database with initial test data

-- Insert test players
INSERT INTO "Player" (name, "inQueue", "createdAt") VALUES 
('Alice Johnson', false, NOW()),
('Bob Smith', false, NOW()),
('Carlos Rodriguez', false, NOW()),
('Diana Wilson', false, NOW()),
('Emma Davis', false, NOW());

-- Insert test simulators
INSERT INTO "Simulator" (name, active) VALUES 
('Flight Simulator Alpha', true),
('Racing Simulator Beta', true),
('Space Simulator Gamma', true),
('Combat Simulator Delta', true),
('Sports Simulator Epsilon', true);

-- Optional: Insert some initial queue entries for testing
-- These will be automatically created when you add players via the API
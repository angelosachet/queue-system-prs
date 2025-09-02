-- Padrões iniciais de tempo e custo
INSERT INTO "TimePattern" (name, "timeMinutes", price, active, "createdAt", "updatedAt") VALUES 
('5 minutos', 5, 10.00, true, NOW(), NOW()),
('10 minutos', 10, 18.00, true, NOW(), NOW()),
('15 minutos', 15, 25.00, true, NOW(), NOW()),
('30 minutos', 30, 45.00, true, NOW(), NOW()),
('1 hora', 60, 80.00, true, NOW(), NOW())
ON CONFLICT DO NOTHING;
INSERT INTO form_categories (name, slug, sort_order) VALUES
('People & HR', 'people-hr', 0),
('Store Operations', 'store-operations', 1),
('Sales & Training', 'sales-training', 2),
('Marketing & Events', 'marketing-events', 3),
('Customer & Web', 'customer-web', 4),
('Onboarding Forms', 'onboarding-forms', 5),
('Products', 'products', 6),
('Surveys & Feedback', 'surveys-feedback', 7),
('Staff Benefits & Services', 'staff-benefits-services', 8)
ON CONFLICT (name) DO NOTHING;
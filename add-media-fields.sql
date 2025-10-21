-- Ajouter des champs média pour chaque section de la landing page

-- Hero Section - Images et vidéos
INSERT INTO landing_content (section, field, content) VALUES
('hero', 'background_image', ''),
('hero', 'hero_video', ''),
('hero', 'logo_image', '');

-- Features Section - Icônes et images
INSERT INTO landing_content (section, field, content) VALUES
('features', 'feature_1_image', ''),
('features', 'feature_2_image', ''),
('features', 'feature_3_image', ''),
('features', 'feature_4_image', ''),
('features', 'feature_5_image', ''),
('features', 'feature_6_image', ''),
('features', 'section_background', '');

-- Pricing Section - Images
INSERT INTO landing_content (section, field, content) VALUES
('pricing', 'section_background', ''),
('pricing', 'plan_1_image', ''),
('pricing', 'plan_2_image', ''),
('pricing', 'plan_3_image', '');

-- About Section - Images et vidéos
INSERT INTO landing_content (section, field, content) VALUES
('about', 'section_background', ''),
('about', 'about_image', ''),
('about', 'about_video', ''),
('about', 'team_image', '');

-- Contact Section - Images
INSERT INTO landing_content (section, field, content) VALUES
('contact', 'section_background', ''),
('contact', 'contact_image', '');

-- Footer Section - Images
INSERT INTO landing_content (section, field, content) VALUES
('footer', 'logo_image', ''),
('footer', 'background_image', '');

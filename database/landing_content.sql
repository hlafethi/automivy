-- Table pour stocker le contenu de la landing page
CREATE TABLE IF NOT EXISTS landing_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section VARCHAR(50) NOT NULL, -- 'hero', 'features', 'pricing', 'about', 'contact'
    field VARCHAR(100) NOT NULL, -- 'title', 'subtitle', 'description', 'button_text', etc.
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_landing_content_section ON landing_content(section);
CREATE INDEX IF NOT EXISTS idx_landing_content_field ON landing_content(field);

-- Contenu par défaut pour la landing page
INSERT INTO landing_content (section, field, content) VALUES
-- Hero Section
('hero', 'title', 'AUTOMIVY'),
('hero', 'subtitle', 'Intelligent Automation Platform'),
('hero', 'description', 'Transform your business with powerful automation workflows. Deploy, manage, and scale your processes with our cutting-edge n8n integration.'),
('hero', 'primary_button', 'Get Started'),
('hero', 'secondary_button', 'Learn More'),
('hero', 'background_image', 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'),

-- Features Section
('features', 'title', 'Powerful Features'),
('features', 'subtitle', 'Everything you need to automate your business'),
('features', 'description', 'Our platform provides all the tools you need to create, deploy, and manage sophisticated automation workflows.'),

-- Feature 1
('features', 'feature_1_title', 'Smart Deploy'),
('features', 'feature_1_description', 'Deploy complex workflows with a single click using our intelligent deployment system.'),
('features', 'feature_1_icon', '🚀'),

-- Feature 2
('features', 'feature_2_title', 'Template Library'),
('features', 'feature_2_description', 'Access hundreds of pre-built templates for common business processes.'),
('features', 'feature_2_icon', '📚'),

-- Feature 3
('features', 'feature_3_title', 'Real-time Monitoring'),
('features', 'feature_3_description', 'Monitor your workflows in real-time with detailed analytics and reporting.'),
('features', 'feature_3_icon', '📊'),

-- Feature 4
('features', 'feature_4_title', 'Team Collaboration'),
('features', 'feature_4_description', 'Collaborate with your team on workflow development and management.'),
('features', 'feature_4_icon', '👥'),

-- Feature 5
('features', 'feature_5_title', 'API Integration'),
('features', 'feature_5_description', 'Connect with hundreds of services through our extensive API library.'),
('features', 'feature_5_icon', '🔗'),

-- Feature 6
('features', 'feature_6_title', 'Security & Compliance'),
('features', 'feature_6_description', 'Enterprise-grade security with compliance features for sensitive data.'),
('features', 'feature_6_icon', '🔒'),

-- Pricing Section
('pricing', 'title', 'Simple Pricing'),
('pricing', 'subtitle', 'Choose the plan that fits your needs'),
('pricing', 'description', 'Start free and scale as you grow. No hidden fees, no surprises.'),

-- Plan 1
('pricing', 'plan_1_name', 'Starter'),
('pricing', 'plan_1_price', 'Free'),
('pricing', 'plan_1_period', 'forever'),
('pricing', 'plan_1_description', 'Perfect for individuals and small teams'),
('pricing', 'plan_1_feature_1', 'Up to 5 workflows'),
('pricing', 'plan_1_feature_2', 'Basic templates'),
('pricing', 'plan_1_feature_3', 'Email support'),
('pricing', 'plan_1_feature_4', 'Community access'),

-- Plan 2
('pricing', 'plan_2_name', 'Professional'),
('pricing', 'plan_2_price', '$29'),
('pricing', 'plan_2_period', 'per month'),
('pricing', 'plan_2_description', 'Ideal for growing businesses'),
('pricing', 'plan_2_feature_1', 'Unlimited workflows'),
('pricing', 'plan_2_feature_2', 'Premium templates'),
('pricing', 'plan_2_feature_3', 'Priority support'),
('pricing', 'plan_2_feature_4', 'Advanced analytics'),
('pricing', 'plan_2_feature_5', 'Team collaboration'),
('pricing', 'plan_2_feature_6', 'API access'),

-- Plan 3
('pricing', 'plan_3_name', 'Enterprise'),
('pricing', 'plan_3_price', '$99'),
('pricing', 'plan_3_period', 'per month'),
('pricing', 'plan_3_description', 'For large organizations'),
('pricing', 'plan_3_feature_1', 'Everything in Professional'),
('pricing', 'plan_3_feature_2', 'Custom integrations'),
('pricing', 'plan_3_feature_3', 'Dedicated support'),
('pricing', 'plan_3_feature_4', 'SLA guarantee'),
('pricing', 'plan_3_feature_5', 'On-premise deployment'),
('pricing', 'plan_3_feature_6', 'Custom training'),

-- About Section
('about', 'title', 'About AUTOMIVY'),
('about', 'subtitle', 'Empowering businesses through automation'),
('about', 'description', 'We believe that automation should be accessible to everyone. Our platform makes it easy for businesses of all sizes to implement powerful automation workflows without the complexity.'),
('about', 'mission', 'Our mission is to democratize automation and help businesses focus on what matters most.'),
('about', 'vision', 'We envision a world where every business can leverage the power of automation to achieve their goals.'),

-- Contact Section
('contact', 'title', 'Get in Touch'),
('contact', 'subtitle', 'Ready to transform your business?'),
('contact', 'description', 'Contact us today to learn more about how AUTOMIVY can help your business grow.'),
('contact', 'email', 'contact@automivy.com'),
('contact', 'phone', '+1 (555) 123-4567'),
('contact', 'address', '123 Automation Street, Tech City, TC 12345'),

-- Footer
('footer', 'company_name', 'AUTOMIVY'),
('footer', 'tagline', 'Intelligent Automation Platform'),
('footer', 'description', 'Transform your business with powerful automation workflows.'),
('footer', 'copyright', '© 2024 AUTOMIVY. All rights reserved.'),
('footer', 'privacy_link', '/privacy'),
('footer', 'terms_link', '/terms'),
('footer', 'support_link', '/support');

-- Correction du système de tickets
-- Suppression et recréation des tables avec la bonne structure

-- Supprimer les tables existantes dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS ticket_notifications CASCADE;
DROP TABLE IF EXISTS ticket_attachments CASCADE;
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;

-- Recréer la table tickets avec la bonne structure
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(100) DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature_request', 'bug_report')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des commentaires de tickets
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des pièces jointes de tickets
CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des notifications de tickets
CREATE TABLE ticket_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES ticket_comments(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_notifications_user_id ON ticket_notifications(user_id);
CREATE INDEX idx_ticket_notifications_is_read ON ticket_notifications(is_read);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Désactiver RLS temporairement pour les tests
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notifications DISABLE ROW LEVEL SECURITY;

-- RLS Policies simplifiées (sans app.current_user_id)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs : voir leurs propres tickets
CREATE POLICY "Users can view their own tickets" ON tickets
FOR SELECT USING (user_id = auth.uid() OR assigned_to = auth.uid());

-- Politique pour les admins : voir tous les tickets
CREATE POLICY "Admins can view all tickets" ON tickets
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- Politique pour créer des tickets
CREATE POLICY "Users can create tickets" ON tickets
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Politique pour mettre à jour les tickets
CREATE POLICY "Users can update their own tickets" ON tickets
FOR UPDATE USING (user_id = auth.uid() OR assigned_to = auth.uid());

-- Politique pour les admins : gérer tous les tickets
CREATE POLICY "Admins can manage all tickets" ON tickets
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- RLS pour les commentaires
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their tickets" ON ticket_comments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM tickets 
        WHERE tickets.id = ticket_comments.ticket_id 
        AND (tickets.user_id = auth.uid() OR tickets.assigned_to = auth.uid())
    )
);

CREATE POLICY "Users can add comments to their tickets" ON ticket_comments
FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (
        SELECT 1 FROM tickets 
        WHERE tickets.id = ticket_comments.ticket_id 
        AND (tickets.user_id = auth.uid() OR tickets.assigned_to = auth.uid())
    )
);

CREATE POLICY "Admins can manage all comments" ON ticket_comments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- RLS pour les pièces jointes
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments on their tickets" ON ticket_attachments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM tickets 
        WHERE tickets.id = ticket_attachments.ticket_id 
        AND (tickets.user_id = auth.uid() OR tickets.assigned_to = auth.uid())
    )
);

CREATE POLICY "Users can add attachments to their tickets" ON ticket_attachments
FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (
        SELECT 1 FROM tickets 
        WHERE tickets.id = ticket_attachments.ticket_id 
        AND (tickets.user_id = auth.uid() OR tickets.assigned_to = auth.uid())
    )
);

CREATE POLICY "Admins can manage all attachments" ON ticket_attachments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- RLS pour les notifications
ALTER TABLE ticket_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON ticket_notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications" ON ticket_notifications
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- Trigger pour créer une notification lors de la création d'un ticket
CREATE OR REPLACE FUNCTION create_ticket_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ticket_notifications (user_id, ticket_id, message)
    VALUES (NEW.user_id, NEW.id, 'Votre ticket "' || NEW.title || '" a été créé.');
    
    -- Si le ticket est assigné, notifier l'assigné
    IF NEW.assigned_to IS NOT NULL THEN
        INSERT INTO ticket_notifications (user_id, ticket_id, message)
        VALUES (NEW.assigned_to, NEW.id, 'Un nouveau ticket "' || NEW.title || '" vous a été assigné.');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER after_ticket_insert
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION create_ticket_notification();

-- Trigger pour créer une notification lors de la mise à jour d'un ticket
CREATE OR REPLACE FUNCTION update_ticket_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO ticket_notifications (user_id, ticket_id, message)
        VALUES (NEW.user_id, NEW.id, 'Le statut de votre ticket "' || NEW.title || '" est passé à ' || NEW.status || '.');
        IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.user_id THEN
            INSERT INTO ticket_notifications (user_id, ticket_id, message)
            VALUES (NEW.assigned_to, NEW.id, 'Le statut du ticket "' || NEW.title || '" que vous gérez est passé à ' || NEW.status || '.');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER after_ticket_update
AFTER UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_ticket_notification();

-- Trigger pour créer une notification lors de l'ajout d'un commentaire
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    ticket_owner UUID;
    ticket_assignee UUID;
    ticket_title VARCHAR(255);
BEGIN
    SELECT user_id, assigned_to, title INTO ticket_owner, ticket_assignee, ticket_title FROM tickets WHERE id = NEW.ticket_id;

    -- Notifier le propriétaire du ticket si ce n'est pas lui qui commente
    IF NEW.user_id IS DISTINCT FROM ticket_owner THEN
        INSERT INTO ticket_notifications (user_id, ticket_id, comment_id, message)
        VALUES (ticket_owner, NEW.ticket_id, NEW.id, 'Un nouveau commentaire a été ajouté à votre ticket "' || ticket_title || '".');
    END IF;

    -- Notifier l'assigné du ticket si ce n'est pas lui qui commente et qu'il est différent du propriétaire
    IF ticket_assignee IS NOT NULL AND NEW.user_id IS DISTINCT FROM ticket_assignee AND ticket_assignee IS DISTINCT FROM ticket_owner THEN
        INSERT INTO ticket_notifications (user_id, ticket_id, comment_id, message)
        VALUES (ticket_assignee, NEW.ticket_id, NEW.id, 'Un nouveau commentaire a été ajouté au ticket "' || ticket_title || '" que vous gérez.');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER after_comment_insert
AFTER INSERT ON ticket_comments
FOR EACH ROW
EXECUTE FUNCTION create_comment_notification();

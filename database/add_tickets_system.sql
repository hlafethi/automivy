-- Migration pour ajouter le système de tickets
-- Création de la table tickets et des tables associées

-- Table principale des tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature_request', 'bug_report')),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

-- Table des commentaires sur les tickets
CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table des fichiers joints aux tickets
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  filename text NOT NULL,
  original_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at timestamptz DEFAULT now()
);

-- Table des notifications de tickets
CREATE TABLE IF NOT EXISTS ticket_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('created', 'updated', 'assigned', 'commented', 'resolved', 'closed')),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON ticket_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notifications_user_id ON ticket_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notifications_ticket_id ON ticket_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_notifications_is_read ON ticket_notifications(is_read);

-- Activer RLS sur toutes les tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notifications ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour tickets
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (created_by = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Assigned users can view tickets"
  ON tickets FOR SELECT
  USING (assigned_to = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Admins can view all tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = current_setting('app.current_user_id', true)::uuid
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (created_by = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update own tickets"
  ON tickets FOR UPDATE
  USING (created_by = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (created_by = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Admins can update all tickets"
  ON tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = current_setting('app.current_user_id', true)::uuid
      AND users.role = 'admin'
    )
  );

-- Politiques RLS pour ticket_comments
CREATE POLICY "Users can view ticket comments"
  ON ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (
        tickets.created_by = current_setting('app.current_user_id', true)::uuid
        OR tickets.assigned_to = current_setting('app.current_user_id', true)::uuid
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = current_setting('app.current_user_id', true)::uuid
          AND users.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can create ticket comments"
  ON ticket_comments FOR INSERT
  WITH CHECK (
    author_id = current_setting('app.current_user_id', true)::uuid
    AND EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (
        tickets.created_by = current_setting('app.current_user_id', true)::uuid
        OR tickets.assigned_to = current_setting('app.current_user_id', true)::uuid
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = current_setting('app.current_user_id', true)::uuid
          AND users.role = 'admin'
        )
      )
    )
  );

-- Politiques RLS pour ticket_attachments
CREATE POLICY "Users can view ticket attachments"
  ON ticket_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_attachments.ticket_id
      AND (
        tickets.created_by = current_setting('app.current_user_id', true)::uuid
        OR tickets.assigned_to = current_setting('app.current_user_id', true)::uuid
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = current_setting('app.current_user_id', true)::uuid
          AND users.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can create ticket attachments"
  ON ticket_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = current_setting('app.current_user_id', true)::uuid
    AND EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_attachments.ticket_id
      AND (
        tickets.created_by = current_setting('app.current_user_id', true)::uuid
        OR tickets.assigned_to = current_setting('app.current_user_id', true)::uuid
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = current_setting('app.current_user_id', true)::uuid
          AND users.role = 'admin'
        )
      )
    )
  );

-- Politiques RLS pour ticket_notifications
CREATE POLICY "Users can view own notifications"
  ON ticket_notifications FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update own notifications"
  ON ticket_notifications FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Triggers pour mettre à jour updated_at
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer une notification de ticket
CREATE OR REPLACE FUNCTION create_ticket_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Notification pour le créateur du ticket
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ticket_notifications (ticket_id, user_id, type, message)
    VALUES (NEW.id, NEW.created_by, 'created', 'Votre ticket "' || NEW.title || '" a été créé');
  END IF;

  -- Notification pour l'assigné si différent du créateur
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
    INSERT INTO ticket_notifications (ticket_id, user_id, type, message)
    VALUES (NEW.id, NEW.assigned_to, 'assigned', 'Le ticket "' || NEW.title || '" vous a été assigné');
  END IF;

  -- Notification pour le créateur si le statut change
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO ticket_notifications (ticket_id, user_id, type, message)
    VALUES (NEW.id, NEW.created_by, 'updated', 'Le statut de votre ticket "' || NEW.title || '" a changé vers "' || NEW.status || '"');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour les notifications automatiques
CREATE TRIGGER ticket_notifications_trigger
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION create_ticket_notification();

-- Fonction pour créer une notification de commentaire
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  ticket_creator uuid;
  ticket_assignee uuid;
BEGIN
  -- Récupérer le créateur et l'assigné du ticket
  SELECT created_by, assigned_to INTO ticket_creator, ticket_assignee
  FROM tickets WHERE id = NEW.ticket_id;

  -- Notification pour le créateur (si différent de l'auteur du commentaire)
  IF ticket_creator != NEW.author_id THEN
    INSERT INTO ticket_notifications (ticket_id, user_id, type, message)
    VALUES (NEW.ticket_id, ticket_creator, 'commented', 'Nouveau commentaire sur votre ticket');
  END IF;

  -- Notification pour l'assigné (si différent de l'auteur du commentaire et du créateur)
  IF ticket_assignee IS NOT NULL AND ticket_assignee != NEW.author_id AND ticket_assignee != ticket_creator THEN
    INSERT INTO ticket_notifications (ticket_id, user_id, type, message)
    VALUES (NEW.ticket_id, ticket_assignee, 'commented', 'Nouveau commentaire sur le ticket assigné');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour les notifications de commentaires
CREATE TRIGGER comment_notifications_trigger
  AFTER INSERT ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

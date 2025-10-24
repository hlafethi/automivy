-- Création du système de communauté

-- Table des catégories de discussions
CREATE TABLE IF NOT EXISTS discussion_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des discussions
CREATE TABLE IF NOT EXISTS discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES discussion_categories(id),
    author_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED', 'LOCKED')) DEFAULT 'ACTIVE',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    views_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    replies_count INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réponses aux discussions
CREATE TABLE IF NOT EXISTS discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    parent_reply_id UUID REFERENCES discussion_replies(id),
    is_solution BOOLEAN NOT NULL DEFAULT false,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des likes sur les discussions
CREATE TABLE IF NOT EXISTS discussion_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discussion_id, user_id)
);

-- Table des likes sur les réponses
CREATE TABLE IF NOT EXISTS reply_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID NOT NULL REFERENCES discussion_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reply_id, user_id)
);

-- Table des tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6B7280',
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison discussions-tags
CREATE TABLE IF NOT EXISTS discussion_tags (
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (discussion_id, tag_id)
);

-- Table des événements communautaires
CREATE TABLE IF NOT EXISTS community_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('MEETUP', 'WEBINAR', 'WORKSHOP', 'CONTEST', 'ANNOUNCEMENT')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    is_virtual BOOLEAN NOT NULL DEFAULT false,
    max_participants INTEGER,
    current_participants INTEGER NOT NULL DEFAULT 0,
    organizer_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED')) DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des participants aux événements
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('REGISTERED', 'ATTENDED', 'CANCELLED')) DEFAULT 'REGISTERED',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Table des badges utilisateur
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#F59E0B',
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison utilisateurs-badges
CREATE TABLE IF NOT EXISTS user_badge_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES user_badges(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    UNIQUE(user_id, badge_id)
);

-- Table des annonces communautaires
CREATE TABLE IF NOT EXISTS community_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_discussions_category ON discussions(category_id);
CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_status ON discussions(status);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_pinned ON discussions(is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_replies_author ON discussion_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON discussion_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON discussion_replies(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_discussion_likes_discussion ON discussion_likes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_likes_user ON discussion_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_reply_likes_reply ON reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_user ON reply_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON community_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON community_events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON community_events(status);

CREATE INDEX IF NOT EXISTS idx_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON event_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_announcements_author ON community_announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON community_announcements(is_published, published_at DESC);

-- Fonction pour mettre à jour les compteurs de discussions
CREATE OR REPLACE FUNCTION update_discussion_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Incrémenter le compteur de réponses
        UPDATE discussions 
        SET replies_count = replies_count + 1,
            last_activity_at = NOW()
        WHERE id = NEW.discussion_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Décrémenter le compteur de réponses
        UPDATE discussions 
        SET replies_count = GREATEST(replies_count - 1, 0)
        WHERE id = OLD.discussion_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour les compteurs de réponses
CREATE TRIGGER discussion_replies_counter
    AFTER INSERT OR DELETE ON discussion_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_discussion_counters();

-- Fonction pour mettre à jour les compteurs de likes
CREATE OR REPLACE FUNCTION update_like_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'discussion_likes' THEN
            UPDATE discussions 
            SET likes_count = likes_count + 1
            WHERE id = NEW.discussion_id;
        ELSIF TG_TABLE_NAME = 'reply_likes' THEN
            UPDATE discussion_replies 
            SET likes_count = likes_count + 1
            WHERE id = NEW.reply_id;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'discussion_likes' THEN
            UPDATE discussions 
            SET likes_count = GREATEST(likes_count - 1, 0)
            WHERE id = OLD.discussion_id;
        ELSIF TG_TABLE_NAME = 'reply_likes' THEN
            UPDATE discussion_replies 
            SET likes_count = GREATEST(likes_count - 1, 0)
            WHERE id = OLD.reply_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour les compteurs de likes
CREATE TRIGGER discussion_likes_counter
    AFTER INSERT OR DELETE ON discussion_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_counters();

CREATE TRIGGER reply_likes_counter
    AFTER INSERT OR DELETE ON reply_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_counters();

-- Fonction pour obtenir les statistiques de la communauté
CREATE OR REPLACE FUNCTION get_community_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_discussions', (
            SELECT COUNT(*) FROM discussions WHERE status = 'ACTIVE'
        ),
        'total_replies', (
            SELECT COUNT(*) FROM discussion_replies
        ),
        'total_users', (
            SELECT COUNT(*) FROM users WHERE is_active = true
        ),
        'active_discussions_today', (
            SELECT COUNT(*) FROM discussions 
            WHERE created_at >= CURRENT_DATE AND status = 'ACTIVE'
        ),
        'top_categories', (
            SELECT json_agg(json_build_object('name', dc.name, 'count', COUNT(d.id)))
            FROM discussion_categories dc
            LEFT JOIN discussions d ON dc.id = d.category_id AND d.status = 'ACTIVE'
            WHERE dc.is_active = true
            GROUP BY dc.id, dc.name
            ORDER BY COUNT(d.id) DESC
            LIMIT 5
        ),
        'recent_activity', (
            SELECT json_agg(json_build_object(
                'type', 'discussion',
                'title', d.title,
                'author', u.email,
                'created_at', d.created_at
            ))
            FROM discussions d
            JOIN users u ON d.author_id = u.id
            WHERE d.status = 'ACTIVE'
            ORDER BY d.created_at DESC
            LIMIT 10
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les anciennes données
CREATE OR REPLACE FUNCTION cleanup_old_community_data()
RETURNS VOID AS $$
BEGIN
    -- Supprimer les discussions archivées de plus de 1 an
    DELETE FROM discussions WHERE status = 'ARCHIVED' AND created_at < NOW() - INTERVAL '1 year';
    
    -- Supprimer les événements terminés de plus de 6 mois
    DELETE FROM community_events WHERE status = 'COMPLETED' AND end_date < NOW() - INTERVAL '6 months';
    
    -- Supprimer les annonces expirées
    DELETE FROM community_announcements WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USER PROFILE SYSTEM - EXTENDED SCHEMA
-- =====================================================
-- This script extends the existing user system with comprehensive profile management

-- 1. EXTEND USER_PROFILES TABLE
-- =====================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. USER PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    notifications_email BOOLEAN DEFAULT true,
    notifications_browser BOOLEAN DEFAULT true,
    notifications_community BOOLEAN DEFAULT true,
    notifications_workflows BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'daily' CHECK (email_frequency IN ('never', 'daily', 'weekly', 'monthly')),
    dashboard_layout JSONB DEFAULT '{}',
    privacy_level VARCHAR(20) DEFAULT 'public' CHECK (privacy_level IN ('private', 'friends', 'public')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. USER ACTIVITY LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USER STATISTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_workflows INTEGER DEFAULT 0,
    active_workflows INTEGER DEFAULT 0,
    total_automations INTEGER DEFAULT 0,
    successful_automations INTEGER DEFAULT 0,
    failed_automations INTEGER DEFAULT 0,
    community_posts INTEGER DEFAULT 0,
    community_likes INTEGER DEFAULT 0,
    community_events_attended INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 5. USER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- 6. USER ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_description TEXT,
    points INTEGER DEFAULT 0,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);

-- 8. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update updated_at in user_profiles
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Trigger to update updated_at in user_preferences
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Trigger to update updated_at in user_statistics
CREATE OR REPLACE FUNCTION update_user_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_statistics_updated_at ON user_statistics;
CREATE TRIGGER trigger_update_user_statistics_updated_at
    BEFORE UPDATE ON user_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_user_statistics_updated_at();

-- 9. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get user profile with statistics
CREATE OR REPLACE FUNCTION get_user_profile_with_stats(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    phone VARCHAR(20),
    company VARCHAR(100),
    job_title VARCHAR(100),
    location VARCHAR(100),
    website VARCHAR(255),
    timezone VARCHAR(50),
    language VARCHAR(10),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    total_workflows INTEGER,
    active_workflows INTEGER,
    total_automations INTEGER,
    successful_automations INTEGER,
    failed_automations INTEGER,
    community_posts INTEGER,
    community_likes INTEGER,
    community_events_attended INTEGER,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        up.role,
        up.first_name,
        up.last_name,
        up.avatar_url,
        up.bio,
        up.phone,
        up.company,
        up.job_title,
        up.location,
        up.website,
        up.timezone,
        up.language,
        up.created_at,
        up.updated_at,
        COALESCE(us.total_workflows, 0),
        COALESCE(us.active_workflows, 0),
        COALESCE(us.total_automations, 0),
        COALESCE(us.successful_automations, 0),
        COALESCE(us.failed_automations, 0),
        COALESCE(us.community_posts, 0),
        COALESCE(us.community_likes, 0),
        COALESCE(us.community_events_attended, 0),
        us.last_activity
    FROM user_profiles up
    LEFT JOIN user_statistics us ON up.id = us.user_id
    WHERE up.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    user_uuid UUID,
    activity_type_param VARCHAR(50),
    activity_description_param TEXT DEFAULT NULL,
    metadata_param JSONB DEFAULT '{}',
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_logs (
        user_id,
        activity_type,
        activity_description,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        user_uuid,
        activity_type_param,
        activity_description_param,
        metadata_param,
        ip_address_param,
        user_agent_param
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics(
    user_uuid UUID,
    stats_data JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_statistics (user_id, total_workflows, active_workflows, total_automations, successful_automations, failed_automations, community_posts, community_likes, community_events_attended, last_activity)
    VALUES (
        user_uuid,
        COALESCE((stats_data->>'total_workflows')::INTEGER, 0),
        COALESCE((stats_data->>'active_workflows')::INTEGER, 0),
        COALESCE((stats_data->>'total_automations')::INTEGER, 0),
        COALESCE((stats_data->>'successful_automations')::INTEGER, 0),
        COALESCE((stats_data->>'failed_automations')::INTEGER, 0),
        COALESCE((stats_data->>'community_posts')::INTEGER, 0),
        COALESCE((stats_data->>'community_likes')::INTEGER, 0),
        COALESCE((stats_data->>'community_events_attended')::INTEGER, 0),
        COALESCE((stats_data->>'last_activity')::TIMESTAMPTZ, NOW())
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_workflows = EXCLUDED.total_workflows,
        active_workflows = EXCLUDED.active_workflows,
        total_automations = EXCLUDED.total_automations,
        successful_automations = EXCLUDED.successful_automations,
        failed_automations = EXCLUDED.failed_automations,
        community_posts = EXCLUDED.community_posts,
        community_likes = EXCLUDED.community_likes,
        community_events_attended = EXCLUDED.community_events_attended,
        last_activity = EXCLUDED.last_activity,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. INSERT DEFAULT PREFERENCES FOR EXISTING USERS
-- =====================================================
INSERT INTO user_preferences (user_id, theme, notifications_email, notifications_browser, notifications_community, notifications_workflows, email_frequency, privacy_level)
SELECT 
    id,
    'light',
    true,
    true,
    true,
    true,
    'daily',
    'public'
FROM users
WHERE id NOT IN (SELECT user_id FROM user_preferences);

-- 11. INSERT DEFAULT STATISTICS FOR EXISTING USERS
-- =====================================================
INSERT INTO user_statistics (user_id, total_workflows, active_workflows, total_automations, successful_automations, failed_automations, community_posts, community_likes, community_events_attended, last_activity)
SELECT 
    id,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    created_at
FROM users
WHERE id NOT IN (SELECT user_id FROM user_statistics);

-- 12. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- 13. CREATE RLS POLICIES
-- =====================================================

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- User activity logs policies
CREATE POLICY "Users can view their own activity logs" ON user_activity_logs
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "System can insert activity logs" ON user_activity_logs
    FOR INSERT WITH CHECK (true);

-- User statistics policies
CREATE POLICY "Users can view their own statistics" ON user_statistics
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "System can update statistics" ON user_statistics
    FOR ALL WITH CHECK (true);

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "System can manage sessions" ON user_sessions
    FOR ALL WITH CHECK (true);

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY "System can insert achievements" ON user_achievements
    FOR INSERT WITH CHECK (true);

-- 14. CREATE VIEWS FOR EASY ACCESS
-- =====================================================

-- Complete user profile view
CREATE OR REPLACE VIEW user_profile_complete AS
SELECT 
    up.id,
    up.email,
    up.role,
    up.first_name,
    up.last_name,
    up.avatar_url,
    up.bio,
    up.phone,
    up.company,
    up.job_title,
    up.location,
    up.website,
    up.timezone,
    up.language,
    up.created_at,
    up.updated_at,
    upref.theme,
    upref.notifications_email,
    upref.notifications_browser,
    upref.notifications_community,
    upref.notifications_workflows,
    upref.email_frequency,
    upref.privacy_level,
    upref.dashboard_layout,
    us.total_workflows,
    us.active_workflows,
    us.total_automations,
    us.successful_automations,
    us.failed_automations,
    us.community_posts,
    us.community_likes,
    us.community_events_attended,
    us.last_activity
FROM user_profiles up
LEFT JOIN user_preferences upref ON up.id = upref.user_id
LEFT JOIN user_statistics us ON up.id = us.user_id;

-- User activity summary view
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    user_id,
    COUNT(*) as total_activities,
    COUNT(CASE WHEN activity_type = 'login' THEN 1 END) as login_count,
    COUNT(CASE WHEN activity_type = 'workflow_created' THEN 1 END) as workflow_created_count,
    COUNT(CASE WHEN activity_type = 'workflow_executed' THEN 1 END) as workflow_executed_count,
    COUNT(CASE WHEN activity_type = 'community_post' THEN 1 END) as community_post_count,
    MAX(created_at) as last_activity
FROM user_activity_logs
GROUP BY user_id;

COMMENT ON TABLE user_preferences IS 'User preferences and settings';
COMMENT ON TABLE user_activity_logs IS 'User activity tracking and logging';
COMMENT ON TABLE user_statistics IS 'User statistics and metrics';
COMMENT ON TABLE user_sessions IS 'User session management';
COMMENT ON TABLE user_achievements IS 'User achievements and badges';

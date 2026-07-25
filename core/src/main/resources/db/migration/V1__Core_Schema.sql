-- ============================================================
-- RICKCHAT CORE DATABASE SCHEMA
-- PostgreSQL Migration V1
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'moderator', 'creator', 'user', 'anonymous');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived', 'deleted', 'flagged', 'banned');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled', 'partially_refunded');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'incomplete', 'trialing', 'expired');
CREATE TYPE subscription_interval AS ENUM ('monthly', 'yearly', 'weekly', 'daily');
CREATE TYPE notification_type AS ENUM ('email', 'push', 'sms', 'in_app', 'webhook');
CREATE TYPE notification_channel AS ENUM ('system', 'chat', 'marketplace', 'learning', 'payment', 'social', 'admin');
CREATE TYPE file_type AS ENUM ('image', 'audio', 'video', 'document', 'archive', 'other');
CREATE TYPE ai_provider AS ENUM ('openai', 'gemini', 'anthropic', 'custom');
CREATE TYPE memory_type AS ENUM ('preference', 'goal', 'project', 'knowledge', 'pinned', 'context', 'conversation');
CREATE TYPE memory_visibility AS ENUM ('private', 'shared', 'public');
CREATE TYPE chat_type AS ENUM ('direct', 'group', 'agent', 'support');
CREATE TYPE translation_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE quiz_type AS ENUM ('multiple_choice', 'true_false', 'fill_blank', 'matching', 'coding', 'essay');
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE certificate_status AS ENUM ('in_progress', 'completed', 'expired');
CREATE TYPE moderation_action AS ENUM ('warn', 'mute', 'suspend', 'ban', 'remove_content', 'restore');

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'usr_' || uuid_generate_v4()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    password_hash VARCHAR(255),
    firebase_uid VARCHAR(128) UNIQUE,
    role user_role NOT NULL DEFAULT 'user',
    avatar_url TEXT,
    bio TEXT,
    locale VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE user_profiles (
    user_id VARCHAR(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    website_url TEXT,
    company VARCHAR(255),
    title VARCHAR(255),
    social_links JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    accessibility_settings JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    theme VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'sess_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(512) NOT NULL,
    device_info JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_keys (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'key_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    permissions JSONB DEFAULT '[]',
    allowed_ips TEXT[],
    rate_limit_override INTEGER,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth2_accounts (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- ============================================================
-- CHAT
-- ============================================================
CREATE TABLE chats (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'chat_' || uuid_generate_v4()::text,
    title VARCHAR(500),
    type chat_type NOT NULL DEFAULT 'direct',
    creator_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id VARCHAR(36),
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    last_message_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_participants (
    chat_id VARCHAR(36) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    is_muted BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'msg_' || uuid_generate_v4()::text,
    chat_id VARCHAR(36) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id VARCHAR(36) REFERENCES users(id),
    content TEXT NOT NULL,
    content_html TEXT,
    content_type VARCHAR(50) DEFAULT 'text',
    reply_to_id VARCHAR(36) REFERENCES messages(id),
    ai_model VARCHAR(100),
    ai_provider ai_provider,
    tokens_used INTEGER,
    token_cost DECIMAL(20,10),
    metadata JSONB DEFAULT '{}',
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_attachments (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    message_id VARCHAR(36) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_type file_type NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    mime_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_reactions (
    message_id VARCHAR(36) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id, reaction)
);

CREATE INDEX idx_messages_chat ON messages(chat_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_chats_creator ON chats(creator_id);
CREATE INDEX idx_chats_type ON chats(type);

-- ============================================================
-- AI GATEWAY & MEMORY
-- ============================================================
CREATE TABLE ai_conversations (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'aiconv_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    model VARCHAR(100),
    provider ai_provider,
    system_prompt TEXT,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    token_count INTEGER DEFAULT 0,
    cost DECIMAL(20,10) DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memory_entries (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'mem_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type memory_type NOT NULL DEFAULT 'knowledge',
    title VARCHAR(500),
    content TEXT NOT NULL,
    content_embedding vector(1536),
    summary TEXT,
    tags TEXT[] DEFAULT '{}',
    visibility memory_visibility NOT NULL DEFAULT 'private',
    category VARCHAR(100),
    importance INTEGER DEFAULT 0 CHECK (importance >= 0 AND importance <= 10),
    source VARCHAR(100),
    source_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    is_compressed BOOLEAN DEFAULT FALSE,
    compressed_version TEXT,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memory_user ON memory_entries(user_id);
CREATE INDEX idx_memory_type ON memory_entries(type);
CREATE INDEX idx_memory_importance ON memory_entries(importance DESC);
CREATE INDEX idx_memory_tags ON memory_entries USING GIN(tags);
CREATE INDEX idx_memory_category ON memory_entries(category);
CREATE INDEX idx_memory_created ON memory_entries(created_at DESC);
CREATE INDEX idx_memory_embedding ON memory_entries USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE memory_access_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    memory_id VARCHAR(36) NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    access_type VARCHAR(50) NOT NULL,
    context VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MARKETPLACE
-- ============================================================
CREATE TABLE marketplace_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'item_' || uuid_generate_v4()::text,
    creator_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    price DECIMAL(10,2) DEFAULT 0,
    compare_at_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    status content_status NOT NULL DEFAULT 'draft',
    version VARCHAR(20) DEFAULT '1.0.0',
    content_type VARCHAR(100) NOT NULL,
    content_url TEXT,
    thumbnail_url TEXT,
    preview_url TEXT,
    file_size BIGINT,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_free BOOLEAN DEFAULT FALSE,
    is_exclusive BOOLEAN DEFAULT FALSE,
    subscription_required BOOLEAN DEFAULT FALSE,
    compatible_models TEXT[] DEFAULT '{}',
    minimum_version VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    moderation_note TEXT,
    moderated_by VARCHAR(36) REFERENCES users(id),
    moderated_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_reviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    item_id VARCHAR(36) NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(500),
    content TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);

CREATE TABLE marketplace_downloads (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    item_id VARCHAR(36) NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    version VARCHAR(20) NOT NULL,
    license_type VARCHAR(50),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_collections (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'col_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_collection_items (
    collection_id VARCHAR(36) NOT NULL REFERENCES marketplace_collections(id) ON DELETE CASCADE,
    item_id VARCHAR(36) NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection_id, item_id)
);

CREATE INDEX idx_marketplace_status ON marketplace_items(status);
CREATE INDEX idx_marketplace_creator ON marketplace_items(creator_id);
CREATE INDEX idx_marketplace_category ON marketplace_items(category);
CREATE INDEX idx_marketplace_rating ON marketplace_items(rating_avg DESC);
CREATE INDEX idx_marketplace_featured ON marketplace_items(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_marketplace_tags ON marketplace_items USING GIN(tags);

-- ============================================================
-- LEARNING
-- ============================================================
CREATE TABLE courses (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'course_' || uuid_generate_v4()::text,
    creator_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    category VARCHAR(100),
    level course_level NOT NULL DEFAULT 'beginner',
    language VARCHAR(10) DEFAULT 'en',
    thumbnail_url TEXT,
    preview_video_url TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    duration_hours DECIMAL(8,2),
    lesson_count INTEGER DEFAULT 0,
    total_lessons INTEGER DEFAULT 0,
    quiz_count INTEGER DEFAULT 0,
    status content_status NOT NULL DEFAULT 'draft',
    is_certificate_available BOOLEAN DEFAULT TRUE,
    passing_score INTEGER DEFAULT 70,
    rating_avg DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    enrollment_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    prerequisites TEXT[] DEFAULT '{}',
    learning_objectives TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_lessons (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'lesson_' || uuid_generate_v4()::text,
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    video_url TEXT,
    video_duration_seconds INTEGER,
    order_index INTEGER NOT NULL,
    is_free_preview BOOLEAN DEFAULT FALSE,
    duration_minutes INTEGER DEFAULT 0,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_id, order_index)
);

CREATE TABLE course_quizzes (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'quiz_' || uuid_generate_v4()::text,
    lesson_id VARCHAR(36) NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type quiz_type NOT NULL DEFAULT 'multiple_choice',
    options JSONB NOT NULL DEFAULT '[]',
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lesson_id, order_index)
);

CREATE TABLE course_enrollments (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    progress DECIMAL(5,2) DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    total_lessons INTEGER NOT NULL,
    quiz_score DECIMAL(5,2),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE TABLE lesson_progress (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(36) NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    quiz_score DECIMAL(5,2),
    quiz_answers JSONB DEFAULT '[]',
    time_spent_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE certificates (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'cert_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_id VARCHAR(36) NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
    certificate_url TEXT,
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    status certificate_status NOT NULL DEFAULT 'completed',
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE bookmarks (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(36) NOT NULL,
    label VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, resource_type, resource_id)
);

CREATE TABLE flashcards (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'card_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_name VARCHAR(255),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    hints TEXT,
    tags TEXT[] DEFAULT '{}',
    difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
    review_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_creator ON courses(creator_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_level ON courses(level);
CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id, course_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payment_methods (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'pm_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_payment_method_id VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    last_four VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    cardholder_name VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    billing_details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'pay_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method_id VARCHAR(36) REFERENCES payment_methods(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2),
    status payment_status NOT NULL DEFAULT 'pending',
    provider VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(255),
    provider_charge_id VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    refunded_amount DECIMAL(10,2) DEFAULT 0,
    refund_reason TEXT,
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    payment_id VARCHAR(36) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    item_name VARCHAR(500) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE revenue_shares (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    payment_id VARCHAR(36) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    item_id VARCHAR(36) NOT NULL,
    creator_id VARCHAR(36) NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_payment_items_payment ON payment_items(payment_id);
CREATE INDEX idx_revenue_shares_creator ON revenue_shares(creator_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscription_plans (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'plan_' || uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interval subscription_interval NOT NULL DEFAULT 'monthly',
    interval_count INTEGER DEFAULT 1,
    trial_days INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'sub_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(36) NOT NULL REFERENCES subscription_plans(id),
    status subscription_status NOT NULL DEFAULT 'active',
    provider VARCHAR(50),
    provider_subscription_id VARCHAR(255),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period ON subscriptions(current_period_end);

-- ============================================================
-- FILES
-- ============================================================
CREATE TABLE files (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'file_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type file_type NOT NULL,
    size BIGINT NOT NULL,
    path TEXT NOT NULL,
    bucket VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    hash VARCHAR(64),
    width INTEGER,
    height INTEGER,
    duration_seconds DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_files_user ON files(user_id);
CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_created ON files(created_at);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT 'notif_' || uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'in_app',
    channel notification_channel NOT NULL DEFAULT 'system',
    title VARCHAR(500) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    action_url TEXT,
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    priority VARCHAR(10) DEFAULT 'normal',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_templates (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    channel notification_channel NOT NULL,
    type VARCHAR(100) NOT NULL,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    locale VARCHAR(10) DEFAULT 'en',
    variables TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel, type, locale)
);

CREATE TABLE notification_devices (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(500) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    app_version VARCHAR(20),
    device_model VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- TRANSLATION
-- ============================================================
CREATE TABLE translations (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    source_text_hash VARCHAR(64) NOT NULL,
    source_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    translated_text TEXT,
    status translation_status NOT NULL DEFAULT 'pending',
    provider ai_provider,
    confidence DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(source_text_hash, target_language)
);

CREATE TABLE live_captions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    session_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) REFERENCES users(id),
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT,
    is_final BOOLEAN DEFAULT FALSE,
    timestamp_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_translations_hash ON translations(source_text_hash);
CREATE INDEX idx_translations_status ON translations(status);
CREATE INDEX idx_live_captions_session ON live_captions(session_id);

-- ============================================================
-- ACCESSIBILITY
-- ============================================================
CREATE TABLE accessibility_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    session_type VARCHAR(50) NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE screen_readers (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    content_type VARCHAR(50) NOT NULL,
    content_id VARCHAR(36),
    content_text TEXT NOT NULL,
    audio_url TEXT,
    voice VARCHAR(100),
    speed DECIMAL(3,2) DEFAULT 1.0,
    pitch DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ocr_results (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    file_id VARCHAR(36) REFERENCES files(id),
    detected_text TEXT NOT NULL,
    detected_language VARCHAR(10),
    confidence DECIMAL(5,2),
    bounding_boxes JSONB DEFAULT '[]',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS
-- ============================================================
CREATE TABLE analytics_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    event_name VARCHAR(255) NOT NULL,
    event_category VARCHAR(100) NOT NULL,
    event_action VARCHAR(100),
    event_label VARCHAR(255),
    event_value DOUBLE PRECISION,
    screen VARCHAR(255),
    session_id VARCHAR(36),
    properties JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address VARCHAR(45),
    platform VARCHAR(50),
    app_version VARCHAR(20),
    country VARCHAR(2),
    city VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analytics_page_views (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id VARCHAR(36) REFERENCES users(id),
    path VARCHAR(500) NOT NULL,
    title VARCHAR(500),
    referrer TEXT,
    duration_seconds INTEGER DEFAULT 0,
    screen_width INTEGER,
    screen_height INTEGER,
    session_id VARCHAR(36),
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analytics_daily_stats (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value BIGINT NOT NULL,
    dimension VARCHAR(100),
    dimension_value VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, metric_name, dimension, dimension_value)
);

CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_page_views_path ON analytics_page_views(path);
CREATE INDEX idx_analytics_page_views_created ON analytics_page_views(created_at);
CREATE INDEX idx_analytics_daily_stats_date ON analytics_daily_stats(date, metric_name);

-- ============================================================
-- ADMIN
-- ============================================================
CREATE TABLE admin_actions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    admin_id VARCHAR(36) NOT NULL REFERENCES users(id),
    action moderation_action NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    reason TEXT,
    duration_hours INTEGER,
    details JSONB DEFAULT '{}',
    auto_revoke_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_reports (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    reporter_id VARCHAR(36) NOT NULL REFERENCES users(id),
    reported_type VARCHAR(50) NOT NULL,
    reported_id VARCHAR(36) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by VARCHAR(36) REFERENCES users(id),
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_config (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BACKGROUND JOBS
-- ============================================================
CREATE TABLE background_jobs (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payload JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    error_message TEXT,
    priority INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_type ON background_jobs(type);
CREATE INDEX idx_background_jobs_scheduled ON background_jobs(scheduled_at) WHERE status = 'pending';

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_marketplace_items_updated_at BEFORE UPDATE ON marketplace_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_memory_updated_at BEFORE UPDATE ON memory_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO users (id, email, username, display_name, role, email_verified)
VALUES ('usr_seed_admin_001', 'admin@rickchat.ai', 'admin', 'System Administrator', 'super_admin', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO subscription_plans (id, name, description, price, interval, features, limits)
VALUES
    ('plan_free', 'Free', 'Basic access to RickChat', 0, 'monthly', '["Basic chat", "100 messages/day", "1GB storage"]', '{"max_chats": 10, "max_memories": 50, "max_file_size": 10485760}'),
    ('plan_pro', 'Pro', 'Enhanced features for power users', 19.99, 'monthly', '["Unlimited chat", "AI model selection", "Memory management", "50GB storage", "Priority support"]', '{"max_chats": -1, "max_memories": 1000, "max_file_size": 104857600}'),
    ('plan_enterprise', 'Enterprise', 'Full platform access with custom AI', 99.99, 'monthly', '["Everything in Pro", "Custom AI agents", "Advanced analytics", "1TB storage", "API access", "Dedicated support"]', '{"max_chats": -1, "max_memories": -1, "max_file_size": 1073741824}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_config (key, value, description, is_public)
VALUES
    ('platform.name', '"RickChat"', 'Platform name', true),
    ('platform.version', '"1.0.0"', 'Current platform version', true),
    ('ai.default_model', '"gpt-4"', 'Default AI model', true),
    ('ai.available_models', '["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gemini-pro", "claude-3-opus", "claude-3-sonnet"]', 'Available AI models', true),
    ('maintenance_mode', 'false', 'System maintenance mode', true),
    ('max_upload_size', '104857600', 'Maximum file upload size in bytes', true),
    ('rate_limit.default', '100', 'Default rate limit per second', false),
    ('features.ai_chat', 'true', 'Enable AI chat features', true),
    ('features.marketplace', 'true', 'Enable marketplace', true),
    ('features.learning', 'true', 'Enable learning platform', true),
    ('features.translation', 'true', 'Enable translation services', true),
    ('features.accessibility', 'true', 'Enable accessibility features', true),
    ('features.camera_ai', 'true', 'Enable camera AI features', true),
    ('features.voice_ai', 'true', 'Enable voice AI features', true)
ON CONFLICT (key) DO NOTHING;

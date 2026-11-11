-- ============================================================================
-- Exploro Database Migration: Phase 5 - Experiences & Native Community Reviews
-- ============================================================================

-- 1. Ensure EXPLORO_NATIVE source exists
INSERT INTO sources (code, name, source_type, base_trust_weight, is_active)
VALUES ('EXPLORO_NATIVE', 'Exploro Comunidad Nativa', 'NATIVE_EXPERIENCE', 0.95, TRUE)
ON CONFLICT (code) DO UPDATE SET is_active = TRUE, base_trust_weight = 0.95;

-- 2. Create activity_logs table for tracking "Comenzar actividad"
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    activity_title VARCHAR(180) NOT NULL DEFAULT 'Visita libre',
    status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
    verification_method VARCHAR(30) NOT NULL DEFAULT 'NONE',
    is_verified_visit BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    CONSTRAINT chk_activity_logs_status CHECK (status IN ('STARTED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_activity_logs_verification CHECK (verification_method IN ('NONE', 'GPS_PROXIMITY', 'QR_CODE'))
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_status ON activity_logs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_place ON activity_logs (place_id);

-- 3. Create user_reviews table for structured category-adapted feedback
CREATE TABLE IF NOT EXISTS user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_log_id UUID REFERENCES activity_logs(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    review_type VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    taste_quality SMALLINT,
    service_rating SMALLINT,
    value_for_money VARCHAR(20),
    worth_it BOOLEAN,
    duration_spent VARCHAR(30),
    accessibility VARCHAR(30),
    amount_paid NUMERIC(10,2),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    recommended_item VARCHAR(255),
    caveat_or_tip TEXT,
    would_return_or_recommend BOOLEAN NOT NULL DEFAULT TRUE,
    comment TEXT,
    is_verified_visit BOOLEAN NOT NULL DEFAULT FALSE,
    verification_method VARCHAR(30) NOT NULL DEFAULT 'NONE',
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_reviews_type CHECK (review_type IN ('RESTAURANT', 'TOURISM', 'GENERAL')),
    CONSTRAINT chk_user_reviews_taste CHECK (taste_quality IS NULL OR (taste_quality >= 1 AND taste_quality <= 5)),
    CONSTRAINT chk_user_reviews_service CHECK (service_rating IS NULL OR (service_rating >= 1 AND service_rating <= 5)),
    CONSTRAINT chk_user_reviews_value CHECK (value_for_money IS NULL OR value_for_money IN ('EXCELLENT', 'FAIR', 'EXPENSIVE')),
    CONSTRAINT chk_user_reviews_duration CHECK (duration_spent IS NULL OR duration_spent IN ('UNDER_1_HOUR', '1_TO_2_HOURS', '2_TO_4_HOURS', 'HALF_DAY', 'FULL_DAY')),
    CONSTRAINT chk_user_reviews_accessibility CHECK (accessibility IS NULL OR accessibility IN ('EASY', 'MODERATE', 'DIFFICULT', 'WHEELCHAIR_ACCESSIBLE')),
    CONSTRAINT chk_user_reviews_moderation CHECK (moderation_status IN ('PUBLISHED', 'FLAGGED', 'HIDDEN'))
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_place_created ON user_reviews (place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reviews_user ON user_reviews (user_id);

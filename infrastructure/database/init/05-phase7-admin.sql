-- =============================================================================
-- EXPLORO PLATFORM — MIGRACIÓN FASE 7: ADMINISTRACIÓN Y CONTROL
-- =============================================================================
-- Tablas para reportes comunitarios, errores de procesamiento y modelos de IA.
-- Gobernanza estricta: Auditoría inmutable e inmutabilidad de testimonios.
-- =============================================================================

-- 1. Tabla de Reportes Comunitarios
CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(40) NOT NULL CHECK (target_type IN ('PLACE', 'USER_REVIEW', 'EVIDENCE', 'COMMUNITY_NOTE')),
    target_id VARCHAR(100) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status);

-- 2. Tabla de Errores de Procesamiento (IA / Ingesta de Fuentes)
CREATE TABLE IF NOT EXISTS processing_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code VARCHAR(50),
    place_id UUID REFERENCES places(id) ON DELETE SET NULL,
    error_type VARCHAR(60) NOT NULL,
    error_message TEXT NOT NULL,
    payload JSONB,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_errors_unresolved ON processing_errors (is_resolved) WHERE is_resolved = FALSE;

-- 3. Tabla de Configuración de Modelos de IA Locales ($0.00)
CREATE TABLE IF NOT EXISTS ai_models_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL DEFAULT 'OLLAMA_LOCAL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_models_config (model_name, provider, is_active, parameters, description)
VALUES 
    ('qwen2.5:7b-instruct-q4_K_M', 'OLLAMA_LOCAL', TRUE, '{"temperature": 0.2, "top_p": 0.9}', 'Modelo primario de extracción estructurada de aspectos'),
    ('mistral:7b-instruct-v0.3-q4_K_M', 'OLLAMA_LOCAL', FALSE, '{"temperature": 0.1}', 'Modelo secundario de respaldo para análisis de texto')
ON CONFLICT (model_name) DO NOTHING;

-- 4. Índices para auditoría rápida en audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- 5. Ampliación de estados de moderación en user_reviews
ALTER TABLE user_reviews DROP CONSTRAINT IF EXISTS chk_user_reviews_moderation;
ALTER TABLE user_reviews ADD CONSTRAINT chk_user_reviews_moderation 
    CHECK (moderation_status IN ('PUBLISHED', 'FLAGGED', 'HIDDEN', 'REJECTED', 'DISPUTED'));


-- =============================================================================
-- EXPLORO — Esquema Inicial PostgreSQL 16 + PostGIS 3.4 y Semillas (Estados Unidos)
-- Versión: 1.0.0 (Fase 1)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PAÍSES, CIUDADES Y DESTINOS
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iso_code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    name VARCHAR(120) NOT NULL,
    state_code VARCHAR(10),
    slug VARCHAR(140) UNIQUE NOT NULL,
    center_point GEOGRAPHY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_center_gist ON cities USING GIST (center_point);

CREATE TABLE IF NOT EXISTS destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(160) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    center_point GEOGRAPHY(Point, 4326) NOT NULL,
    boundary GEOGRAPHY(Polygon, 4326),
    is_featured BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destinations_center_gist ON destinations USING GIST (center_point);

-- 2. CATEGORÍAS Y SUBCATEGORÍAS DINÁMICAS
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon_name VARCHAR(60) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    slug VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USUARIOS, SESIONES Y PREFERENCIAS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'TRAVELER' CHECK (role IN ('TRAVELER', 'MODERATOR', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    personalization_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_mode VARCHAR(20) NOT NULL DEFAULT 'TRAVELER' CHECK (preferred_mode IN ('TRAVELER', 'LOCAL')),
    budget_tier VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (budget_tier IN ('FREE', 'LOW', 'MEDIUM', 'HIGH', 'LUXURY', 'UNKNOWN')),
    favorite_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    travel_styles JSONB NOT NULL DEFAULT '[]'::jsonb,
    companion_default VARCHAR(20) NOT NULL DEFAULT 'SOLO' CHECK (companion_default IN ('SOLO', 'COUPLE', 'FAMILY', 'FRIENDS')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(128) UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CATÁLOGO DE LUGARES, ESTABLECIMIENTOS Y ACTIVIDADES
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
    name VARCHAR(180) NOT NULL,
    normalized_name VARCHAR(180) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    address_text VARCHAR(255),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    image_url TEXT,
    price_tier VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN' CHECK (price_tier IN ('FREE', 'LOW', 'MEDIUM', 'HIGH', 'LUXURY', 'UNKNOWN')),
    avg_price_min NUMERIC(10, 2),
    avg_price_max NUMERIC(10, 2),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    price_status VARCHAR(25) NOT NULL DEFAULT 'INSUFFICIENT_DATA' CHECK (price_status IN ('CONFIRMED', 'UNVERIFIED', 'INSUFFICIENT_DATA')),
    schedule_status VARCHAR(25) NOT NULL DEFAULT 'INSUFFICIENT_DATA' CHECK (schedule_status IN ('CONFIRMED', 'UNVERIFIED', 'INSUFFICIENT_DATA')),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'COMMUNITY_VERIFIED', 'VERIFIED', 'DISPUTED')),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_location_gist ON places USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_places_normalized_name_trgm ON places USING GIN (normalized_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_cat_city_active ON places (category_id, city_id, is_active);

CREATE TABLE IF NOT EXISTS establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID UNIQUE NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    opening_hours JSONB,
    phone VARCHAR(50),
    website_url TEXT,
    specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
    accepts_reservations BOOLEAN
);

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    estimated_duration_mins INT,
    estimated_cost NUMERIC(10, 2),
    accessibility_level VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN' CHECK (accessibility_level IN ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
    best_time_of_day VARCHAR(20) NOT NULL DEFAULT 'ANY' CHECK (best_time_of_day IN ('MORNING', 'AFTERNOON', 'NIGHT', 'ANY'))
);

-- Separación estricta de referencias de terceros
CREATE TABLE IF NOT EXISTS place_external_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    provider_code VARCHAR(40) NOT NULL,
    external_place_id VARCHAR(180) NOT NULL,
    attribution_text TEXT,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_code, external_place_id)
);

-- 5. FUENTES, EVIDENCIAS Y RANKING EXPLICABLE
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    source_type VARCHAR(40) NOT NULL CHECK (source_type IN ('EXTERNAL_COMMUNITY', 'BLOG', 'NATIVE_EXPERIENCE', 'CURATED')),
    base_trust_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.80,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    external_url TEXT,
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    extracted_snippet TEXT NOT NULL,
    evidence_type VARCHAR(30) NOT NULL DEFAULT 'OPINION' CHECK (evidence_type IN ('OPINION', 'GUIDE', 'REVIEW', 'MENTION')),
    sentiment_score NUMERIC(4, 2) NOT NULL DEFAULT 0.50,
    confidence_score NUMERIC(4, 2) NOT NULL DEFAULT 0.80,
    processing_status VARCHAR(25) NOT NULL DEFAULT 'PROCESSED' CHECK (processing_status IN ('PENDING', 'PROCESSED', 'AMBIGUOUS', 'REJECTED')),
    published_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidences_place_status ON evidences (place_id, processing_status);

CREATE TABLE IF NOT EXISTS place_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID UNIQUE NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    confidence_level VARCHAR(15) NOT NULL DEFAULT 'LOW' CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
    total_independent_evidences INT NOT NULL DEFAULT 0,
    total_native_reviews INT NOT NULL DEFAULT 0,
    source_diversity_count INT NOT NULL DEFAULT 0,
    ai_explanation_es TEXT,
    explanation_status VARCHAR(25) NOT NULL DEFAULT 'INSUFFICIENT_DATA' CHECK (explanation_status IN ('CONFIRMED', 'UNVERIFIED', 'INSUFFICIENT_DATA')),
    top_positive_aspects JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_negative_aspects JSONB NOT NULL DEFAULT '[]'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. FAVORITOS Y COLECCIONES
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, place_id)
);

CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (collection_id, place_id)
);

-- 7. FEATURE FLAGS Y AUDITORÍA INMUTABLE
CREATE TABLE IF NOT EXISTS feature_flags (
    key VARCHAR(80) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(60) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SEMILLAS INICIALES (ESTADOS UNIDOS + CATEGORÍAS Y SUBCATEGORÍAS OFICIALES)
-- =============================================================================

INSERT INTO feature_flags (key, enabled, description) VALUES
('local_mode_enabled', FALSE, 'Habilita funcionalmente el modo «Soy local» en la pantalla inicial (deshabilitado en v1).'),
('trip_planner_enabled', FALSE, 'Habilita la visibilidad pública del Planificador de Viajes de la Fase 6.')
ON CONFLICT (key) DO NOTHING;

-- País: Estados Unidos (US, USD)
INSERT INTO countries (id, iso_code, name, currency_code) VALUES
('11111111-1111-1111-1111-111111111101', 'US', 'Estados Unidos', 'USD')
ON CONFLICT (iso_code) DO NOTHING;

-- Ciudades Principales de EE. UU. con coordenadas reales en PostGIS (Longitude, Latitude)
INSERT INTO cities (id, country_id, name, state_code, slug, center_point) VALUES
('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'New York City', 'NY', 'new-york', ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326)::geography),
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101', 'Miami', 'FL', 'miami', ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography),
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101', 'Los Angeles', 'CA', 'los-angeles', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326)::geography),
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111101', 'Chicago', 'IL', 'chicago', ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography),
('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', 'Austin', 'TX', 'austin', ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326)::geography),
('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111101', 'San Francisco', 'CA', 'san-francisco', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography),
('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111101', 'Orlando', 'FL', 'orlando', ST_SetSRID(ST_MakePoint(-81.3792, 28.5383), 4326)::geography)
ON CONFLICT (slug) DO NOTHING;

-- Destinos destacados en EE. UU.
INSERT INTO destinations (id, city_id, name, slug, description, center_point, is_featured) VALUES
('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Manhattan & Brooklyn', 'manhattan-brooklyn', 'Gastronomía auténtica, miradores icónicos, parques urbanos y museos de clase mundial en Nueva York.', ST_SetSRID(ST_MakePoint(-73.9855, 40.7580), 4326)::geography, TRUE),
('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'Little Havana & Wynwood', 'little-havana-wynwood', 'Cultura caribeña, arte urbano, cafés históricos y playas en Miami.', ST_SetSRID(ST_MakePoint(-80.2200, 25.7781), 4326)::geography, TRUE),
('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222205', 'Downtown & South Congress', 'austin-downtown-soco', 'Capital de la música en vivo, auténtico BBQ texano y parques naturales en Austin.', ST_SetSRID(ST_MakePoint(-97.7494, 30.2500), 4326)::geography, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Categorías Principales Obligatorias (Paso 2.2)
INSERT INTO categories (id, slug, name, description, icon_name, sort_order, is_active) VALUES
('44444444-4444-4444-4444-444444444401', 'comida', 'Comida', 'Restaurantes, pizzerías, BBQ, comida callejera y especialidades locales respaldadas por comensales reales.', 'utensils', 1, TRUE),
('44444444-4444-4444-4444-444444444402', 'turismo', 'Turismo', 'Miradores, monumentos, naturaleza, museos, cultura y lugares emblemáticos.', 'compass', 2, TRUE),
('44444444-4444-4444-4444-444444444403', 'entretenimiento', 'Entretenimiento', 'Shows en vivo, clubes de comedia, vida nocturna y espectáculos.', 'music', 3, TRUE),
('44444444-4444-4444-4444-444444444404', 'actividades', 'Actividades', 'Recorridos guiados, deportes al aire libre, paseos en kayak y experiencias interactivas.', 'kayak', 4, TRUE),
('44444444-4444-4444-4444-444444444405', 'eventos', 'Eventos', 'Festivales gastronómicos, conciertos, ferias culturales y mercados de temporada.', 'calendar', 5, TRUE),
('44444444-4444-4444-4444-444444444406', 'compras', 'Compras', 'Mercados artesanales, librerías independientes, tiendas vintage y distritos comerciales.', 'shopping-bag', 6, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorías de Turismo Obligatorias (Paso 2.2)
INSERT INTO subcategories (id, category_id, slug, name, sort_order, is_active) VALUES
('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444402', 'miradores', 'Miradores', 1, TRUE),
('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402', 'monumentos', 'Monumentos', 2, TRUE),
('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444402', 'naturaleza', 'Naturaleza', 3, TRUE),
('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444402', 'museos', 'Museos', 4, TRUE),
('55555555-5555-5555-5555-555555555505', '44444444-4444-4444-4444-444444444402', 'cultura', 'Cultura', 5, TRUE),
('55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444402', 'pueblos-y-ciudades', 'Pueblos y ciudades', 6, TRUE),
('55555555-5555-5555-5555-555555555507', '44444444-4444-4444-4444-444444444402', 'lugares-emblematicos', 'Lugares emblemáticos', 7, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Fuentes Autorizadas Iniciales
INSERT INTO sources (id, code, name, source_type, base_trust_weight) VALUES
('66666666-6666-6666-6666-666666666601', 'REDDIT_US_FOOD', 'Comunidad Reddit Food & Travel US', 'EXTERNAL_COMMUNITY', 0.85),
('66666666-6666-6666-6666-666666666602', 'US_TRAVEL_BLOG', 'Guías Independientes de Viajeros US (RSS)', 'BLOG', 0.80),
('66666666-6666-6666-6666-666666666603', 'EXPLORO_NATIVE', 'Experiencias Verificadas en Exploro', 'NATIVE_EXPERIENCE', 0.95)
ON CONFLICT (code) DO NOTHING;

-- Lugares Semilla Verificados en Estados Unidos
INSERT INTO places (
    id, destination_id, city_id, category_id, subcategory_id,
    name, normalized_name, slug, description, address_text, location,
    image_url, price_tier, avg_price_min, avg_price_max, currency_code,
    price_status, schedule_status, verification_status, tags
) VALUES
(
    '77777777-7777-7777-7777-777777777701',
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    '44444444-4444-4444-4444-444444444401',
    NULL,
    'L''Industrie Pizzeria West Village',
    'l industrie pizzeria west village',
    'l-industrie-pizzeria-nyc',
    'Pizzería artesanal al estilo neoyorquino con fermentación larga e ingredientes importados.',
    '104 Christopher St, New York, NY 10014',
    ST_SetSRID(ST_MakePoint(-74.0052, 40.7332), 4326)::geography,
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
    'LOW', 5.00, 18.00, 'USD',
    'CONFIRMED', 'CONFIRMED', 'VERIFIED',
    '["Pizza al corte", "Masa ligera", "Calidad-precio", "West Village"]'::jsonb
),
(
    '77777777-7777-7777-7777-777777777702',
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222201',
    '44444444-4444-4444-4444-444444444402',
    '55555555-5555-5555-5555-555555555501',
    'Brooklyn Bridge Park — Pier 1 Viewpoint',
    'brooklyn bridge park pier 1 viewpoint',
    'brooklyn-bridge-park-pier-1',
    'Mirador público frente al East River con vista panorámica directa al skyline del Bajo Manhattan.',
    '2 Furman St, Brooklyn, NY 11201',
    ST_SetSRID(ST_MakePoint(-73.9949, 40.7021), 4326)::geography,
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80',
    'FREE', 0.00, 0.00, 'USD',
    'CONFIRMED', 'CONFIRMED', 'VERIFIED',
    '["Gratis", "Atardecer", "Skyline", "Fotografía"]'::jsonb
),
(
    '77777777-7777-7777-7777-777777777703',
    '33333333-3333-3333-3333-333333333302',
    '22222222-2222-2222-2222-222222222202',
    '44444444-4444-4444-4444-444444444401',
    NULL,
    'Sanguich de Miami — Calle Ocho',
    'sanguich de miami calle ocho',
    'sanguich-de-miami-calle-ocho',
    'Especialistas en sándwich cubano tradicional con jamón curado en casa, lechón marinado y batidos tropicales.',
    '2057 SW 8th St, Miami, FL 33135',
    ST_SetSRID(ST_MakePoint(-80.2292, 25.7655), 4326)::geography,
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
    'MEDIUM', 14.00, 24.00, 'USD',
    'CONFIRMED', 'CONFIRMED', 'VERIFIED',
    '["Comida Cubana", "Little Havana", "Porciones generosas"]'::jsonb
),
(
    '77777777-7777-7777-7777-777777777704',
    '33333333-3333-3333-3333-333333333303',
    '22222222-2222-2222-2222-222222222205',
    '44444444-4444-4444-4444-444444444402',
    '55555555-5555-5555-5555-555555555503',
    'Barton Springs Municipal Pool & Greenbelt',
    'barton springs municipal pool greenbelt',
    'barton-springs-austin',
    'Manantial natural subterráneo de tres acres en Zilker Park con agua cristalina todo el año.',
    '2131 William Barton Dr, Austin, TX 78746',
    ST_SetSRID(ST_MakePoint(-97.7713, 30.2640), 4326)::geography,
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    'UNKNOWN', NULL, NULL, 'USD',
    'INSUFFICIENT_DATA', 'UNVERIFIED', 'COMMUNITY_VERIFIED',
    '["Naturaleza", "Manantial", "Aire libre"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Evidencias Verificadas Iniciales
INSERT INTO evidences (id, place_id, source_id, external_url, content_hash, extracted_snippet, evidence_type, sentiment_score, confidence_score, published_at) VALUES
(
    '88888888-8888-8888-8888-888888888801',
    '77777777-7777-7777-7777-777777777701',
    '66666666-6666-6666-6666-666666666601',
    'https://reddit.com/r/FoodNYC/example-lindustrie',
    'hash_ev_lindustrie_01',
    'Varias reseñas independientes coinciden en que la porción Burrata Slice ($5.50) tiene la corteza más crujiente y ligera del West Village.',
    'OPINION', 0.92, 0.90, NOW() - INTERVAL '12 days'
),
(
    '88888888-8888-8888-8888-888888888802',
    '77777777-7777-7777-7777-777777777701',
    '66666666-6666-6666-6666-666666666603',
    NULL,
    'hash_ev_lindustrie_02',
    'Experiencia verificada en Exploro: fila rápida de 10 minutos entre semana, excelente relación calidad-precio por menos de $15.',
    'REVIEW', 0.95, 0.95, NOW() - INTERVAL '4 days'
),
(
    '88888888-8888-8888-8888-888888888803',
    '77777777-7777-7777-7777-777777777702',
    '66666666-6666-6666-6666-666666666602',
    'https://nyctravelguide.example.org/pier1-view',
    'hash_ev_pier1_01',
    'Viajeros destacan que ofrece una vista completa del skyline de Manhattan sin pagar los $40+ de un observatorio comercial.',
    'GUIDE', 0.94, 0.92, NOW() - INTERVAL '18 days'
),
(
    '88888888-8888-8888-8888-888888888804',
    '77777777-7777-7777-7777-777777777703',
    '66666666-6666-6666-6666-666666666601',
    'https://reddit.com/r/Miami/example-sanguich',
    'hash_ev_sanguich_01',
    'El pan cubano prensado con manteca tradicional y el batido de mamey son mencionados repetidamente como imprescindibles en Calle Ocho.',
    'OPINION', 0.89, 0.88, NOW() - INTERVAL '25 days'
)
ON CONFLICT (content_hash) DO NOTHING;

-- Scores Consolidados y Explicaciones Verificadas
INSERT INTO place_scores (
    place_id, overall_score, confidence_level, total_independent_evidences,
    total_native_reviews, source_diversity_count, ai_explanation_es,
    explanation_status, top_positive_aspects, top_negative_aspects
) VALUES
(
    '77777777-7777-7777-7777-777777777701',
    91.40, 'HIGH', 2, 1, 2,
    'Destaca porque múltiples viajeros y usuarios verificados coinciden en la ligereza de su masa fermentada, la especialidad Burrata Slice y una excelente relación calidad-precio ($5–$18 USD).',
    'CONFIRMED',
    '["Sabor de la masa", "Relación calidad-precio", "Rapidez entre semana"]'::jsonb,
    '["Espacio reducido para sentarse"]'::jsonb
),
(
    '77777777-7777-7777-7777-777777777702',
    89.80, 'MEDIUM', 1, 0, 1,
    'Recomendado por viajeros como la mejor alternativa gratuita en Nueva York para fotografiar el atardecer frente al Bajo Manhattan sin pagar entrada.',
    'CONFIRMED',
    '["Acceso gratuito", "Vista panorámica", "Seguridad"]'::jsonb,
    '[]'::jsonb
),
(
    '77777777-7777-7777-7777-777777777703',
    87.50, 'MEDIUM', 1, 0, 1,
    'Los visitantes destacan la autenticidad de su sándwich cubano hecho con ingredientes curados en casa y la atención en pleno corazón de Little Havana.',
    'CONFIRMED',
    '["Sabor auténtico", "Porciones", "Batidos naturales"]'::jsonb,
    '["Tiempo de espera en fin de semana"]'::jsonb
),
(
    '77777777-7777-7777-7777-777777777704',
    72.00, 'LOW', 0, 0, 0,
    NULL,
    'INSUFFICIENT_DATA',
    '["Entorno natural"]'::jsonb,
    '[]'::jsonb
)
ON CONFLICT (place_id) DO NOTHING;

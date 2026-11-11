-- ============================================================================
-- Exploro Database Migration: Phase 6 - Trip Planner (Hidden under Feature Flag)
-- ============================================================================

-- 1. Ensure Feature Flag exists
INSERT INTO feature_flags (key, enabled, description, updated_at)
VALUES (
    'trip_planner_enabled',
    FALSE,
    'Habilita la visibilidad pública del Planificador de Viajes de la Fase 6.',
    NOW()
)
ON CONFLICT (key) DO NOTHING;

-- 2. Trips table
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
    city_slug VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget_tier VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    travel_styles TEXT[] NOT NULL DEFAULT '{}',
    flexibility_minutes INTEGER NOT NULL DEFAULT 15,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trips_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_trips_budget CHECK (budget_tier IN ('FREE', 'LOW', 'MEDIUM', 'HIGH', 'LUXURY', 'UNKNOWN')),
    CONSTRAINT chk_trips_flexibility CHECK (flexibility_minutes IN (0, 15, 30, 60)),
    CONSTRAINT chk_trips_status CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_trips_user_status ON trips (user_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_destination ON trips (destination_id);

-- 3. Trip Days table
CREATE TABLE IF NOT EXISTS trip_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    date DATE NOT NULL,
    title VARCHAR(150),
    theme VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trip_day UNIQUE (trip_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_trip_days_trip ON trip_days (trip_id, day_number);

-- 4. Trip Items table
CREATE TABLE IF NOT EXISTS trip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL,
    custom_title VARCHAR(180),
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    transit_minutes_from_prev INTEGER NOT NULL DEFAULT 15,
    transit_distance_meters_from_prev INTEGER NOT NULL DEFAULT 1000,
    estimated_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_trip_item_order UNIQUE (trip_day_id, order_index),
    CONSTRAINT chk_trip_item_status CHECK (status IN ('PLANNED', 'COMPLETED', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS idx_trip_items_day_order ON trip_items (trip_day_id, order_index);
CREATE INDEX IF NOT EXISTS idx_trip_items_place ON trip_items (place_id);

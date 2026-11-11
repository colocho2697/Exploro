-- =============================================================================
-- EXPLORO — Fase 2: Catálogo ampliado (Estados Unidos)
-- Idempotente. Se ejecuta después de 01-schema-and-seed.sql.
--
-- IMPORTANTE: todos los lugares y evidencias sembrados son DATOS DE DEMOSTRACIÓN.
-- No provienen de fuentes reales verificadas. Se marcan con is_demo_data = TRUE
-- y la interfaz lo comunica al usuario (Principio #1 y #2 del MASTER_PROMPT).
-- =============================================================================

-- 1. Marca de datos de demostración -------------------------------------------
ALTER TABLE places    ADD COLUMN IF NOT EXISTS is_demo_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE evidences ADD COLUMN IF NOT EXISTS is_demo_data BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE places    SET is_demo_data = TRUE WHERE is_demo_data = FALSE;
UPDATE evidences SET is_demo_data = TRUE WHERE is_demo_data = FALSE;

-- Las URL "example" de la Fase 1 no son referencias reales: se eliminan.
UPDATE evidences SET external_url = NULL WHERE external_url LIKE '%example%';
UPDATE evidences
   SET extracted_snippet = '[DEMO] ' || extracted_snippet
 WHERE extracted_snippet NOT LIKE '[DEMO]%';

CREATE UNIQUE INDEX IF NOT EXISTS uq_activities_place_title ON activities (place_id, title);

-- Las imágenes de la Fase 1 no están verificadas como fotografías autorizadas para
-- cada lugar (requisito 2.1: fotos propias o autorizadas). Se retiran hasta contar
-- con un flujo de carga/licenciamiento (MinIO + moderación).
UPDATE places SET image_url = NULL WHERE image_url IS NOT NULL;

-- 2. Lugares adicionales (demostración) -----------------------------------------
-- Precios: se registran como UNVERIFIED; la UI debe advertirlo.
INSERT INTO places (
    id, destination_id, city_id, category_id, subcategory_id,
    name, normalized_name, slug, description, address_text, location,
    image_url, price_tier, avg_price_min, avg_price_max, currency_code,
    price_status, schedule_status, verification_status, tags, is_demo_data
) VALUES
('77777777-7777-7777-7777-777777777705', NULL,
 '22222222-2222-2222-2222-222222222203', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555501',
 'Griffith Observatory', 'griffith observatory', 'griffith-observatory-la',
 'Observatorio y mirador con vista panorámica de Los Ángeles y el letrero de Hollywood.',
 '2800 E Observatory Rd, Los Angeles, CA 90027',
 ST_SetSRID(ST_MakePoint(-118.3004, 34.1184), 4326)::geography,
 NULL, 'FREE', 0, 0, 'USD', 'UNVERIFIED', 'UNVERIFIED', 'COMMUNITY_VERIFIED',
 '["Vista panorámica","Atardecer","Gratis","Familiar"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777706', NULL,
 '22222222-2222-2222-2222-222222222204', '44444444-4444-4444-4444-444444444401', NULL,
 'Lou Malnati''s Pizzeria — River North', 'lou malnati s pizzeria river north', 'lou-malnatis-river-north',
 'Pizzería de estilo deep dish de Chicago.',
 '439 N Wells St, Chicago, IL 60654',
 ST_SetSRID(ST_MakePoint(-87.6339, 41.8905), 4326)::geography,
 NULL, 'MEDIUM', 12, 30, 'USD', 'UNVERIFIED', 'UNVERIFIED', 'UNVERIFIED',
 '["Deep dish","Porciones generosas","Grupo"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777707', '33333333-3333-3333-3333-333333333303',
 '22222222-2222-2222-2222-222222222205', '44444444-4444-4444-4444-444444444401', NULL,
 'Franklin Barbecue', 'franklin barbecue', 'franklin-barbecue-austin',
 'Barbacoa texana al estilo brisket ahumado.',
 '900 E 11th St, Austin, TX 78702',
 ST_SetSRID(ST_MakePoint(-97.7312, 30.2701), 4326)::geography,
 NULL, 'HIGH', 20, 45, 'USD', 'UNVERIFIED', 'UNVERIFIED', 'UNVERIFIED',
 '["BBQ","Brisket","Fila larga"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777708', NULL,
 '22222222-2222-2222-2222-222222222207', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555503',
 'Lake Eola Park', 'lake eola park', 'lake-eola-park-orlando',
 'Parque urbano alrededor de un lago en el centro de Orlando.',
 '512 E Washington St, Orlando, FL 32801',
 ST_SetSRID(ST_MakePoint(-81.3727, 28.5431), 4326)::geography,
 NULL, 'FREE', 0, 0, 'USD', 'UNVERIFIED', 'UNVERIFIED', 'UNVERIFIED',
 '["Aire libre","Gratis","Familiar","Naturaleza"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777709', NULL,
 '22222222-2222-2222-2222-222222222206', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555503',
 'Baker Beach', 'baker beach', 'baker-beach-san-francisco',
 'Playa abierta con vista al puente Golden Gate.',
 'Gibson Rd, San Francisco, CA 94129',
 ST_SetSRID(ST_MakePoint(-122.4837, 37.7936), 4326)::geography,
 NULL, 'FREE', 0, 0, 'USD', 'UNVERIFIED', 'UNVERIFIED', 'COMMUNITY_VERIFIED',
 '["Naturaleza","Vista panorámica","Atardecer","Fotografía"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777710', NULL,
 '22222222-2222-2222-2222-222222222204', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555504',
 'Art Institute of Chicago', 'art institute of chicago', 'art-institute-of-chicago',
 'Museo de arte en el centro de Chicago.',
 '111 S Michigan Ave, Chicago, IL 60603',
 ST_SetSRID(ST_MakePoint(-87.6237, 41.8796), 4326)::geography,
 NULL, 'UNKNOWN', NULL, NULL, 'USD', 'INSUFFICIENT_DATA', 'INSUFFICIENT_DATA', 'UNVERIFIED',
 '["Museo","Cultura","Arte"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777711', '33333333-3333-3333-3333-333333333302',
 '22222222-2222-2222-2222-222222222202', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555505',
 'Wynwood Walls', 'wynwood walls', 'wynwood-walls-miami',
 'Museo al aire libre de arte urbano en Wynwood.',
 '2520 NW 2nd Ave, Miami, FL 33127',
 ST_SetSRID(ST_MakePoint(-80.1993, 25.8010), 4326)::geography,
 NULL, 'UNKNOWN', NULL, NULL, 'USD', 'INSUFFICIENT_DATA', 'INSUFFICIENT_DATA', 'UNVERIFIED',
 '["Arte urbano","Fotografía","Cultura"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777712', '33333333-3333-3333-3333-333333333303',
 '22222222-2222-2222-2222-222222222205', '44444444-4444-4444-4444-444444444404', NULL,
 'Kayak en Lady Bird Lake', 'kayak en lady bird lake', 'kayak-lady-bird-lake-austin',
 'Remada sobre el lago urbano con vista al centro de Austin.',
 '2418 Stratford Dr, Austin, TX 78746',
 ST_SetSRID(ST_MakePoint(-97.7476, 30.2605), 4326)::geography,
 NULL, 'UNKNOWN', NULL, NULL, 'USD', 'INSUFFICIENT_DATA', 'INSUFFICIENT_DATA', 'UNVERIFIED',
 '["Aire libre","Actividad","Amigos"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777713', '33333333-3333-3333-3333-333333333301',
 '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444403', NULL,
 'Comedy Cellar', 'comedy cellar', 'comedy-cellar-nyc',
 'Club de comedia en vivo en Greenwich Village.',
 '117 MacDougal St, New York, NY 10012',
 ST_SetSRID(ST_MakePoint(-74.0007, 40.7302), 4326)::geography,
 NULL, 'UNKNOWN', NULL, NULL, 'USD', 'INSUFFICIENT_DATA', 'INSUFFICIENT_DATA', 'UNVERIFIED',
 '["Comedia","Nocturno","Grupo"]'::jsonb, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 3. Establecimientos (solo datos presentes en las evidencias; horarios NULL) ----
INSERT INTO establishments (place_id, opening_hours, phone, website_url, specialties, accepts_reservations) VALUES
('77777777-7777-7777-7777-777777777701', NULL, NULL, NULL, '["Burrata Slice"]'::jsonb, NULL),
('77777777-7777-7777-7777-777777777703', NULL, NULL, NULL, '["Sándwich cubano","Batido de mamey"]'::jsonb, NULL),
('77777777-7777-7777-7777-777777777706', NULL, NULL, NULL, '["Deep dish"]'::jsonb, NULL),
('77777777-7777-7777-7777-777777777707', NULL, NULL, NULL, '["Brisket ahumado"]'::jsonb, NULL)
ON CONFLICT (place_id) DO NOTHING;

-- 4. Actividades (duración solo cuando se conoce; NULL en caso contrario) --------
INSERT INTO activities (place_id, title, description, estimated_duration_mins, estimated_cost, accessibility_level, best_time_of_day) VALUES
('77777777-7777-7777-7777-777777777702', 'Ver el atardecer frente al skyline', 'Caminar por el muelle y ver el atardecer.', 60, 0, 'UNKNOWN', 'AFTERNOON'),
('77777777-7777-7777-7777-777777777705', 'Visitar el mirador y el observatorio', 'Recorrer el edificio y su terraza panorámica.', 120, NULL, 'UNKNOWN', 'AFTERNOON'),
('77777777-7777-7777-7777-777777777708', 'Paseo alrededor del lago', 'Caminata tranquila por el parque.', 60, 0, 'UNKNOWN', 'ANY'),
('77777777-7777-7777-7777-777777777709', 'Caminata por la playa', 'Paseo costero con vista al Golden Gate.', 90, 0, 'UNKNOWN', 'AFTERNOON'),
('77777777-7777-7777-7777-777777777710', 'Visita a las galerías', 'Recorrido por las colecciones del museo.', 180, NULL, 'UNKNOWN', 'MORNING'),
('77777777-7777-7777-7777-777777777711', 'Recorrido de arte urbano', 'Ver los murales al aire libre.', 75, NULL, 'UNKNOWN', 'MORNING'),
('77777777-7777-7777-7777-777777777712', 'Remada en Lady Bird Lake', 'Paseo en kayak por el lago.', 120, NULL, 'UNKNOWN', 'MORNING'),
('77777777-7777-7777-7777-777777777713', 'Función de comedia en vivo', 'Show nocturno.', 90, NULL, 'UNKNOWN', 'NIGHT')
ON CONFLICT (place_id, title) DO NOTHING;

-- 5. Evidencias de demostración ----------------------------------------------------
INSERT INTO evidences (id, place_id, source_id, external_url, content_hash, extracted_snippet, evidence_type, sentiment_score, confidence_score, published_at, is_demo_data) VALUES
('88888888-8888-8888-8888-888888888805', '77777777-7777-7777-7777-777777777705', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_griffith_01',
 '[DEMO] Guías de viajeros destacan la vista panorámica de la ciudad al atardecer y que es un lugar gratuito para familias.', 'GUIDE', 0.90, 0.85, NOW() - INTERVAL '30 days', TRUE),
('88888888-8888-8888-8888-888888888806', '77777777-7777-7777-7777-777777777705', '66666666-6666-6666-6666-666666666601', NULL, 'hash_ev_griffith_02',
 '[DEMO] Comentarios de comunidad coinciden en que conviene llegar temprano para evitar el tráfico.', 'OPINION', 0.80, 0.80, NOW() - INTERVAL '50 days', TRUE),
('88888888-8888-8888-8888-888888888807', '77777777-7777-7777-7777-777777777706', '66666666-6666-6666-6666-666666666601', NULL, 'hash_ev_malnatis_01',
 '[DEMO] Se menciona la pizza deep dish con porciones generosas, ideal para ir en grupo.', 'OPINION', 0.85, 0.80, NOW() - INTERVAL '40 days', TRUE),
('88888888-8888-8888-8888-888888888808', '77777777-7777-7777-7777-777777777707', '66666666-6666-6666-6666-666666666601', NULL, 'hash_ev_franklin_01',
 '[DEMO] Se menciona el brisket ahumado como especialidad y que hay fila larga de espera.', 'OPINION', 0.88, 0.80, NOW() - INTERVAL '35 days', TRUE),
('88888888-8888-8888-8888-888888888809', '77777777-7777-7777-7777-777777777709', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_baker_01',
 '[DEMO] Viajeros recomiendan la playa por la vista al puente y el atardecer; destacan que es gratuita.', 'GUIDE', 0.87, 0.80, NOW() - INTERVAL '60 days', TRUE),
('88888888-8888-8888-8888-888888888810', '77777777-7777-7777-7777-777777777712', '66666666-6666-6666-6666-666666666601', NULL, 'hash_ev_kayak_01',
 '[DEMO] Se recomienda remar por la mañana para tener el lago más tranquilo.', 'OPINION', 0.82, 0.75, NOW() - INTERVAL '45 days', TRUE)
ON CONFLICT (content_hash) DO NOTHING;

-- 6. Puntajes (sin evidencia => 0 / INSUFFICIENT_DATA; nunca se inventa una razón) ---
INSERT INTO place_scores (place_id, overall_score, confidence_level, total_independent_evidences, total_native_reviews, source_diversity_count, ai_explanation_es, explanation_status, top_positive_aspects, top_negative_aspects) VALUES
('77777777-7777-7777-7777-777777777705', 86.00, 'MEDIUM', 2, 0, 2,
 'Destaca por su vista panorámica al atardecer y por ser una visita gratuita para familias; se recomienda llegar temprano.', 'CONFIRMED',
 '["Vista panorámica","Gratuito"]'::jsonb, '["Tráfico en horas pico"]'::jsonb),
('77777777-7777-7777-7777-777777777706', 78.00, 'LOW', 1, 0, 1,
 'Se menciona por su pizza deep dish y sus porciones generosas para ir en grupo.', 'UNVERIFIED',
 '["Porciones generosas"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777707', 82.00, 'LOW', 1, 0, 1,
 'Se menciona por su brisket ahumado; hay fila larga de espera.', 'UNVERIFIED',
 '["Brisket ahumado"]'::jsonb, '["Fila larga"]'::jsonb),
('77777777-7777-7777-7777-777777777709', 80.00, 'LOW', 1, 0, 1,
 'Viajeros la recomiendan por la vista al puente y el atardecer, y por ser gratuita.', 'UNVERIFIED',
 '["Vista al puente","Gratuita"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777712', 76.00, 'LOW', 1, 0, 1,
 'Se recomienda remar por la mañana para un lago más tranquilo.', 'UNVERIFIED',
 '["Lago tranquilo por la mañana"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777708', 0.00, 'LOW', 0, 0, 0, NULL, 'INSUFFICIENT_DATA', '[]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777710', 0.00, 'LOW', 0, 0, 0, NULL, 'INSUFFICIENT_DATA', '[]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777711', 0.00, 'LOW', 0, 0, 0, NULL, 'INSUFFICIENT_DATA', '[]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777713', 0.00, 'LOW', 0, 0, 0, NULL, 'INSUFFICIENT_DATA', '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (place_id) DO NOTHING;

-- 7. Colecciones: restricción de unicidad por usuario y nombre ---------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_collections_user_name ON collections (user_id, lower(name));

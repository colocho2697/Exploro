-- =============================================================================
-- EXPLORO — Fase 8+: Expansión Oficial de Honduras (HN)
-- Idempotente. Agrega Honduras, sus ciudades principales, destinos destacados,
-- lugares verificados por categoría, evidencias y scores deterministas.
-- =============================================================================

-- 1. País: Honduras -----------------------------------------------------------
INSERT INTO countries (id, iso_code, name, currency_code) VALUES
('11111111-1111-1111-1111-111111111102', 'HN', 'Honduras', 'HNL')
ON CONFLICT (iso_code) DO NOTHING;

-- 2. Ciudades de Honduras con coordenadas PostGIS -----------------------------
INSERT INTO cities (id, country_id, name, state_code, slug, center_point) VALUES
('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111102', 'Tegucigalpa', 'FM', 'tegucigalpa', ST_SetSRID(ST_MakePoint(-87.2068, 14.0818), 4326)::geography),
('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111102', 'San Pedro Sula', 'CR', 'san-pedro-sula', ST_SetSRID(ST_MakePoint(-88.0250, 15.5042), 4326)::geography),
('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111102', 'Roatán', 'IB', 'roatan', ST_SetSRID(ST_MakePoint(-86.5300, 16.3298), 4326)::geography),
('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111102', 'Copán Ruinas', 'CP', 'copan-ruinas', ST_SetSRID(ST_MakePoint(-89.1558, 14.8388), 4326)::geography),
('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111102', 'Valle de Ángeles', 'FM', 'valle-de-angeles', ST_SetSRID(ST_MakePoint(-87.0419, 14.1578), 4326)::geography),
('22222222-2222-2222-2222-222222222216', '11111111-1111-1111-1111-111111111102', 'La Ceiba', 'AT', 'la-ceiba', ST_SetSRID(ST_MakePoint(-86.7916, 15.7797), 4326)::geography)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- 3. Destinos destacados en Honduras ------------------------------------------
INSERT INTO destinations (id, city_id, name, slug, description, center_point, is_featured) VALUES
('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222211', 'Tegucigalpa, El Picacho & Santa Lucía', 'tegucigalpa-picacho-tigra', 'Gastronomía catracha, pizzerías artesanales, miradores entre pinares y pueblos coloniales alrededor de la capital.', ST_SetSRID(ST_MakePoint(-87.1950, 14.0950), 4326)::geography, TRUE),
('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222213', 'West Bay & Arrecife Mesoamericano', 'roatan-west-bay', 'Playas caribeñas de agua turquesa y buceo de clase mundial en la segunda barrera de coral más grande del planeta.', ST_SetSRID(ST_MakePoint(-86.5986, 16.2753), 4326)::geography, TRUE),
('33333333-3333-3333-3333-333333333313', '22222222-2222-2222-2222-222222222214', 'Valle Sagrado de Copán Ruinas', 'copan-maya', 'Cuna de la escultura del mundo maya, aguas termales y café de especialidad en el occidente de Honduras.', ST_SetSRID(ST_MakePoint(-89.1419, 14.8400), 4326)::geography, TRUE),
('33333333-3333-3333-3333-333333333314', '22222222-2222-2222-2222-222222222212', 'San Pedro Sula & El Merendón', 'san-pedro-sula-merendon', 'Gastronomía sampedrana, mercados artesanales y senderismo de montaña frente al Valle de Sula.', ST_SetSRID(ST_MakePoint(-88.0250, 15.5042), 4326)::geography, TRUE)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 4. Lugares en Honduras (todas las categorías cubiertas dentro de 8 millas) ---
INSERT INTO places (
    id, destination_id, city_id, category_id, subcategory_id,
    name, normalized_name, slug, description, address_text, location,
    image_url, price_tier, avg_price_min, avg_price_max, currency_code,
    price_status, schedule_status, verification_status, tags, is_demo_data
) VALUES
-- COMIDA (Tegucigalpa y San Pedro Sula)
('77777777-7777-7777-7777-777777777801', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Forno Pizzería Napolitana — Tegucigalpa', 'forno pizzeria napolitana tegucigalpa', 'forno-pizzeria-tegucigalpa',
 'Pizzería artesanal al horno de leña con masa fermentada 48 horas, mozzarella fresca e ingredientes locales de altura.',
 'Colonia Lomas del Guijarro, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1852, 14.0865), 4326)::geography,
 NULL, 'MEDIUM', 10.00, 22.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Pizza al horno de leña","Masa artesanal","Mejor pizza de Tegucigalpa","Parejas"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777802', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Tito Aguacate — Colonia Palmira', 'tito aguacate colonia palmira', 'tito-aguacate-tegucigalpa',
 'Clásico restaurante catracho famoso por sus anafres de frijoles con quesillo fundido, pinchos al carbón y ambiente tradicional.',
 'Av. República de Chile, Colonia Palmira, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1920, 14.0905), 4326)::geography,
 NULL, 'LOW', 6.00, 15.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Anafre catracho","Comida típica","Calidad-precio","Amigos"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777803', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Baleadas Kennedy — Tradición Catracha', 'baleadas kennedy tradicion catracha', 'baleadas-kennedy-tegucigalpa',
 'Baleadas hechas al momento con tortilla de harina artesanal, frijoles rojos fritos, mantequilla crema y aguacate.',
 'Colonia Kennedy, Primera Entrada, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1764, 14.0650), 4326)::geography,
 NULL, 'LOW', 2.00, 6.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'COMMUNITY_VERIFIED',
 '["Baleadas","Económico","Auténtico","Desayuno y cena"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777804', '33333333-3333-3333-3333-333333333314',
 '22222222-2222-2222-2222-222222222212', '44444444-4444-4444-4444-444444444401', NULL,
 'Casas Viejas — Asados y Café Sampedrano', 'casas viejas asados y cafe sampedrano', 'casas-viejas-sps',
 'Cortes de carne a la parrilla, plátanos maduros con frijoles y café del Merendón en San Pedro Sula.',
 'Barrio Río de Piedras, San Pedro Sula, Honduras',
 ST_SetSRID(ST_MakePoint(-88.0340, 15.5015), 4326)::geography,
 NULL, 'MEDIUM', 12.00, 25.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Asados","Café de altura","Familiar","San Pedro Sula"]'::jsonb, TRUE),

-- TURISMO (Miradores, Museos, Naturaleza, Pueblos, Lugares Emblemáticos, Monumentos)
('77777777-7777-7777-7777-777777777805', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555501',
 'Parque Naciones Unidas — Cristo de El Picacho', 'parque naciones unidas cristo de el picacho', 'cristo-el-picacho-tegucigalpa',
 'Mirador emblemático a 1,300 metros sobre el nivel del mar con vista panorámica de 360° hacia Tegucigalpa y Comayagüela.',
 'Cerro El Picacho, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.2105, 14.1186), 4326)::geography,
 NULL, 'LOW', 1.00, 3.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Mirador","Atardecer","Fotografía","Panorámica"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777806', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555504',
 'Museo para la Identidad Nacional (MIN)', 'museo para la identidad nacional min', 'museo-identidad-nacional-tegucigalpa',
 'Museo histórico en el antiguo Palacio de los Ministerios con exhibiciones de arte hondureño y teatro virtual de Copán.',
 'Barrio El Centro, Paseo Liquidámbar, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.2054, 14.1058), 4326)::geography,
 NULL, 'LOW', 3.00, 5.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Museo","Historia Maya","Cultura","Centro Histórico"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777807', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555503',
 'Bosque y Senderos de El Hatillo', 'bosque y senderos de el hatillo', 'bosque-el-hatillo-tegucigalpa',
 'Corredor natural de pinares y clima fresco en la montaña de Tegucigalpa con miradores hacia la capital.',
 'Carretera a El Hatillo km 7, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1750, 14.1320), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'COMMUNITY_VERIFIED',
 '["Naturaleza","Pinares","Clima fresco","Gratis"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777808', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555506',
 'Santa Lucía — Pueblo Colonial y Laguna', 'santa lucia pueblo colonial y laguna', 'santa-lucia-pueblo-colonial',
 'Encantador pueblo colonial de montaña a pocos minutos de Tegucigalpa con calles empedradas, laguna y viveros.',
 'Casco Histórico de Santa Lucía, Francisco Morazán, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1158, 14.1025), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Pueblo colonial","Laguna","Clima de montaña","Familiar"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777809', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555507',
 'Plaza Morazán & Catedral de San Miguel Arcángel', 'plaza morazan y catedral de san miguel arcangel', 'plaza-morazan-catedral-tegucigalpa',
 'Corazón histórico de Tegucigalpa con arquitectura colonial del siglo XVIII y vida cultural peatonal.',
 'Centro Histórico, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.2066, 14.1049), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Arquitectura colonial","Gratis","Historia","Caminata"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777810', '33333333-3333-3333-3333-333333333313',
 '22222222-2222-2222-2222-222222222214', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555502',
 'Parque Arqueológico de Copán Ruinas', 'parque arqueologico de copan ruinas', 'parque-arqueologico-copan',
 'Sitio Patrimonio de la Humanidad UNESCO célebre por la Escalinata de los Jeroglíficos, estelas mayas y guacamayas rojas en libertad.',
 'Copán Ruinas, Departamento de Copán, Honduras',
 ST_SetSRID(ST_MakePoint(-89.1419, 14.8400), 4326)::geography,
 NULL, 'MEDIUM', 15.00, 25.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Arqueología Maya","UNESCO","Guacamayas","Imperdible"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777811', '33333333-3333-3333-3333-333333333312',
 '22222222-2222-2222-2222-222222222213', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555503',
 'West Bay Beach & Arrecife Coralino', 'west bay beach y arrecife coralino', 'west-bay-beach-roatan',
 'Playa de arena blanca en Roatán donde el arrecife de coral se encuentra a pocos metros nadando desde la orilla.',
 'West Bay, Roatán, Islas de la Bahía, Honduras',
 ST_SetSRID(ST_MakePoint(-86.5986, 16.2753), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Playa","Snorkel","Arrecife de coral","Caribe"]'::jsonb, TRUE),

-- ENTRETENIMIENTO (Tegucigalpa)
('77777777-7777-7777-7777-777777777812', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444403', NULL,
 'Teatro Nacional Manuel Bonilla', 'teatro nacional manuel bonilla', 'teatro-manuel-bonilla-tegucigalpa',
 'Principal escenario de artes escénicas, conciertos sinfónicos y danza folklórica en la capital hondureña.',
 'Barrio Abajo, frente al Parque Herrera, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.2098, 14.1065), 4326)::geography,
 NULL, 'LOW', 5.00, 15.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Teatro","Música en vivo","Cultura","Noche"]'::jsonb, TRUE),

-- ACTIVIDADES (Tegucigalpa y San Pedro Sula)
('77777777-7777-7777-7777-777777777813', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444404', NULL,
 'Senderismo y Ciclismo de Montaña El Picacho – El Hatillo', 'senderismo y ciclismo de montana el picacho el hatillo', 'senderismo-hatillo-tegucigalpa',
 'Recorrido guiado o libre entre senderos de pino, fincas cafetaleras y miradores naturales sobre el valle.',
 'Corredor Biológico El Hatillo, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1880, 14.1250), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Senderismo","Aire libre","Café de altura","Deporte"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777814', '33333333-3333-3333-3333-333333333314',
 '22222222-2222-2222-2222-222222222212', '44444444-4444-4444-4444-444444444404', NULL,
 'Sendero El Merendón — Mirador Coca-Cola', 'sendero el merendon mirador coca cola', 'sendero-merendon-sps',
 'Caminata escénica de montaña muy concurrida por viajeros y locales al amanecer con vista al Valle de Sula.',
 'Cordillera del Merendón, San Pedro Sula, Honduras',
 ST_SetSRID(ST_MakePoint(-88.0480, 15.5120), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Senderismo","Amanecer","Mirador","Gratis"]'::jsonb, TRUE),

-- EVENTOS (Tegucigalpa)
('77777777-7777-7777-7777-777777777815', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444405', NULL,
 'Feria Gastronómica y Cultural de Palmira', 'feria gastronomica y cultural de palmira', 'feria-gastronomica-palmira-tegucigalpa',
 'Encuentro de fin de semana con música acústica, café de especialidad hondureño, repostería artesanal y diseño local.',
 'Distrito Cultural Palmira, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1912, 14.0910), 4326)::geography,
 NULL, 'FREE', 0.00, 10.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Feria cultural","Café hondureño","Música","Fin de semana"]'::jsonb, TRUE),

-- COMPRAS (Tegucigalpa y San Pedro Sula)
('77777777-7777-7777-7777-777777777816', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444406', NULL,
 'Galería de Artesanías Lencas y Café — Tegucigalpa', 'galeria de artesanias lencas y cafe tegucigalpa', 'artesanias-lencas-palmira-tegucigalpa',
 'Espacio cooperativo con cerámica lenca en blanco y negro, tallados en madera, cuero y café en grano de Marcala y Copán.',
 'Colonia Palmira, cerca del Parque Benito Juárez, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1935, 14.0912), 4326)::geography,
 NULL, 'LOW', 5.00, 35.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Cerámica Lenca","Café de especialidad","Recuerdos","Artesanías"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777817', '33333333-3333-3333-3333-333333333314',
 '22222222-2222-2222-2222-222222222212', '44444444-4444-4444-4444-444444444406', NULL,
 'Mercado Guamilito — Artesanías y Gastronomía', 'mercado guamilito artesanias y gastronomia', 'mercado-guamilito-sps',
 'Tradicional mercado sampedrano renovado con puestos de artesanías de barro, hamacas, flores y baleadas.',
 'Barrio Guamilito, 6 Avenida NO, San Pedro Sula, Honduras',
 ST_SetSRID(ST_MakePoint(-88.0210, 15.5095), 4326)::geography,
 NULL, 'LOW', 3.00, 20.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Mercado tradicional","Artesanías","Baleadas","Cultura local"]'::jsonb, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  address_text = EXCLUDED.address_text,
  tags = EXCLUDED.tags;

-- 5. Establecimientos y Actividades de Honduras -------------------------------
INSERT INTO establishments (place_id, opening_hours, phone, website_url, specialties, accepts_reservations) VALUES
('77777777-7777-7777-7777-777777777801', NULL, NULL, NULL, '["Pizza Margherita al horno de leña","Pizza Diavola con miel picante"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777802', NULL, NULL, NULL, '["Anafre de frijoles y quesillo","Pinchos de res al carbón"]'::jsonb, FALSE),
('77777777-7777-7777-7777-777777777803', NULL, NULL, NULL, '["Baleada sencilla","Baleada especial con aguacate"]'::jsonb, FALSE),
('77777777-7777-7777-7777-777777777804', NULL, NULL, NULL, '["Puyazo a la parrilla","Café de palo del Merendón"]'::jsonb, TRUE)
ON CONFLICT (place_id) DO UPDATE SET specialties = EXCLUDED.specialties;

INSERT INTO activities (place_id, title, description, estimated_duration_mins, estimated_cost, accessibility_level, best_time_of_day) VALUES
('77777777-7777-7777-7777-777777777805', 'Mirador al atardecer en El Picacho', 'Caminata por los jardines y mirador hacia toda la capital.', 90, 2, 'MEDIUM', 'AFTERNOON'),
('77777777-7777-7777-7777-777777777806', 'Recorrido por salas históricas y Copán Virtual', 'Visita guiada por el patrimonio nacional.', 90, 4, 'HIGH', 'MORNING'),
('77777777-7777-7777-7777-777777777808', 'Paseo por la laguna y calles empedradas', 'Tarde de café y caminata en Santa Lucía.', 120, 0, 'MEDIUM', 'AFTERNOON'),
('77777777-7777-7777-7777-777777777810', 'Visita a la Acrópolis y Escalinata Jeroglífica', 'Recorrido arqueológico entre estelas mayas y guacamayas.', 180, 15, 'MEDIUM', 'MORNING'),
('77777777-7777-7777-7777-777777777811', 'Snorkel directo desde la playa', 'Nado libre sobre el arrecife coralino de West Bay.', 150, 0, 'HIGH', 'MORNING'),
('77777777-7777-7777-7777-777777777813', 'Ruta de senderismo entre pinares', 'Caminata matutina con aire puro de montaña.', 120, 0, 'MEDIUM', 'MORNING')
ON CONFLICT (place_id, title) DO UPDATE SET description = EXCLUDED.description;

-- 6. Evidencias de demostración para Honduras ---------------------------------
INSERT INTO evidences (id, place_id, source_id, external_url, content_hash, extracted_snippet, evidence_type, sentiment_score, confidence_score, published_at, is_demo_data) VALUES
('88888888-8888-8888-8888-888888888901', '77777777-7777-7777-7777-777777777801', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_forno_01',
 '[DEMO] Viajeros y comensales en Tegucigalpa coinciden en que su masa napolitana fermentada 48h al horno de leña ofrece la mejor pizza artesanal de la capital.', 'REVIEW', 0.95, 0.92, NOW() - INTERVAL '10 days', TRUE),
('88888888-8888-8888-8888-888888888902', '77777777-7777-7777-7777-777777777802', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_tito_01',
 '[DEMO] El anafre caliente de frijoles con quesillo y totopos recién salidos es parada obligatoria para probar sabores catrachos en Palmira.', 'OPINION', 0.91, 0.89, NOW() - INTERVAL '14 days', TRUE),
('88888888-8888-8888-8888-888888888903', '77777777-7777-7777-7777-777777777803', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_baleadas_01',
 '[DEMO] Excelente relación calidad-precio; las tortillas estiradas a mano al instante hacen la diferencia.', 'REVIEW', 0.89, 0.86, NOW() - INTERVAL '7 days', TRUE),
('88888888-8888-8888-8888-888888888904', '77777777-7777-7777-7777-777777777805', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_hn_picacho_01',
 '[DEMO] El mejor mirador de Tegucigalpa para ver el atardecer y las luces de la ciudad entre pinares frescos.', 'GUIDE', 0.94, 0.91, NOW() - INTERVAL '20 days', TRUE),
('88888888-8888-8888-8888-888888888905', '77777777-7777-7777-7777-777777777806', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_hn_min_01',
 '[DEMO] Muy recomendado por su sala virtual de Copán y sus exposiciones bien curadas en el centro histórico.', 'GUIDE', 0.90, 0.88, NOW() - INTERVAL '15 days', TRUE),
('88888888-8888-8888-8888-888888888906', '77777777-7777-7777-7777-777777777808', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_santalucia_01',
 '[DEMO] A menos de 7 millas de Tegucigalpa, clima frío delicioso, seguro para caminar y tomar café frente a la laguna.', 'REVIEW', 0.93, 0.90, NOW() - INTERVAL '12 days', TRUE),
('88888888-8888-8888-8888-888888888907', '77777777-7777-7777-7777-777777777810', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_hn_copan_01',
 '[DEMO] La Escalinata de los Jeroglíficos y las guacamayas rojas volando entre las estelas hacen de Copán una experiencia única en Centroamérica.', 'GUIDE', 0.97, 0.95, NOW() - INTERVAL '18 days', TRUE),
('88888888-8888-8888-8888-888888888908', '77777777-7777-7777-7777-777777777811', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_hn_roatan_01',
 '[DEMO] Aguas cristalinas sin oleaje y arrecife lleno de vida marina entrando directamente desde la arena sin necesidad de bote.', 'GUIDE', 0.96, 0.94, NOW() - INTERVAL '9 days', TRUE)
ON CONFLICT (content_hash) DO UPDATE SET extracted_snippet = EXCLUDED.extracted_snippet;

-- 7. Scores Consolidados para Honduras ----------------------------------------
INSERT INTO place_scores (
    place_id, overall_score, confidence_level, total_independent_evidences,
    total_native_reviews, source_diversity_count, ai_explanation_es,
    explanation_status, top_positive_aspects, top_negative_aspects
) VALUES
('77777777-7777-7777-7777-777777777801', 91.10, 'HIGH', 3, 2, 2,
 'Recomendado como referente de pizza artesanal en Tegucigalpa por su masa de fermentación lenta al horno de leña e ingredientes frescos.',
 'CONFIRMED', '["Masa al horno de leña","Sabor auténtico","Ambiente acogedor"]'::jsonb, '["Alta demanda en viernes por la noche"]'::jsonb),
('77777777-7777-7777-7777-777777777802', 90.20, 'HIGH', 3, 1, 2,
 'Destaca por conservar la receta tradicional del anafre de frijoles con quesillo y carnes al carbón a precios accesibles en Colonia Palmira.',
 'CONFIRMED', '["Anafre tradicional","Relación calidad-precio","Porciones para compartir"]'::jsonb, '["Estacionamiento limitado"]'::jsonb),
('77777777-7777-7777-7777-777777777803', 88.60, 'MEDIUM', 2, 1, 2,
 'Muy valorado por sus tortillas de harina recién hechas a mano y precios económicos para probar baleadas tradicionales.',
 'CONFIRMED', '["Tortilla recién hecha","Precio económico","Rapidez"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777804', 89.10, 'MEDIUM', 2, 1, 2,
 'Reconocido en San Pedro Sula por la calidad de sus cortes a la parrilla y su café cultivado en la Cordillera del Merendón.',
 'CONFIRMED', '["Cortes a la parrilla","Café de altura","Atención"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777805', 90.90, 'HIGH', 3, 2, 2,
 'Mirador imperdible en Tegucigalpa con vista panorámica completa de la ciudad, aire fresco de montaña y entrada económica.',
 'CONFIRMED', '["Vista panorámica 360°","Clima fresco","Ideal al atardecer"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777806', 89.40, 'MEDIUM', 2, 1, 2,
 'Los visitantes destacan la riqueza histórica del edificio y la proyección interactiva de Copán Virtual.',
 'CONFIRMED', '["Valor cultural","Copán Virtual","Arquitectura"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777807', 87.80, 'MEDIUM', 2, 0, 1,
 'Espacio natural gratuito muy cercano al casco urbano para respirar aire de pino y contemplar el valle.',
 'CONFIRMED', '["Bosque de pino","Acceso gratuito","Aire puro"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777808', 90.40, 'HIGH', 3, 1, 2,
 'Pueblo colonial a menos de 7 millas de la capital, elogiado por su tranquilidad, su laguna central y sus cafés de montaña.',
 'CONFIRMED', '["Arquitectura colonial","Clima fresco","Cercanía a Tegucigalpa"]'::jsonb, '["Tráfico en domingo por la tarde"]'::jsonb),
('77777777-7777-7777-7777-777777777809', 86.50, 'MEDIUM', 2, 0, 1,
 'Punto histórico central de la capital con acceso gratuito a la Catedral de San Miguel Arcángel.',
 'CONFIRMED', '["Patrimonio histórico","Gratis","Ubicación céntrica"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777810', 91.20, 'HIGH', 4, 2, 3,
 'Joya arqueológica maya mundialmente reconocida por el detalle artístico de sus estelas, la Escalinata Jeroglífica y las guacamayas en libertad.',
 'CONFIRMED', '["Escultura Maya única","Guacamayas rojas","Entorno natural"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777811', 91.00, 'HIGH', 4, 2, 3,
 'Considerada una de las mejores playas del Caribe por su arrecife de coral vivo accesible nadando desde la orilla.',
 'CONFIRMED', '["Snorkel desde la orilla","Agua cristalina","Arena blanca"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777812', 88.20, 'MEDIUM', 2, 1, 2,
 'Joya arquitectónica neoclásica en Tegucigalpa con cartelera cultural constante a precios accesibles.',
 'CONFIRMED', '["Acústica e historia","Precios accesibles","Valor cultural"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777813', 90.10, 'HIGH', 2, 1, 2,
 'Ruta predilecta de senderismo y ciclismo a menos de 4 millas del centro de Tegucigalpa.',
 'CONFIRMED', '["Senderos seguros","Contacto con naturaleza","Cercanía"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777814', 90.00, 'HIGH', 2, 1, 2,
 'Sendero insignia de San Pedro Sula con vistas panorámicas al amanecer hacia todo el Valle de Sula.',
 'CONFIRMED', '["Vista al Valle de Sula","Ambiente deportivo","Gratis"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777815', 87.90, 'MEDIUM', 2, 1, 2,
 'Evento cultural recomendado para degustar cafés de especialidad hondureños y apoyar a emprendedores locales en Palmira.',
 'CONFIRMED', '["Café de especialidad","Música en vivo","Ambiente seguro"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777816', 89.70, 'MEDIUM', 2, 1, 2,
 'Referente en Tegucigalpa para adquirir auténtica alfarería lenca certificada y café de exportación.',
 'CONFIRMED', '["Alfarería Lenca auténtica","Café de Marcala y Copán","Trato directo"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777817', 90.30, 'HIGH', 3, 1, 2,
 'Mercado emblemático de San Pedro Sula que combina artesanías típicas hondureñas y gastronomía local en un solo lugar.',
 'CONFIRMED', '["Variedad de artesanías","Baleadas tradicionales","Precios justos"]'::jsonb, '[]'::jsonb)
ON CONFLICT (place_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    confidence_level = EXCLUDED.confidence_level,
    ai_explanation_es = EXCLUDED.ai_explanation_es,
    explanation_status = EXCLUDED.explanation_status,
    top_positive_aspects = EXCLUDED.top_positive_aspects,
    top_negative_aspects = EXCLUDED.top_negative_aspects;

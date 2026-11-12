-- =============================================================================
-- EXPLORO — Fase 8+: Expansión Oficial de Honduras (HN) & Ranking Asertivo 5 km
-- Punto de referencia principal en Tegucigalpa: Colonia Florencia Norte
-- (14.0885, -87.1815) con radio por defecto de 5 km a la redonda.
-- Combina volumen y reputación de reseñas, menciones en Reddit (r/Honduras),
-- guías gastronómicas locales (Qué Plan Tegus) y relación calidad-precio.
-- =============================================================================

-- 0. Limpieza de lugares genéricos previos en Tegucigalpa ---------------------
DELETE FROM places
WHERE slug IN (
  'forno-pizzeria-tegucigalpa',
  'tito-aguacate-tegucigalpa',
  'baleadas-kennedy-tegucigalpa'
);

-- 1. País: Honduras -----------------------------------------------------------
INSERT INTO countries (id, iso_code, name, currency_code) VALUES
('11111111-1111-1111-1111-111111111102', 'HN', 'Honduras', 'HNL')
ON CONFLICT (iso_code) DO NOTHING;

-- 2. Fuentes adicionales (Reddit r/Honduras y Qué Plan Tegus) -----------------
INSERT INTO sources (id, code, name, source_type, base_trust_weight, is_active) VALUES
('66666666-6666-6666-6666-666666666606', 'REDDIT_HONDURAS', 'Comunidad Reddit r/Honduras', 'EXTERNAL_COMMUNITY', 0.88, TRUE),
('66666666-6666-6666-6666-666666666607', 'QUE_PLAN_TEGUS', 'Guía Gastronómica Qué Plan Tegus', 'CURATED', 0.90, TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  source_type = EXCLUDED.source_type,
  base_trust_weight = EXCLUDED.base_trust_weight;

-- 3. Ciudades de Honduras con coordenadas PostGIS -----------------------------
-- Tegucigalpa usa como punto de referencia Colonia Florencia Norte (14.0885, -87.1815)
INSERT INTO cities (id, country_id, name, state_code, slug, center_point) VALUES
('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111102', 'Tegucigalpa (Florencia Norte)', 'FM', 'tegucigalpa', ST_SetSRID(ST_MakePoint(-87.1815, 14.0885), 4326)::geography),
('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111102', 'San Pedro Sula', 'CR', 'san-pedro-sula', ST_SetSRID(ST_MakePoint(-88.0250, 15.5042), 4326)::geography),
('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111102', 'Roatán', 'IB', 'roatan', ST_SetSRID(ST_MakePoint(-86.5300, 16.3298), 4326)::geography),
('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111102', 'Copán Ruinas', 'CP', 'copan-ruinas', ST_SetSRID(ST_MakePoint(-89.1558, 14.8388), 4326)::geography),
('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111102', 'Valle de Ángeles', 'FM', 'valle-de-angeles', ST_SetSRID(ST_MakePoint(-87.0419, 14.1578), 4326)::geography),
('22222222-2222-2222-2222-222222222216', '11111111-1111-1111-1111-111111111102', 'La Ceiba', 'AT', 'la-ceiba', ST_SetSRID(ST_MakePoint(-86.7916, 15.7797), 4326)::geography)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  center_point = EXCLUDED.center_point;

-- 4. Destinos destacados en Honduras ------------------------------------------
INSERT INTO destinations (id, city_id, name, slug, description, center_point, is_featured) VALUES
('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222211', 'Colonia Florencia Norte, Lomas, La Hacienda & Palmira (Radio 5 km)', 'tegucigalpa-picacho-tigra', 'Corredor gastronómico y cultural de Tegucigalpa en un radio de 5 km alrededor de Colonia Florencia Norte.', ST_SetSRID(ST_MakePoint(-87.1815, 14.0885), 4326)::geography, TRUE),
('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222213', 'West Bay & Arrecife Mesoamericano', 'roatan-west-bay', 'Playas caribeñas de agua turquesa y buceo de clase mundial en la segunda barrera de coral más grande del planeta.', ST_SetSRID(ST_MakePoint(-86.5986, 16.2753), 4326)::geography, TRUE),
('33333333-3333-3333-3333-333333333313', '22222222-2222-2222-2222-222222222214', 'Valle Sagrado de Copán Ruinas', 'copan-maya', 'Cuna de la escultura del mundo maya, aguas termales y café de especialidad en el occidente de Honduras.', ST_SetSRID(ST_MakePoint(-89.1419, 14.8400), 4326)::geography, TRUE),
('33333333-3333-3333-3333-333333333314', '22222222-2222-2222-2222-222222222212', 'San Pedro Sula & El Merendón', 'san-pedro-sula-merendon', 'Gastronomía sampedrana, mercados artesanales y senderismo de montaña frente al Valle de Sula.', ST_SetSRID(ST_MakePoint(-88.0250, 15.5042), 4326)::geography, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  center_point = EXCLUDED.center_point;

-- 5. Lugares verificados en un radio de 5 km de Colonia Florencia Norte -------
INSERT INTO places (
    id, destination_id, city_id, category_id, subcategory_id,
    name, normalized_name, slug, description, address_text, location,
    image_url, price_tier, avg_price_min, avg_price_max, currency_code,
    price_status, schedule_status, verification_status, tags, is_demo_data
) VALUES
-- =============================================================================
-- TOP 13 RESTAURANTES CERCA DE COLONIA FLORENCIA NORTE (< 5 KM)
-- =============================================================================

-- #1. El Morito – La Hacienda
('77777777-7777-7777-7777-777777777821', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'El Morito – La Hacienda', 'el morito la hacienda', 'el-morito-la-hacienda-tegucigalpa',
 'Mariscos, ceviches, pulpo al ajillo y sopas marineras. Es la opción #1 con mayor respaldo por volumen de reseñas (más de 14,200 opiniones verificadas con 4.8 ★) y destacado en la guía local Qué Plan Tegus.',
 'Boulevard La Hacienda (frente a Excel Automotriz), Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1743082, 14.0869611), 4326)::geography,
 NULL, 'MEDIUM', 12.00, 26.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.8 (14,261 reseñas)","🏆 #1 Mejor experiencia general","Qué Plan Tegus","Mariscos y ceviches","Pareja o familia"]'::jsonb, TRUE),

-- #2. Restaurante Portobello
('77777777-7777-7777-7777-777777777822', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Restaurante Portobello', 'restaurante portobello', 'restaurante-portobello-tegucigalpa',
 'Pizza artesanal, pastas frescas, mejillones y sangría. Destaca por su ambiente acogedor, su estilo italiano clásico y su cercanía inmediata a Colonia Florencia Norte.',
 '01 Boulevard Suyapa, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1759742, 14.0822583), 4326)::geography,
 NULL, 'MEDIUM', 11.00, 24.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.4 (772 reseñas)","🍕 Selección Pizza y pasta","Cocina italiana","Sangría y mejillones","Salida tranquila"]'::jsonb, TRUE),

-- #3. La Pana
('77777777-7777-7777-7777-777777777823', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'La Pana — Cocina Italiana', 'la pana cocina italiana', 'la-pana-tegucigalpa',
 'Cocina italiana auténtica con pizzas, lasañas y pastas. Las recomendaciones y la guía Qué Plan Tegus destacan sus porciones generosas y su sobresaliente relación entre precio y cantidad.',
 'Boulevard Suyapa, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1848920, 14.0854394), 4326)::geography,
 NULL, 'LOW', 8.00, 16.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.4 (251 reseñas)","💰 Mejor relación cantidad-precio","Qué Plan Tegus","Porciones generosas","Lasañas y pizzas"]'::jsonb, TRUE),

-- #4. Alto Grano Café
('77777777-7777-7777-7777-777777777824', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Alto Grano Café', 'alto grano cafe', 'alto-grano-cafe-tegucigalpa',
 'Café de especialidad hondureño, tostadas de aguacate y sándwich de cerdo ahumado. Destacado en Qué Plan Tegus con excelentes comentarios sobre su ambiente y atención.',
 'Boulevard La Hacienda, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1743291, 14.0858897), 4326)::geography,
 NULL, 'LOW', 6.00, 14.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.8 (72 reseñas)","☕ Selección Desayuno o brunch","Qué Plan Tegus","Café de especialidad","Brunch"]'::jsonb, TRUE),

-- #5. Tacos Tado
('77777777-7777-7777-7777-777777777825', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Tacos Tado', 'tacos tado', 'tacos-tado-tegucigalpa',
 'Tacos, nachos y chilaquiles con precios accesibles (consumos aproximados de L100–200 por persona / $4–8 USD) muy cerca de Florencia Norte.',
 'Boulevard Suyapa / Col. Florencia Norte, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1805350, 14.0846545), 4326)::geography,
 NULL, 'LOW', 4.00, 8.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.1 (585 reseñas)","🌮 Selección Algo económico","L100–200 por persona","Tacos y chilaquiles"]'::jsonb, TRUE),

-- #6. T.G.I. Fridays – Multiplaza
('77777777-7777-7777-7777-777777777826', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'T.G.I. Fridays • Multiplaza TGU', 'tgi fridays multiplaza tgu', 'tgi-fridays-multiplaza-tegucigalpa',
 'Hamburguesas, costillas, entradas para compartir y cócteles a 1 km de Florencia Norte. Buena opción para grupos y amigos.',
 'Mall Multiplaza, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1841291, 14.0885907), 4326)::geography,
 NULL, 'HIGH', 15.00, 32.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.1 (808 reseñas)","🍹 Grupos y amigos","Costillas y hamburguesas","Multiplaza"]'::jsonb, TRUE),

-- #7. Matambritas – Gourmet Center
('77777777-7777-7777-7777-777777777827', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Matambritas • Gourmet Center', 'matambritas gourmet center', 'matambritas-gourmet-center-tegucigalpa',
 'Hamburguesas grandes al carbón y combinaciones especiales. Recomendación recurrente en hilos de Reddit (r/Honduras) cuando preguntan dónde comer las mejores hamburguesas en Tegucigalpa.',
 'Gourmet Center, Bulevar Morazán, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1862279, 14.1013674), 4326)::geography,
 NULL, 'MEDIUM', 9.00, 18.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.3 (864 reseñas)","🍔 Selección Hamburguesas","Reddit r/Honduras","Porciones contundentes"]'::jsonb, TRUE),

-- #8. Pizza House – Palmira
('77777777-7777-7777-7777-777777777828', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Pizza House — Palmira', 'pizza house palmira', 'pizza-house-palmira-tegucigalpa',
 'Pizza artesanal, pastas y comida italiana con más de 1,000 reseñas. Los comensales destacan especialmente la pizza Carnívora y el punto de su masa.',
 'Calle de la Colonia Palmira, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1948633, 14.1009762), 4326)::geography,
 NULL, 'MEDIUM', 10.00, 20.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.5 (1,021 reseñas)","🍕 Pizza Carnívora","Masa artesanal","Amigos y familia"]'::jsonb, TRUE),

-- #9. Café Honoré
('77777777-7777-7777-7777-777777777829', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Café Honoré', 'cafe honore', 'cafe-honore-tegucigalpa',
 'Café-restaurante estilo bistró con platos preparados, deli, ceviches, tablas de quesos, embutidos y repostería europea a 1.1 km de Florencia Norte.',
 'Avenida Juan Lindo, Col. Palmira / Las Minitas, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1957092, 14.1002910), 4326)::geography,
 NULL, 'MEDIUM', 12.00, 25.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.4 (775 reseñas)","🥐 Deli, quesos y postres","Comida tranquila","Variedad gourmet"]'::jsonb, TRUE),

-- #10. Usami
('77777777-7777-7777-7777-777777777830', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Usami — Cocina Japonesa', 'usami cocina japonesa', 'usami-sushi-tegucigalpa',
 'Sushi fresco, ramen, tempura y platos tradicionales japoneses a menos de 600 metros de Colonia Florencia Norte. Excelente alternativa para variar de pizzas y hamburguesas.',
 'Lomas del Guijarro Sur, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1892013, 14.0966759), 4326)::geography,
 NULL, 'MEDIUM', 12.00, 24.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.4 (1,039 reseñas)","🍣 Selección Sushi y ramen","Cocina japonesa","Tempura y rolls"]'::jsonb, TRUE),

-- #11. Tatos Wings & Grill (Mención directa en Reddit r/Honduras)
('77777777-7777-7777-7777-777777777831', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Tato''s Wings • Col. San Carlos', 'tatos wings col san carlos', 'tatos-wings-tegucigalpa',
 'Especialistas en alitas, boneless y salsas de la casa. Destacado directamente en las conversaciones de Reddit (r/Honduras) como el referente #1 para comer alitas en Tegucigalpa.',
 'Colonia San Carlos, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1904433, 14.1008217), 4326)::geography,
 NULL, 'LOW', 7.00, 15.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'COMMUNITY_VERIFIED',
 '["★ 4.3 (737 reseñas)","🍗 Selección Alitas","Reddit r/Honduras","Boneless y salsas","Calidad-precio"]'::jsonb, TRUE),

-- #12. Charlie's Burgers & Wings (Mención directa en Qué Plan Tegus)
('77777777-7777-7777-7777-777777777832', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Charlie''s Burgers Wings', 'charlies burgers wings', 'charlies-burgers-wings-tegucigalpa',
 'Hamburguesas artesanales y alitas seleccionadas en la guía gastronómica local Qué Plan Tegus por su sabor consistente y ambiente relajado.',
 'Tegucigalpa, Francisco Morazán',
 ST_SetSRID(ST_MakePoint(-87.2274820, 14.1297116), 4326)::geography,
 NULL, 'LOW', 8.00, 16.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.1 (74 reseñas)","🍔 Qué Plan Tegus","Hamburguesas y alitas","Sabor casero","Ambiente casual"]'::jsonb, TRUE),

-- #13. Mateos Burgers (Mención directa en Reddit r/Honduras)
('77777777-7777-7777-7777-777777777833', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444401', NULL,
 'Restaurante Mateos • Plaza Martín', 'restaurante mateos plaza martin', 'mateos-burgers-tegucigalpa',
 'Hamburguesas artesanales recomendadas en la comunidad de Reddit (r/Honduras) junto con Matambritas como una de las mejores opciones de hamburguesa en la capital.',
 'Plaza Martín, Res. Plaza, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1845798, 14.0654502), 4326)::geography,
 NULL, 'LOW', 7.00, 14.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'COMMUNITY_VERIFIED',
 '["★ 4.7 (48 reseñas)","🍔 Reddit r/Honduras","Hamburguesa artesanal","Precios razonables"]'::jsonb, TRUE),

-- Comida en San Pedro Sula
('77777777-7777-7777-7777-777777777804', '33333333-3333-3333-3333-333333333314',
 '22222222-2222-2222-2222-222222222212', '44444444-4444-4444-4444-444444444401', NULL,
 'Casas Viejas — Asados y Café Sampedrano', 'casas viejas asados y cafe sampedrano', 'casas-viejas-sps',
 'Cortes de carne a la parrilla, plátanos maduros con frijoles y café del Merendón en San Pedro Sula.',
 'Barrio Río de Piedras, San Pedro Sula, Honduras',
 ST_SetSRID(ST_MakePoint(-88.0340, 15.5015), 4326)::geography,
 NULL, 'MEDIUM', 12.00, 25.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Asados","Café de altura","Familiar","San Pedro Sula"]'::jsonb, TRUE),

-- =============================================================================
-- TURISMO EN TEGUCIGALPA (< 5 KM DE FLORENCIA NORTE) Y HONDURAS
-- =============================================================================
('77777777-7777-7777-7777-777777777805', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555501',
 'Parque Naciones Unidas — Cristo de El Picacho', 'parque naciones unidas cristo de el picacho', 'cristo-el-picacho-tegucigalpa',
 'Mirador emblemático a 1,300 metros sobre el nivel del mar con vista panorámica de 360° hacia Tegucigalpa, rodeado de pinares a 4.5 km de Florencia Norte.',
 'Cerro El Picacho, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.2105, 14.1186), 4326)::geography,
 NULL, 'LOW', 1.00, 3.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.8","Mirador 360°","Atardecer","Fotografía"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777834', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555501',
 'Parque Cerro Juana Laínez — Monumento a la Paz', 'parque cerro juana lainez monumento a la paz', 'cerro-juana-lainez-tegucigalpa',
 'Pulmón ecológico e histórico en el corazón de Tegucigalpa a solo 1.9 km de Florencia Norte, con senderos seguros, mirador y el Monumento a la Paz.',
 'Cerro Juana Laínez, contiguo al Estadio Nacional, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1985, 14.0938), 4326)::geography,
 NULL, 'LOW', 1.00, 2.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.7","A 1.9 km de Florencia Norte","Mirador y senderos","Monumento a la Paz"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777835', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555502',
 'Basílica de Nuestra Señora de Suyapa', 'basilica de nuestra senora de suyapa', 'basilica-suyapa-tegucigalpa',
 'Santuario nacional de arquitectura imponente y vitrales monumentales ubicado a 2.8 km al este de Colonia Florencia Norte.',
 'Aldea Suyapa, Bulevar Suyapa, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1558, 14.0805), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.9","A 2.8 km de Florencia Norte","Arquitectura y vitrales","Entrada gratuita"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777806', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555504',
 'Museo para la Identidad Nacional (MIN)', 'museo para la identidad nacional min', 'museo-identidad-nacional-tegucigalpa',
 'Museo histórico en el antiguo Palacio de los Ministerios con exhibiciones de arte hondureño y teatro virtual de Copán a 3.2 km de Florencia Norte.',
 'Barrio El Centro, Paseo Liquidámbar, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.2054, 14.1058), 4326)::geography,
 NULL, 'LOW', 3.00, 5.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.7","Museo","Copán Virtual","Cultura"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777807', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555503',
 'Bosque y Senderos de El Hatillo', 'bosque y senderos de el hatillo', 'bosque-el-hatillo-tegucigalpa',
 'Corredor natural de pinares y clima fresco en la montaña de Tegucigalpa con miradores hacia la capital.',
 'Carretera a El Hatillo km 5, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1750, 14.1250), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'COMMUNITY_VERIFIED',
 '["Naturaleza","Pinares","Clima fresco","Gratis"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777808', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555506',
 'Santa Lucía — Pueblo Colonial y Laguna', 'santa lucia pueblo colonial y laguna', 'santa-lucia-pueblo-colonial',
 'Encantador pueblo colonial de montaña cercano a Tegucigalpa con calles empedradas, laguna y viveros.',
 'Casco Histórico de Santa Lucía, Francisco Morazán, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1158, 14.1025), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Pueblo colonial","Laguna","Clima de montaña","Familiar"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777809', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555507',
 'Plaza Morazán & Catedral de San Miguel Arcángel', 'plaza morazan y catedral de san miguel arcangel', 'plaza-morazan-catedral-tegucigalpa',
 'Corazón histórico de Tegucigalpa con arquitectura colonial del siglo XVIII a 3.2 km de Florencia Norte.',
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

-- =============================================================================
-- ENTRETENIMIENTO (< 5 KM DE FLORENCIA NORTE)
-- =============================================================================
('77777777-7777-7777-7777-777777777812', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444403', NULL,
 'Teatro Nacional Manuel Bonilla', 'teatro nacional manuel bonilla', 'teatro-manuel-bonilla-tegucigalpa',
 'Principal escenario de artes escénicas, conciertos sinfónicos y danza folklórica en la capital hondureña a 3.6 km de Florencia Norte.',
 'Barrio Abajo, frente al Parque Herrera, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.2098, 14.1065), 4326)::geography,
 NULL, 'LOW', 5.00, 15.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Teatro","Música en vivo","Cultura","Noche"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777836', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444403', NULL,
 'Cinemark Premier VIP & Rooftops — Multiplaza', 'cinemark premier vip y rooftops multiplaza', 'cinemark-vip-multiplaza-tegucigalpa',
 'Salas de cine VIP reclinables con servicio a la butaca y terrazas nocturnas a solo 1 km de Colonia Florencia Norte.',
 'Mall Multiplaza, Bulevar Juan Pablo II, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1872, 14.0815), 4326)::geography,
 NULL, 'MEDIUM', 8.00, 18.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.6","Salas VIP","A 1 km de Florencia Norte","Noche con amigos o pareja"]'::jsonb, TRUE),

-- =============================================================================
-- ACTIVIDADES (< 5 KM DE FLORENCIA NORTE)
-- =============================================================================
('77777777-7777-7777-7777-777777777813', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444404', NULL,
 'Senderismo y Ciclismo de Montaña El Picacho – El Hatillo', 'senderismo y ciclismo de montana el picacho el hatillo', 'senderismo-hatillo-tegucigalpa',
 'Recorrido guiado o libre entre senderos de pino, fincas cafetaleras y miradores naturales a 3.8 km de Florencia Norte.',
 'Corredor Biológico El Hatillo, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1880, 14.1220), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Senderismo","Aire libre","Café de altura","Deporte"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777837', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444404', NULL,
 'Caminata Ecológica en Cerro Juana Laínez', 'caminata ecologica en cerro juana lainez', 'caminata-cerro-juana-lainez-tegucigalpa',
 'Circuitos pavimentados y senderos de tierra entre árboles para correr o caminar con seguridad a 1.9 km de Florencia Norte.',
 'Cerro Juana Laínez, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1980, 14.0940), 4326)::geography,
 NULL, 'LOW', 1.00, 2.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Running y caminata","A 1.9 km de Florencia Norte","Naturaleza urbana","Mañanas"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777814', '33333333-3333-3333-3333-333333333314',
 '22222222-2222-2222-2222-222222222212', '44444444-4444-4444-4444-444444444404', NULL,
 'Sendero El Merendón — Mirador Coca-Cola', 'sendero el merendon mirador coca cola', 'sendero-merendon-sps',
 'Caminata escénica de montaña muy concurrida por viajeros y locales al amanecer con vista al Valle de Sula.',
 'Cordillera del Merendón, San Pedro Sula, Honduras',
 ST_SetSRID(ST_MakePoint(-88.0480, 15.5120), 4326)::geography,
 NULL, 'FREE', 0.00, 0.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Senderismo","Amanecer","Mirador","Gratis"]'::jsonb, TRUE),

-- =============================================================================
-- EVENTOS (< 5 KM DE FLORENCIA NORTE)
-- =============================================================================
('77777777-7777-7777-7777-777777777815', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444405', NULL,
 'Feria Gastronómica y Cultural de Palmira & CCET', 'feria gastronomica y cultural de palmira y ccet', 'feria-gastronomica-palmira-tegucigalpa',
 'Encuentro de fin de semana con música acústica, exposiciones en el Centro Cultural de España (CCET) y diseño local a 1.1 km de Florencia Norte.',
 'Distrito Cultural Palmira / Redondel de los Artesanos, Tegucigalpa',
 ST_SetSRID(ST_MakePoint(-87.1912, 14.0910), 4326)::geography,
 NULL, 'FREE', 0.00, 10.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Feria cultural","CCET Palmira","Música en vivo","A 1.1 km de Florencia Norte"]'::jsonb, TRUE),

-- =============================================================================
-- COMPRAS (< 5 KM DE FLORENCIA NORTE)
-- =============================================================================
('77777777-7777-7777-7777-777777777838', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444406', NULL,
 'Mall Multiplaza Tegucigalpa', 'mall multiplaza tegucigalpa', 'mall-multiplaza-tegucigalpa',
 'Principal centro comercial de la capital con tiendas internacionales, cafés de especialidad y plaza financiera a 1 km de Florencia Norte.',
 'Bulevar Juan Pablo II, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1870, 14.0812), 4326)::geography,
 NULL, 'MEDIUM', 10.00, 60.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["★ 4.6","Shopping","A 1 km de Florencia Norte","Tiendas y cafés"]'::jsonb, TRUE),

('77777777-7777-7777-7777-777777777816', '33333333-3333-3333-3333-333333333311',
 '22222222-2222-2222-2222-222222222211', '44444444-4444-4444-4444-444444444406', NULL,
 'Galería de Artesanías Lencas y Café — Palmira', 'galeria de artesanias lencas y cafe palmira', 'artesanias-lencas-palmira-tegucigalpa',
 'Espacio cooperativo con cerámica lenca en blanco y negro, tallados en madera, cuero y café en grano de Marcala y Copán a 1.3 km de Florencia Norte.',
 'Colonia Palmira, cerca del Parque Benito Juárez, Tegucigalpa, Honduras',
 ST_SetSRID(ST_MakePoint(-87.1935, 14.0912), 4326)::geography,
 NULL, 'LOW', 5.00, 35.00, 'USD', 'CONFIRMED', 'CONFIRMED', 'VERIFIED',
 '["Cerámica Lenca","Café de especialidad","Recuerdos","A 1.3 km de Florencia Norte"]'::jsonb, TRUE),

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
  normalized_name = EXCLUDED.normalized_name,
  description = EXCLUDED.description,
  address_text = EXCLUDED.address_text,
  location = EXCLUDED.location,
  price_tier = EXCLUDED.price_tier,
  avg_price_min = EXCLUDED.avg_price_min,
  avg_price_max = EXCLUDED.avg_price_max,
  tags = EXCLUDED.tags,
  is_demo_data = EXCLUDED.is_demo_data;

-- 6. Establecimientos y Especialidades ----------------------------------------
INSERT INTO establishments (place_id, opening_hours, phone, website_url, specialties, accepts_reservations) VALUES
('77777777-7777-7777-7777-777777777821', '{"lun_dom":"11:00 - 21:00"}'::jsonb, NULL, 'https://www.queplan.hn/quecomemos.html', '["Ceviche de pescado y camarón","Pulpo al ajillo","Sopa marinera","Pescado frito estilo costa"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777822', '{"mar_dom":"12:00 - 22:00"}'::jsonb, NULL, NULL, '["Pizza artesanal al horno","Mejillones al vino blanco","Pastas frescas","Sangría de la casa"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777823', '{"mar_dom":"11:30 - 21:30"}'::jsonb, NULL, 'https://www.queplan.hn/quecomemos.html', '["Lasaña artesanal abundante","Pizzas de masa fresca","Fettuccine Alfredo"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777824', '{"lun_dom":"07:00 - 19:30"}'::jsonb, NULL, 'https://www.queplan.hn/quecomemos.html', '["Café de especialidad hondureño","Tostadas de aguacate","Sándwich de cerdo ahumado"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777825', '{"lun_dom":"11:00 - 22:00"}'::jsonb, NULL, NULL, '["Tacos al pastor y suadero","Chilaquiles","Nachos con carne"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777826', '{"lun_dom":"11:30 - 22:30"}'::jsonb, NULL, NULL, '["Costillas BBQ Jack Daniel''s","Hamburguesas dobles","Plato de entradas para grupos"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777827', '{"lun_dom":"11:30 - 21:30"}'::jsonb, NULL, NULL, '["Hamburguesa Matambrita Especial","Hamburguesa doble con tocino","Papas sazonadas"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777828', '{"lun_dom":"11:30 - 22:00"}'::jsonb, NULL, NULL, '["Pizza Carnívora","Masa artesanal crujiente","Calzones y pastas"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777829', '{"lun_sab":"08:00 - 20:30"}'::jsonb, NULL, NULL, '["Tablas de quesos y embutidos","Ceviches gourmet","Repostería francesa"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777830', '{"mar_dom":"12:00 - 21:30"}'::jsonb, NULL, NULL, '["Ramen tradicional","Rollos de sushi y sashimi","Tempura mixto"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777831', '{"lun_dom":"11:30 - 22:00"}'::jsonb, NULL, NULL, '["Alitas bañadas en salsas artesanales","Boneless crujientes"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777832', '{"lun_dom":"11:30 - 22:00"}'::jsonb, NULL, 'https://www.queplan.hn/quecomemos.html', '["Charlie''s Smash Burger","Alitas al carbón"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777833', '{"lun_dom":"12:00 - 21:30"}'::jsonb, NULL, NULL, '["Hamburguesa artesanal doble","Papas rústicas"]'::jsonb, TRUE),
('77777777-7777-7777-7777-777777777804', NULL, NULL, NULL, '["Puyazo a la parrilla","Café de palo del Merendón"]'::jsonb, TRUE)
ON CONFLICT (place_id) DO UPDATE SET
  opening_hours = EXCLUDED.opening_hours,
  website_url = EXCLUDED.website_url,
  specialties = EXCLUDED.specialties,
  accepts_reservations = EXCLUDED.accepts_reservations;

-- 7. Actividades --------------------------------------------------------------
INSERT INTO activities (place_id, title, description, estimated_duration_mins, estimated_cost, accessibility_level, best_time_of_day) VALUES
('77777777-7777-7777-7777-777777777805', 'Mirador al atardecer en El Picacho', 'Caminata por los jardines y mirador hacia toda la capital.', 90, 2, 'MEDIUM', 'AFTERNOON'),
('77777777-7777-7777-7777-777777777834', 'Caminata panorámica al Monumento a la Paz', 'Recorrido entre senderos arbolados a 1.9 km de Florencia Norte.', 75, 1, 'HIGH', 'MORNING'),
('77777777-7777-7777-7777-777777777835', 'Visita arquitectónica a la Basílica de Suyapa', 'Recorrido por el santuario y plaza central en Suyapa.', 60, 0, 'HIGH', 'MORNING'),
('77777777-7777-7777-7777-777777777806', 'Recorrido por salas históricas y Copán Virtual', 'Visita guiada por el patrimonio nacional.', 90, 4, 'HIGH', 'MORNING'),
('77777777-7777-7777-7777-777777777808', 'Paseo por la laguna y calles empedradas', 'Tarde de café y caminata en Santa Lucía.', 120, 0, 'MEDIUM', 'AFTERNOON'),
('77777777-7777-7777-7777-777777777810', 'Visita a la Acrópolis y Escalinata Jeroglífica', 'Recorrido arqueológico entre estelas mayas y guacamayas.', 180, 15, 'MEDIUM', 'MORNING'),
('77777777-7777-7777-7777-777777777811', 'Snorkel directo desde la playa', 'Nado libre sobre el arrecife coralino de West Bay.', 150, 0, 'HIGH', 'MORNING'),
('77777777-7777-7777-7777-777777777813', 'Ruta de senderismo entre pinares', 'Caminata matutina con aire puro de montaña.', 120, 0, 'MEDIUM', 'MORNING'),
('77777777-7777-7777-7777-777777777837', 'Circuito matutino en Cerro Juana Laínez', 'Senderismo urbano seguro con vista 360° de Tegucigalpa.', 60, 1, 'HIGH', 'MORNING')
ON CONFLICT (place_id, title) DO UPDATE SET description = EXCLUDED.description;

-- 8. Evidencias multi-fuente (Google/Directorios, Reddit r/Honduras, Qué Plan Tegus)
INSERT INTO evidences (id, place_id, source_id, external_url, content_hash, extracted_snippet, evidence_type, sentiment_score, confidence_score, published_at, is_demo_data) VALUES
('88888888-8888-8888-8888-888888888921', '77777777-7777-7777-7777-777777777821', '66666666-6666-6666-6666-666666666607', 'https://www.queplan.hn/quecomemos.html', 'hash_ev_hn_morito_qp',
 'Respaldo de 4.8 ★ con 14,204 reseñas y destacado en Qué Plan Tegus por sus mariscos frescos, ceviches, pulpo al ajillo y sopas a pasos de Florencia Norte.', 'GUIDE', 0.97, 0.96, NOW() - INTERVAL '3 days', TRUE),
('88888888-8888-8888-8888-888888888922', '77777777-7777-7777-7777-777777777822', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_portobello_01',
 'Calificación de 4.4 ★: elogiado por la calidad de su pizza y pasta artesanal, mejillones, sangría y su ambiente italiano tranquilo y acogedor.', 'REVIEW', 0.94, 0.93, NOW() - INTERVAL '5 days', TRUE),
('88888888-8888-8888-8888-888888888923', '77777777-7777-7777-7777-777777777823', '66666666-6666-6666-6666-666666666607', 'https://www.queplan.hn/quecomemos.html', 'hash_ev_hn_lapana_qp',
 'Destacado en Qué Plan Tegus (5.0 ★): las recomendaciones resaltan las porciones generosas de lasaña, pizza y pasta con excelente relación precio-cantidad.', 'GUIDE', 0.96, 0.94, NOW() - INTERVAL '4 days', TRUE),
('88888888-8888-8888-8888-888888888924', '77777777-7777-7777-7777-777777777824', '66666666-6666-6666-6666-666666666607', 'https://www.queplan.hn/quecomemos.html', 'hash_ev_hn_altograno_qp',
 '4.8 ★ (68 reseñas) y seleccionado en Qué Plan Tegus por su café de especialidad, tostadas de aguacate, sándwich de cerdo ahumado y excelente atención.', 'GUIDE', 0.95, 0.93, NOW() - INTERVAL '6 days', TRUE),
('88888888-8888-8888-8888-888888888925', '77777777-7777-7777-7777-777777777825', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_tacostado_01',
 '4.1 ★ (585 reseñas): consumos accesibles de L100–200 por persona en tacos, nachos y chilaquiles; existen críticas puntuales sobre mantenimiento del local y consistencia.', 'REVIEW', 0.84, 0.90, NOW() - INTERVAL '7 days', TRUE),
('88888888-8888-8888-8888-888888888926', '77777777-7777-7777-7777-777777777826', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_fridays_01',
 '4.1 ★ (807 reseñas): buena opción en Multiplaza para grupos y amigos que buscan compartir entradas, costillas y cócteles, aunque con críticas por precios y lentitud en horas pico.', 'REVIEW', 0.83, 0.89, NOW() - INTERVAL '8 days', TRUE),
('88888888-8888-8888-8888-888888888927', '77777777-7777-7777-7777-777777777827', '66666666-6666-6666-6666-666666666606', 'https://www.reddit.com/r/Honduras', 'hash_ev_hn_matambritas_reddit',
 '4.3 ★ (863 reseñas) y recomendado reiteradamente en Reddit r/Honduras como referente de hamburguesas grandes y contundentes en Tegucigalpa.', 'MENTION', 0.92, 0.92, NOW() - INTERVAL '5 days', TRUE),
('88888888-8888-8888-8888-888888888928', '77777777-7777-7777-7777-777777777828', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_pizzahouse_01',
 '4.5 ★ (1,016 reseñas): muy valorado en Colonia Palmira por su pizza Carnívora, la textura de su masa y ambiente para ir con amigos o familia.', 'REVIEW', 0.91, 0.91, NOW() - INTERVAL '9 days', TRUE),
('88888888-8888-8888-8888-888888888929', '77777777-7777-7777-7777-777777777829', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_cafehonore_01',
 '4.4 ★ (774 reseñas): destaca en Las Minitas por su propuesta de café-restaurante deli con ceviches, quesos, embutidos y postres para una comida tranquila.', 'REVIEW', 0.90, 0.90, NOW() - INTERVAL '10 days', TRUE),
('88888888-8888-8888-8888-888888888930', '77777777-7777-7777-7777-777777777830', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_usami_01',
 '4.5 ★ (15 reseñas): recomendado para variar del menú tradicional con sushi fresco, ramen y tempura muy cerca de Florencia Norte.', 'REVIEW', 0.91, 0.89, NOW() - INTERVAL '6 days', TRUE),
('88888888-8888-8888-8888-888888888931', '77777777-7777-7777-7777-777777777831', '66666666-6666-6666-6666-666666666606', 'https://www.reddit.com/r/Honduras', 'hash_ev_hn_tatos_reddit',
 'Mencionado directamente por usuarios de r/Honduras en Reddit como la mejor opción de alitas en Tegucigalpa.', 'MENTION', 0.91, 0.89, NOW() - INTERVAL '4 days', TRUE),
('88888888-8888-8888-8888-888888888932', '77777777-7777-7777-7777-777777777832', '66666666-6666-6666-6666-666666666607', 'https://www.queplan.hn/quecomemos.html', 'hash_ev_hn_charlies_qp',
 'Incluido en la guía gastronómica Qué Plan Tegus entre los sitios destacados de hamburguesas y alitas en la capital.', 'GUIDE', 0.90, 0.88, NOW() - INTERVAL '5 days', TRUE),
('88888888-8888-8888-8888-888888888933', '77777777-7777-7777-7777-777777777833', '66666666-6666-6666-6666-666666666606', 'https://www.reddit.com/r/Honduras', 'hash_ev_hn_mateos_reddit',
 'Recomendado en hilos de r/Honduras junto con Matambritas para quienes buscan buenas hamburguesas en Tegucigalpa.', 'MENTION', 0.89, 0.87, NOW() - INTERVAL '7 days', TRUE),
('88888888-8888-8888-8888-888888888904', '77777777-7777-7777-7777-777777777805', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_hn_picacho_01',
 'El mejor mirador de Tegucigalpa para ver el atardecer y las luces de la ciudad entre pinares frescos.', 'GUIDE', 0.94, 0.91, NOW() - INTERVAL '20 days', TRUE),
('88888888-8888-8888-8888-888888888905', '77777777-7777-7777-7777-777777777806', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_hn_min_01',
 'Muy recomendado por su sala virtual de Copán y sus exposiciones bien curadas en el centro histórico.', 'GUIDE', 0.90, 0.88, NOW() - INTERVAL '15 days', TRUE),
('88888888-8888-8888-8888-888888888906', '77777777-7777-7777-7777-777777777808', '66666666-6666-6666-6666-666666666603', NULL, 'hash_ev_hn_santalucia_01',
 'Pueblo colonial cercano a Tegucigalpa, clima frío delicioso, seguro para caminar y tomar café frente a la laguna.', 'REVIEW', 0.93, 0.90, NOW() - INTERVAL '12 days', TRUE),
('88888888-8888-8888-8888-888888888907', '77777777-7777-7777-7777-777777777810', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_hn_copan_01',
 'La Escalinata de los Jeroglíficos y las guacamayas rojas volando entre las estelas hacen de Copán una experiencia única en Centroamérica.', 'GUIDE', 0.97, 0.95, NOW() - INTERVAL '18 days', TRUE),
('88888888-8888-8888-8888-888888888908', '77777777-7777-7777-7777-777777777811', '66666666-6666-6666-6666-666666666602', NULL, 'hash_ev_hn_roatan_01',
 'Aguas cristalinas sin oleaje y arrecife lleno de vida marina entrando directamente desde la arena sin necesidad de bote.', 'GUIDE', 0.96, 0.94, NOW() - INTERVAL '9 days', TRUE)
ON CONFLICT (content_hash) DO UPDATE SET
  extracted_snippet = EXCLUDED.extracted_snippet,
  is_demo_data = EXCLUDED.is_demo_data;

-- 9. Scores Consolidados (Orden exacto #1 a #13 en Tegucigalpa, <= 91.35) ------
INSERT INTO place_scores (
    place_id, overall_score, confidence_level, total_independent_evidences,
    total_native_reviews, source_diversity_count, ai_explanation_es,
    explanation_status, top_positive_aspects, top_negative_aspects
) VALUES
-- #1 El Morito – La Hacienda
('77777777-7777-7777-7777-777777777821', 91.35, 'HIGH', 6, 14204, 3,
 'Lo elegiría para: una buena comida en pareja o familia. • Respaldo: 4.8 ★ (14,204 reseñas) y guía Qué Plan Tegus; el mayor volumen de opiniones verificadas cerca de Florencia Norte.',
 'CONFIRMED', '["14,204 reseñas (4.8 ★)","Ceviches y pulpo al ajillo","Destacado en Qué Plan Tegus","Ideal en pareja o familia"]'::jsonb, '["Alta concurrencia en hora de almuerzo de fin de semana"]'::jsonb),

-- #2 Restaurante Portobello
('77777777-7777-7777-7777-777777777822', 91.20, 'HIGH', 4, 11, 2,
 'Lo elegiría para: pizza o pasta de buena calidad y una salida tranquila. • Respaldo: 4.4 ★ por su estilo italiano acogedor, mejillones y sangría a pocos metros de Florencia Norte.',
 'CONFIRMED', '["Pizza y pasta italiana","Ambiente acogedor y tranquilo","Mejillones y sangría","Muy cerca de Florencia Norte"]'::jsonb, '[]'::jsonb),

-- #3 La Pana
('77777777-7777-7777-7777-777777777823', 91.05, 'HIGH', 4, 35, 3,
 'Lo elegiría para: comer italiano sin ir necesariamente a un restaurante de lujo. • Respaldo: 5.0 ★ y destacado en Qué Plan Tegus por sus porciones generosas y excelente relación precio-cantidad.',
 'CONFIRMED', '["Excelente relación cantidad-precio","Porciones generosas","Lasañas, pizzas y pastas","Destacado en Qué Plan Tegus"]'::jsonb, '[]'::jsonb),

-- #4 Alto Grano Café
('77777777-7777-7777-7777-777777777824', 90.90, 'HIGH', 4, 68, 3,
 'Lo elegiría para: desayunar, brunch o tomar café con algo de comer. • Respaldo: 4.8 ★ (68 reseñas) y guía Qué Plan Tegus; destacan sus tostadas de aguacate y sándwich de cerdo ahumado.',
 'CONFIRMED', '["Café de especialidad (4.8 ★)","Tostadas de aguacate y cerdo ahumado","Excelente ambiente y atención","Qué Plan Tegus"]'::jsonb, '[]'::jsonb),

-- #5 Tacos Tado
('77777777-7777-7777-7777-777777777825', 90.75, 'HIGH', 4, 585, 2,
 'Lo elegiría para: comer algo informal sin gastar demasiado (L100–200 por persona). | ⚠️ Ojo: hay críticas sobre mantenimiento del local y consistencia.',
 'CONFIRMED', '["Precios accesibles (L100–200/persona)","Tacos, nachos y chilaquiles","A pasos de Florencia Norte"]'::jsonb, '["Críticas sobre mantenimiento del local","Consistencia variable en horas pico"]'::jsonb),

-- #6 T.G.I. Fridays – Multiplaza
('77777777-7777-7777-7777-777777777826', 90.60, 'HIGH', 4, 807, 2,
 'Lo elegiría para: salir con amigos y compartir varios platos. | ⚠️ Ojo: hay críticas por precios elevados y lentitud del servicio.',
 'CONFIRMED', '["807 reseñas (4.1 ★)","Ideal para grupos y amigos","Entradas, costillas y cócteles"]'::jsonb, '["Críticas por precios elevados","Lentitud del servicio cuando se llena"]'::jsonb),

-- #7 Matambritas – Gourmet Center
('77777777-7777-7777-7777-777777777827', 90.45, 'HIGH', 5, 863, 3,
 'Lo elegiría para: cuando tengas ganas de una hamburguesa contundente. • Respaldo: 4.3 ★ (863 reseñas) y recomendación directa en conversaciones de Reddit (r/Honduras).',
 'CONFIRMED', '["Recomendado en Reddit r/Honduras","863 reseñas (4.3 ★)","Hamburguesas grandes y especiales"]'::jsonb, '[]'::jsonb),

-- #8 Pizza House – Palmira
('77777777-7777-7777-7777-777777777828', 90.30, 'HIGH', 4, 1016, 2,
 'Lo elegiría para: una salida de pizza con amigos o familia. • Respaldo: 4.5 ★ (1,016 reseñas); se mencionan especialmente la pizza Carnívora y su masa.',
 'CONFIRMED', '["1,016 reseñas (4.5 ★)","Pizza Carnívora destacada","Masa artesanal"]'::jsonb, '[]'::jsonb),

-- #9 Café Honoré
('77777777-7777-7777-7777-777777777829', 90.15, 'HIGH', 4, 774, 2,
 'Lo elegiría para: una comida más tranquila, con variedad y opciones diferentes. • Respaldo: 4.4 ★ (774 reseñas) por sus ceviches, tablas de quesos, deli y postres.',
 'CONFIRMED', '["774 reseñas (4.4 ★)","Deli, quesos, embutidos y ceviches","Ambiente tranquilo en Las Minitas"]'::jsonb, '[]'::jsonb),

-- #10 Usami
('77777777-7777-7777-7777-777777777830', 90.00, 'HIGH', 3, 15, 2,
 'Lo elegiría para: comer japonés (sushi, ramen y tempura) y variar de hamburguesas, pizzas y comida tradicional cerca de Florencia Norte (4.5 ★).',
 'CONFIRMED', '["Sushi, ramen y tempura (4.5 ★)","Propuesta diferente en la zona","A 560 m de Florencia Norte"]'::jsonb, '[]'::jsonb),

-- #11 Tatos Wings & Grill
('77777777-7777-7777-7777-777777777831', 89.80, 'HIGH', 3, 210, 2,
 'Lo elegiría para: comer alitas con amigos. • Respaldo: destacado directamente en Reddit (r/Honduras) como la recomendación #1 en alitas de Tegucigalpa.',
 'CONFIRMED', '["Favorito de Reddit r/Honduras en alitas","Variedad de salsas","Buena relación calidad-precio"]'::jsonb, '[]'::jsonb),

-- #12 Charlie's Burgers & Wings
('77777777-7777-7777-7777-777777777832', 89.60, 'HIGH', 3, 180, 2,
 'Lo elegiría para: hamburguesas y alitas con buen sabor casero. • Respaldo: destacado en la guía gastronómica local Qué Plan Tegus.',
 'CONFIRMED', '["Destacado en Qué Plan Tegus","Hamburguesas y alitas","Cerca de Florencia Norte"]'::jsonb, '[]'::jsonb),

-- #13 Mateos Burgers
('77777777-7777-7777-7777-777777777833', 89.40, 'HIGH', 3, 145, 2,
 'Lo elegiría para: hamburguesa artesanal a buen precio. • Respaldo: mencionado en Reddit (r/Honduras) junto con Matambritas entre las mejores hamburguesas.',
 'CONFIRMED', '["Recomendado en Reddit r/Honduras","Hamburguesas artesanales","Precios razonables"]'::jsonb, '[]'::jsonb),

-- Resto de categorías en Tegucigalpa y Honduras
('77777777-7777-7777-7777-777777777804', 89.10, 'MEDIUM', 2, 1, 2,
 'Lo elegiría para: probar cortes a la parrilla y café cultivado en la Cordillera del Merendón en San Pedro Sula.',
 'CONFIRMED', '["Cortes a la parrilla","Café de altura","Atención"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777805', 90.90, 'HIGH', 3, 2, 2,
 'Lo elegiría para: disfrutar del mejor mirador panorámico 360° de Tegucigalpa al atardecer entre pinares frescos.',
 'CONFIRMED', '["Vista panorámica 360°","Clima fresco","Ideal al atardecer"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777834', 90.50, 'HIGH', 3, 320, 2,
 'Lo elegiría para: caminar al aire libre y ver la ciudad desde el Monumento a la Paz a menos de 2 km de Florencia Norte.',
 'CONFIRMED', '["A 1.9 km de Florencia Norte","Senderos seguros","Mirador urbano"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777835', 90.70, 'HIGH', 4, 950, 2,
 'Lo elegiría para: conocer la joya arquitectónica y espiritual más emblemática de Tegucigalpa a solo 2.8 km de Florencia Norte.',
 'CONFIRMED', '["Vitrales monumentales","A 2.8 km de Florencia Norte","Entrada libre"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777806', 89.40, 'MEDIUM', 2, 1, 2,
 'Lo elegiría para: una tarde cultural recorriendo la historia de Honduras y la proyección interactiva de Copán Virtual.',
 'CONFIRMED', '["Valor cultural","Copán Virtual","Arquitectura"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777807', 87.80, 'MEDIUM', 2, 0, 1,
 'Lo elegiría para: respirar aire puro de pino y desconectarse sin salir del radio de 5 km.',
 'CONFIRMED', '["Bosque de pino","Acceso gratuito","Aire puro"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777808', 90.40, 'HIGH', 3, 1, 2,
 'Lo elegiría para: escapada de pueblo colonial con clima frío, laguna central y cafés de montaña.',
 'CONFIRMED', '["Arquitectura colonial","Clima fresco","Cercanía a Tegucigalpa"]'::jsonb, '["Tráfico en domingo por la tarde"]'::jsonb),
('77777777-7777-7777-7777-777777777809', 86.50, 'MEDIUM', 2, 0, 1,
 'Lo elegiría para: conocer el casco histórico central y la Catedral de San Miguel Arcángel.',
 'CONFIRMED', '["Patrimonio histórico","Gratis","Ubicación céntrica"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777810', 91.20, 'HIGH', 4, 2, 3,
 'Lo elegiría para: vivir la joya arqueológica maya de Honduras con su Escalinata Jeroglífica y guacamayas en libertad.',
 'CONFIRMED', '["Escultura Maya única","Guacamayas rojas","Entorno natural"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777811', 91.00, 'HIGH', 4, 2, 3,
 'Lo elegiría para: hacer snorkel directo desde la arena blanca sobre el arrecife coralino de Roatán.',
 'CONFIRMED', '["Snorkel desde la orilla","Agua cristalina","Arena blanca"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777812', 88.20, 'MEDIUM', 2, 1, 2,
 'Lo elegiría para: asistir a funciones de teatro, música sinfónica y cultura en un edificio neoclásico.',
 'CONFIRMED', '["Acústica e historia","Precios accesibles","Valor cultural"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777836', 89.90, 'HIGH', 3, 410, 2,
 'Lo elegiría para: ver estrenos en butacas VIP reclinables o tomar algo en las terrazas de Multiplaza a 1 km de Florencia Norte.',
 'CONFIRMED', '["A 1 km de Florencia Norte","Salas VIP","Estacionamiento seguro"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777813', 90.10, 'HIGH', 2, 1, 2,
 'Lo elegiría para: hacer senderismo o ciclismo de montaña entre pinares a menos de 4 km de Florencia Norte.',
 'CONFIRMED', '["Senderos seguros","Contacto con naturaleza","Cercanía"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777837', 89.85, 'HIGH', 3, 210, 2,
 'Lo elegiría para: ejercitarse por la mañana en senderos seguros a 1.9 km de Florencia Norte.',
 'CONFIRMED', '["Circuitos señalizados","Seguridad","Mirador a la ciudad"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777814', 90.00, 'HIGH', 2, 1, 2,
 'Lo elegiría para: caminata matutina en San Pedro Sula con vistas hacia todo el Valle de Sula.',
 'CONFIRMED', '["Vista al Valle de Sula","Ambiente deportivo","Gratis"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777815', 88.90, 'HIGH', 3, 95, 2,
 'Lo elegiría para: disfrutar música acústica, arte y café hondureño de especialidad en Palmira a 1.1 km de Florencia Norte.',
 'CONFIRMED', '["Café de especialidad","Música en vivo","A 1.1 km de Florencia Norte"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777838', 90.25, 'HIGH', 4, 1250, 2,
 'Lo elegiría para: compras, cafés y servicios en el centro comercial más completo a 1 km de Florencia Norte.',
 'CONFIRMED', '["A 1 km de Florencia Norte","Variedad de tiendas","Seguridad y parqueo"]'::jsonb, '["Tráfico en horas pico"]'::jsonb),
('77777777-7777-7777-7777-777777777816', 89.70, 'HIGH', 3, 85, 2,
 'Lo elegiría para: comprar auténtica alfarería lenca certificada y café de exportación a 1.3 km de Florencia Norte.',
 'CONFIRMED', '["Alfarería Lenca auténtica","Café de Marcala y Copán","Trato directo"]'::jsonb, '[]'::jsonb),
('77777777-7777-7777-7777-777777777817', 90.30, 'HIGH', 3, 1, 2,
 'Lo elegiría para: comprar artesanías típicas hondureñas y desayunar baleadas tradicionales en San Pedro Sula.',
 'CONFIRMED', '["Variedad de artesanías","Baleadas tradicionales","Precios justos"]'::jsonb, '[]'::jsonb)
ON CONFLICT (place_id) DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    confidence_level = EXCLUDED.confidence_level,
    total_independent_evidences = EXCLUDED.total_independent_evidences,
    total_native_reviews = EXCLUDED.total_native_reviews,
    source_diversity_count = EXCLUDED.source_diversity_count,
    ai_explanation_es = EXCLUDED.ai_explanation_es,
    explanation_status = EXCLUDED.explanation_status,
    top_positive_aspects = EXCLUDED.top_positive_aspects,
    top_negative_aspects = EXCLUDED.top_negative_aspects;

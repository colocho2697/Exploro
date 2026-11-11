import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';
import { DatabaseService } from './database/database.service';
import { RedisService } from './redis/redis.service';

describe('Fase 4 — Motor de Inteligencia y Recomendaciones', () => {
  let app: INestApplication;
  let baseUrl: string;
  let client: ExploroApiClient;
  let db: DatabaseService;
  let redis: RedisService;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 4102;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
    client = new ExploroApiClient({ baseUrl });
    db = app.get(DatabaseService);
    redis = app.get(RedisService);
    await redis.del('rec:summary:77777777-7777-7777-7777-777777777701');
    await redis.del('rec:summary:77777777-7777-7777-7777-777777777702');
  });

  afterAll(async () => {
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // 1. RESUMEN DE RECOMENDACIÓN INTELIGENTE Y EXPLICABLE (Pasos 4.3 y 4.4)
  // ---------------------------------------------------------------------------

  it('obtiene el resumen de recomendación con score determinista y aspectos respaldados', async () => {
    // 1. Obtiene un lugar con evidencias del catálogo existente (ej. L'Industrie Pizzeria)
    const placeRes = await db.query<{ id: string; name: string }>(
      `SELECT id, name FROM places WHERE slug = 'l-industrie-pizzeria-nyc'`
    );
    expect(placeRes.rows.length).toBe(1);
    const placeId = placeRes.rows[0]!.id;

    // 2. Consulta el resumen de recomendación
    const summary = await client.getPlaceRecommendationSummary(placeId);

    expect(summary.placeId).toBe(placeId);
    expect(summary.overallScore).toBeGreaterThan(0);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(summary.confidenceLevel);
    expect(summary.costUsd).toBe(0.0);
    expect(summary.factCheckPassed).toBe(true);
    expect(summary.explanation).toBeDefined();
    expect(summary.explanation.length).toBeGreaterThan(15);
    expect(['CONFIRMED', 'UNVERIFIED']).toContain(summary.explanationStatus);

    // Debe contener aspectos extraídos de las evidencias reales
    expect(summary.topPositiveAspects.length).toBeGreaterThan(0);
    const aspectNames = summary.topPositiveAspects.map((a) => a.aspect);
    expect(
      aspectNames.includes('Sabor y calidad') ||
      aspectNames.includes('Relación calidad-precio') ||
      aspectNames.includes('Especialidades de la casa')
    ).toBe(true);
  });

  it('utiliza la caché en Redis para responder subsecuentemente con latencia mínima', async () => {
    const placeRes = await db.query<{ id: string }>(
      `SELECT id FROM places WHERE slug = 'l-industrie-pizzeria-nyc'`
    );
    const placeId = placeRes.rows[0]!.id;

    const start = performance.now();
    const cachedSummary = await client.getPlaceRecommendationSummary(placeId);
    const duration = performance.now() - start;

    expect(cachedSummary.placeId).toBe(placeId);
    expect(duration).toBeLessThan(150); // Caché en memoria Redis sub-150ms bajo carga concurrente
  });

  // ---------------------------------------------------------------------------
  // 2. RECÁLCULO DETERMINISTA DE ASPECTOS (Paso 4.1 y 4.2)
  // ---------------------------------------------------------------------------

  it('recalcula aspectos y actualiza la reputación del lugar al haber nuevas evidencias', async () => {
    const placeRes = await db.query<{ id: string }>(
      `SELECT id FROM places WHERE slug = 'brooklyn-bridge-park-pier-1'`
    );
    expect(placeRes.rows.length).toBe(1);
    const placeId = placeRes.rows[0]!.id;

    const recalc = await client.recalculatePlaceAspects(placeId, true);

    expect(recalc.placeId).toBe(placeId);
    expect(recalc.updatedScore).toBeGreaterThan(0);
    expect(['CONFIRMED', 'UNVERIFIED', 'INSUFFICIENT_DATA']).toContain(recalc.explanationStatus);
    expect(recalc.evidencesProcessed).toBeGreaterThanOrEqual(1);

    // El resumen ahora debe reflejar los aspectos actualizados
    const summary = await client.getPlaceRecommendationSummary(placeId);
    expect(summary.overallScore).toBe(recalc.updatedScore);
  });

  // ---------------------------------------------------------------------------
  // 3. GUARDIÁN ANTI-ALUCINACIONES Y DATOS INSUFICIENTES (Paso 4.5)
  // ---------------------------------------------------------------------------

  it('devuelve INSUFFICIENT_DATA sin alucinar hechos falsos cuando un lugar no tiene evidencias', async () => {
    // Inserta un lugar temporal sin evidencias
    const cityRes = await db.query<{ id: string }>(`SELECT id FROM cities WHERE slug = 'new-york'`);
    const catRes = await db.query<{ id: string }>(`SELECT id FROM categories WHERE slug = 'eventos'`);
    const cityId = cityRes.rows[0]!.id;
    const catId = catRes.rows[0]!.id;

    const newPlace = await db.query<{ id: string }>(
      `INSERT INTO places (
          city_id, category_id, name, normalized_name, slug, description, address_text,
          location, price_tier, price_status, verification_status, is_demo_data
       ) VALUES (
          $1, $2, 'Lugar Sin Evidencias Test', 'lugar sin evidencias test', 'lugar-sin-evidencias-test',
          'Lugar de prueba sin testimonios.', '123 Secret St, New York',
          ST_SetSRID(ST_MakePoint(-73.99, 40.75), 4326)::geography,
          'UNKNOWN', 'INSUFFICIENT_DATA', 'UNVERIFIED', true
       )
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [cityId, catId]
    );
    const placeId = newPlace.rows[0]!.id;

    try {
      const summary = await client.getPlaceRecommendationSummary(placeId);

      expect(summary.overallScore).toBe(0);
      expect(summary.confidenceLevel).toBe('LOW');
      expect(summary.explanationStatus).toBe('INSUFFICIENT_DATA');
      expect(summary.explanation).toContain('Evidencia limitada');
      expect(summary.topPositiveAspects).toHaveLength(0);
      expect(summary.topNegativeAspects).toHaveLength(0);
      expect(summary.factCheckPassed).toBe(true);
    } finally {
      await db.query(`DELETE FROM places WHERE id = $1`, [placeId]);
    }
  });

  it('lanza 404 si se solicita la recomendación de un lugar inexistente', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(client.getPlaceRecommendationSummary(fakeId)).rejects.toThrow(ExploroApiError);
  });

  // ---------------------------------------------------------------------------
  // 4. MÉTRICAS FINOPS Y POLÍTICA DE COSTO CERO (Paso 4.6)
  // ---------------------------------------------------------------------------

  it('proporciona métricas de costo cero ($0.00) y auditoría de IA', async () => {
    const metrics = await client.getAiMetrics();

    expect(metrics.costPolicy).toBe('ZERO_COST_USD_0');
    expect(metrics.totalCostUsd).toBe(0.0);
    expect(typeof metrics.totalRequests).toBe('number');
    expect(typeof metrics.aspectsExtracted).toBe('number');
    expect(typeof metrics.hallucinationsBlocked).toBe('number');
  });
});

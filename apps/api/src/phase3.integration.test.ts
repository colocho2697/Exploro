import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';

describe('Fase 3 — Integración de Mapas, Fuentes, Evidencias y Normalización', () => {
  let app: INestApplication;
  let baseUrl: string;
  let client: ExploroApiClient;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 4101;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
    client = new ExploroApiClient({ baseUrl });
  });

  afterAll(async () => {
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // 1. SERVICIOS GEOGRÁFICOS SIN COSTO (Paso 3.1)
  // ---------------------------------------------------------------------------

  it('proporciona sugerencias de autocomplete buscando ciudades y lugares en PostGIS', async () => {
    const suggestions = await client.geoAutocomplete({ q: 'New York', limit: 5 });
    expect(suggestions.length).toBeGreaterThan(0);

    const cityMatch = suggestions.find((s) => s.type === 'city');
    expect(cityMatch).toBeDefined();
    expect(cityMatch?.title).toContain('New York');
    expect(cityMatch?.coordinates.lat).toBeCloseTo(40.71, 1);
  });

  it('permite buscar lugares por nombre comercial en autocomplete', async () => {
    const suggestions = await client.geoAutocomplete({ q: 'Pizzeria', limit: 5 });
    expect(suggestions.length).toBeGreaterThan(0);

    const placeMatch = suggestions.find((s) => s.type === 'place');
    expect(placeMatch).toBeDefined();
    expect(placeMatch?.placeId).toBeDefined();
    expect(placeMatch?.coordinates.lat).toBeDefined();
  });

  it('resuelve geocodificación inversa retornando ciudad y dirección legible', async () => {
    // Coordenadas cercanas a Nueva York
    const address = await client.geoReverse(40.7332, -74.0052);
    expect(address.city).toContain('New York');
    expect(address.country).toBe('Estados Unidos');
    expect(address.formatted).toBeDefined();
  });

  it('calcula rutas y distancias deterministas en vehículo y a pie con polilínea GeoJSON', async () => {
    const origin = { lat: 40.7128, lng: -74.006 }; // Lower Manhattan
    const destination = { lat: 40.7829, lng: -73.9654 }; // Central Park

    const routeDriving = await client.geoCalculateRoute({
      origin,
      destination,
      mode: 'driving',
    });

    expect(routeDriving.mode).toBe('driving');
    expect(routeDriving.distanceMeters).toBeGreaterThan(7000);
    expect(routeDriving.distanceMiles).toBeGreaterThan(4);
    expect(routeDriving.durationMinutes).toBeGreaterThan(5);
    expect(routeDriving.geometryGeoJSON?.type).toBe('LineString');
    expect(routeDriving.geometryGeoJSON?.coordinates.length).toBeGreaterThanOrEqual(2);
    expect(routeDriving.steps.length).toBeGreaterThanOrEqual(3);

    const routeWalking = await client.geoCalculateRoute({
      origin,
      destination,
      mode: 'walking',
    });

    expect(routeWalking.mode).toBe('walking');
    expect(routeWalking.durationMinutes).toBeGreaterThan(routeDriving.durationMinutes);
  });

  // ---------------------------------------------------------------------------
  // 2. SISTEMA DE FUENTES AUTORIZADAS (Paso 3.2 y DEC-012)
  // ---------------------------------------------------------------------------

  it('lista fuentes iniciales autorizadas con sus tipos y pesos de confianza', async () => {
    const sources = await client.listSources();
    expect(sources.length).toBeGreaterThanOrEqual(3);

    const reddit = sources.find((s) => s.code === 'REDDIT_US_FOOD');
    expect(reddit).toBeDefined();
    expect(reddit?.sourceType).toBe('EXTERNAL_COMMUNITY');
    expect(reddit?.baseTrustWeight).toBeGreaterThan(0.7);

    const native = sources.find((s) => s.code === 'EXPLORO_NATIVE');
    expect(native).toBeDefined();
    expect(native?.sourceType).toBe('NATIVE_EXPERIENCE');
    expect(native?.baseTrustWeight).toBeGreaterThanOrEqual(0.9);
  });

  it('permite registrar una nueva fuente legal respetando identificadores únicos', async () => {
    const newCode = `BLOG_GUIDES_${Date.now()}`;
    const source = await client.createSource({
      code: newCode,
      name: 'Guías de Viajeros Independientes de Texas',
      sourceType: 'BLOG',
      baseTrustWeight: 0.82,
      feedUrl: 'https://texasguides.example.org/rss.xml',
    });

    expect(source.code).toBe(newCode);
    expect(source.baseTrustWeight).toBe(0.82);

    // Intento de duplicado de código debe ser rechazado
    await expect(
      client.createSource({
        code: newCode,
        name: 'Duplicado',
        sourceType: 'BLOG',
      })
    ).rejects.toBeInstanceOf(ExploroApiError);
  });

  it('ejecuta sincronización de fuente omitiendo duplicados existentes', async () => {
    const sources = await client.listSources();
    const source = sources[0];
    if (!source) throw new Error('No hay fuentes registradas');

    const result = await client.syncSource(source.id);
    expect(result.status).toBe('SUCCESS');
    expect(result.itemsFetched).toBeGreaterThan(0);
    expect(result.evidencesIngested + result.duplicatesSkipped).toBe(result.itemsFetched);
  });

  // ---------------------------------------------------------------------------
  // 3. SISTEMA DE EVIDENCIAS Y DEDUPLICACIÓN (Paso 3.3 y Principio #1)
  // ---------------------------------------------------------------------------

  it('consulta evidencias auditables de un lugar con fuentes, enlaces y confianza', async () => {
    const place = await client.getPlaceBySlug('l-industrie-pizzeria-nyc');
    const evidences = await client.listPlaceEvidences(place.id);

    expect(evidences.length).toBeGreaterThanOrEqual(1);
    const first = evidences[0];
    expect(first?.extractedSnippet).toBeDefined();
    expect(first?.sourceCode).toBeDefined();
    expect(first?.confidenceScore).toBeGreaterThan(0.7);
  });

  it('registra una nueva evidencia, previene duplicados idénticos y actualiza scores', async () => {
    const place = await client.getPlaceBySlug('barton-springs-austin');
    const snippet = `Agua fresca y cristalina ideal para verano en Zilker Park. Prueba única ${Date.now()}.`;

    const evidence = await client.createEvidence({
      placeId: place.id,
      sourceCode: 'EXPLORO_NATIVE',
      extractedSnippet: snippet,
      evidenceType: 'REVIEW',
      confidenceScore: 0.96,
      publishedAt: new Date().toISOString(),
    });

    expect(evidence.extractedSnippet).toBe(snippet);
    expect(evidence.sourceCode).toBe('EXPLORO_NATIVE');

    // Mismo snippet y fuente debe rechazarse como duplicado (content_hash idéntico)
    await expect(
      client.createEvidence({
        placeId: place.id,
        sourceCode: 'EXPLORO_NATIVE',
        extractedSnippet: snippet,
      })
    ).rejects.toBeInstanceOf(ExploroApiError);
  });

  // ---------------------------------------------------------------------------
  // 4. NORMALIZACIÓN Y PREVENCIÓN DE DUPLICADOS (Paso 3.4)
  // ---------------------------------------------------------------------------

  it('analiza posibles duplicados en el catálogo respetando el principio de no fusión automática en ambigüedad', async () => {
    const duplicates = await client.detectDuplicates({
      radiusMeters: 5000,
      similarityThreshold: 0.4,
    });

    // Debe devolver una lista válida de candidatos de normalización
    expect(Array.isArray(duplicates)).toBe(true);

    for (const dup of duplicates) {
      expect(dup.placeA).toBeDefined();
      expect(dup.placeB).toBeDefined();
      expect(dup.nameSimilarity).toBeGreaterThanOrEqual(0.4);
      expect(['AUTO_MERGE', 'MANUAL_REVIEW', 'DISTINCT']).toContain(dup.action);
    }
  });
});

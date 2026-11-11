import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';
import { DatabaseService } from './database/database.service';
import { RedisService } from './redis/redis.service';

describe('Fase 5 — Sistema de Experiencias Propias y Verificación', () => {
  let app: INestApplication;
  let baseUrl: string;
  let guestClient: ExploroApiClient;
  let authClient: ExploroApiClient;
  let db: DatabaseService;
  let redis: RedisService;
  let testUserId: string;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 4105;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    guestClient = new ExploroApiClient({ baseUrl });
    db = app.get(DatabaseService);
    redis = app.get(RedisService);

    // Registrar un usuario de prueba para la Fase 5
    const email = `traveler.phase5.${Date.now()}@exploro.test`;
    const session = await guestClient.register({
      email,
      password: 'TravelerPhase5Password!',
      displayName: 'Carlos Viajero',
    });

    testUserId = session.user.id;
    const token = session.tokens.accessToken;
    authClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => token,
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // 1. INICIO DE ACTIVIDAD («Comenzar actividad») — Paso 5.1
  // ---------------------------------------------------------------------------

  it('rechaza el inicio de actividad sin autenticación', async () => {
    const placeRes = await db.query<{ id: string }>(
      `SELECT id FROM places WHERE slug = 'l-industrie-pizzeria-nyc'`
    );
    const placeId = placeRes.rows[0]!.id;

    await expect(
      guestClient.startActivity({
        placeId,
        activityTitle: 'Probar pizza artesanal',
      })
    ).rejects.toThrowError(ExploroApiError);
  });

  it('inicia una actividad exitosamente registrando usuario, lugar y estado STARTED (Paso 5.1)', async () => {
    const placeRes = await db.query<{ id: string }>(
      `SELECT id FROM places WHERE slug = 'l-industrie-pizzeria-nyc'`
    );
    const placeId = placeRes.rows[0]!.id;

    const activity = await authClient.startActivity({
      placeId,
      activityTitle: 'Probar pizza con burrata',
    });

    expect(activity.id).toBeDefined();
    expect(activity.userId).toBe(testUserId);
    expect(activity.placeId).toBe(placeId);
    expect(activity.activityTitle).toBe('Probar pizza con burrata');
    expect(activity.status).toBe('STARTED');
    expect(activity.verificationMethod).toBe('NONE');
    expect(activity.isVerifiedVisit).toBe(false);
    expect(activity.startedAt).toBeDefined();

    // Consultar actividad activa
    const active = await authClient.getActiveActivity();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(activity.id);
  });

  // ---------------------------------------------------------------------------
  // 2. VERIFICACIÓN OPCIONAL DE VISITA (GPS Y QR) — Paso 5.5
  // ---------------------------------------------------------------------------

  it('no utiliza el simple inicio como prueba definitiva de visita (Regla inquebrantable)', async () => {
    const active = await authClient.getActiveActivity();
    expect(active?.isVerifiedVisit).toBe(false);
    expect(active?.verificationMethod).toBe('NONE');
  });

  it('rechaza verificación si el usuario está fuera del radio de 100m por GPS', async () => {
    const active = await authClient.getActiveActivity();
    expect(active).not.toBeNull();

    // Lugar: lat 40.7332, lng -74.0052
    // Coordenada alejada: lat 40.7500, lng -73.9800 (~2.5km)
    const result = await authClient.verifyActivityVisit(active!.id, {
      latitude: 40.75,
      longitude: -73.98,
    });

    expect(result.isVerified).toBe(false);
    expect(result.verificationMethod).toBe('NONE');
    expect(result.distanceMeters).toBeGreaterThan(100);
  });

  it('verifica exitosamente la visita si el usuario está dentro de 100m por GPS (Paso 5.5)', async () => {
    const active = await authClient.getActiveActivity();
    expect(active).not.toBeNull();

    // Lugar: lat 40.7332, lng -74.0052 (~20m)
    const result = await authClient.verifyActivityVisit(active!.id, {
      latitude: 40.7333,
      longitude: -74.0052,
    });

    expect(result.isVerified).toBe(true);
    expect(result.verificationMethod).toBe('GPS_PROXIMITY');
    expect(result.distanceMeters).toBeLessThanOrEqual(100);

    // Verificar en BD que se actualizó
    const updated = await authClient.getActiveActivity();
    expect(updated?.isVerifiedVisit).toBe(true);
    expect(updated?.verificationMethod).toBe('GPS_PROXIMITY');
  });

  // ---------------------------------------------------------------------------
  // 3. FINALIZACIÓN Y OPINIÓN ADAPTADA PARA RESTAURANTES — Paso 5.2 y 5.3
  // ---------------------------------------------------------------------------

  it('completa la actividad con formulario corto de restaurante y actualiza el ranking (Paso 5.3 y 5.6)', async () => {
    const active = await authClient.getActiveActivity();
    expect(active).not.toBeNull();

    const review = await authClient.completeActivityWithReview(active!.id, {
      reviewType: 'RESTAURANT',
      restaurantReview: {
        tasteQuality: 5,
        serviceRating: 5,
        valueForMoney: 'EXCELLENT',
        amountPaid: 18.0,
        recommendedDish: 'Burrata Slice caliente',
        wouldReturn: true,
        comment: 'Corteza perfectamente crujiente con masa madre.',
      },
      wouldReturnOrRecommend: true,
    });

    expect(review.id).toBeDefined();
    expect(review.activityLogId).toBe(active!.id);
    expect(review.reviewType).toBe('RESTAURANT');
    expect(review.tasteQuality).toBe(5);
    expect(review.recommendedItem).toBe('Burrata Slice caliente');
    expect(review.isVerifiedVisit).toBe(true);
    expect(review.verificationMethod).toBe('GPS_PROXIMITY');

    // La actividad ya no debe estar en progreso
    const activeAfter = await authClient.getActiveActivity();
    expect(activeAfter).toBeNull();

    // Se debe haber creado una evidencia nativa en evidences
    const evRes = await db.query<{ count: string }>(
      `SELECT count(*)::text as count FROM evidences e
       JOIN sources s ON s.id = e.source_id
       WHERE e.place_id = $1 AND s.code = 'EXPLORO_NATIVE'`,
      [active!.placeId]
    );
    expect(Number(evRes.rows[0]!.count)).toBeGreaterThan(0);

    // place_scores debe reflejar total_native_reviews incrementado
    const scoreRes = await db.query<{ total_native_reviews: number }>(
      `SELECT total_native_reviews FROM place_scores WHERE place_id = $1`,
      [active!.placeId]
    );
    expect(scoreRes.rows[0]!.total_native_reviews).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // 4. FLUJO DE TURISMO Y VERIFICACIÓN POR CÓDIGO QR — Paso 5.4 y 5.5
  // ---------------------------------------------------------------------------

  it('inicia actividad de turismo, verifica por QR y completa con cuestionario adaptado (Paso 5.4 y 5.5)', async () => {
    const placeRes = await db.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM places WHERE slug = 'brooklyn-bridge-park-pier-1'`
    );
    const place = placeRes.rows[0]!;

    // 1. Iniciar actividad
    const activity = await authClient.startActivity({
      placeId: place.id,
      activityTitle: 'Caminata y atardecer en Pier 1',
    });
    expect(activity.status).toBe('STARTED');

    // 2. Verificar mediante QR oficial
    const qrResult = await authClient.verifyActivityVisit(activity.id, {
      qrToken: `EXPLORO-QR-${place.slug}`,
    });
    expect(qrResult.isVerified).toBe(true);
    expect(qrResult.verificationMethod).toBe('QR_CODE');

    // 3. Completar con cuestionario de turismo
    const review = await authClient.completeActivityWithReview(activity.id, {
      reviewType: 'TOURISM',
      tourismReview: {
        worthIt: true,
        durationSpent: '1_TO_2_HOURS',
        amountPaid: 0,
        accessibility: 'WHEELCHAIR_ACCESSIBLE',
        recommendedItem: 'Llevar cámara para el atardecer',
        caveatOrTip: 'Suele haber viento fresco en el muelle.',
        comment: 'Las mejores vistas gratuitas de todo Nueva York.',
      },
      wouldReturnOrRecommend: true,
    });

    expect(review.reviewType).toBe('TOURISM');
    expect(review.worthIt).toBe(true);
    expect(review.durationSpent).toBe('1_TO_2_HOURS');
    expect(review.accessibility).toBe('WHEELCHAIR_ACCESSIBLE');
    expect(review.isVerifiedVisit).toBe(true);
    expect(review.verificationMethod).toBe('QR_CODE');

    // 4. Consultar reseñas públicas del lugar
    const reviewsList = await guestClient.getPlaceReviews(place.id);
    expect(reviewsList.length).toBeGreaterThan(0);
    const myReview = reviewsList.find((r) => r.id === review.id);
    expect(myReview).toBeDefined();
    expect(myReview?.isVerifiedVisit).toBe(true);
    expect(myReview?.userName).toBe('Carlos Viajero');
  });
});

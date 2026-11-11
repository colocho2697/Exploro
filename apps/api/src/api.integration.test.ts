import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExploroApiClient } from '@exploro/api-client';

describe('@exploro/api E2E Integration Suite (PostGIS + Redis + AI Engine)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let guestClient: ExploroApiClient;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const serverAddress = app.getHttpServer().address();
    const port =
      typeof serverAddress === 'object' && serverAddress
        ? serverAddress.port
        : 4099;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
    guestClient = new ExploroApiClient({ baseUrl });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('verifica salud operativa de API, PostgreSQL+PostGIS, Redis y AI Engine', async () => {
    const health = await guestClient.getHealth();
    expect(health.status).toBe('ok');
    expect(health.services.api).toBe('up');
    expect(health.services.databasePostgis).toBe('up');
    expect(health.services.redis).toBe('up');
    expect(health.services.aiEngine).toBe('up');
  });

  it('retorna configuración bootstrap con EE. UU. por defecto, «Estoy de viaje» activo y «Soy local» deshabilitado', async () => {
    const bootstrap = await guestClient.getBootstrapConfig();
    expect(bootstrap.defaultCountryIso).toBe('US');
    expect(bootstrap.defaultCurrency).toBe('USD');
    expect(bootstrap.geoProvider.costPolicy).toBe('ZERO_COST');
    expect(bootstrap.featureFlags.localModeEnabled).toBe(false);
    expect(bootstrap.featureFlags.tripPlannerEnabled).toBe(false);

    const travelerMode = bootstrap.modes.find((m) => m.mode === 'TRAVELER');
    const localMode = bootstrap.modes.find((m) => m.mode === 'LOCAL');
    expect(travelerMode?.enabled).toBe(true);
    expect(localMode?.enabled).toBe(false);
    expect(localMode?.badgeText).toBe('Próximamente');
  });

  it('permite explorar sin cuenta las 6 categorías principales y las 7 subcategorías de Turismo', async () => {
    const categories = await guestClient.getCategories();
    expect(categories).toHaveLength(6);

    const slugs = categories.map((c) => c.slug);
    expect(slugs).toEqual([
      'comida',
      'turismo',
      'entretenimiento',
      'actividades',
      'eventos',
      'compras',
    ]);

    const turismo = categories.find((c) => c.slug === 'turismo');
    expect(turismo?.subcategories).toHaveLength(7);
    expect(turismo?.subcategories.map((s) => s.slug)).toEqual([
      'miradores',
      'monumentos',
      'naturaleza',
      'museos',
      'cultura',
      'pueblos-y-ciudades',
      'lugares-emblematicos',
    ]);
  });

  it('lista ciudades de Estados Unidos con sus coordenadas geográficas PostGIS', async () => {
    const cities = await guestClient.getCities('US');
    expect(cities.length).toBeGreaterThanOrEqual(7);
    const nyc = cities.find((c) => c.slug === 'new-york');
    expect(nyc).toBeDefined();
    expect(nyc?.stateCode).toBe('NY');
    expect(nyc?.center.lat).toBeCloseTo(40.7128, 3);
    expect(nyc?.center.lng).toBeCloseTo(-74.006, 3);
  });

  it('ejecuta búsquedas espaciales reales con PostGIS (ST_DWithin y ST_Distance) en Nueva York', async () => {
    const res = await guestClient.discoverPlaces({
      lat: 40.7332,
      lng: -74.0052,
      radiusKm: 10,
    });

    expect(res.data.length).toBeGreaterThanOrEqual(2);
    const first = res.data[0]!;
    expect(first.slug).toBe('l-industrie-pizzeria-nyc');
    expect(first.distanceMeters).not.toBeNull();
    expect(first.distanceMeters!).toBeLessThan(50);
    expect(first.priceStatus).toBe('CONFIRMED');
    expect(first.recommendationCount).toBeGreaterThanOrEqual(2);
  });

  it('no inventa precios ni razones cuando un lugar tiene evidencia insuficiente', async () => {
    const detail = await guestClient.getPlaceBySlug('barton-springs-austin');
    expect(detail.avgPriceMin).toBeNull();
    expect(detail.avgPriceMax).toBeNull();
    expect(detail.priceStatus).toBe('INSUFFICIENT_DATA');
    expect(detail.recommendationReason).toContain('Evidencia limitada');
  });

  it('ejecuta el flujo completo de registro, inicio de sesión, perfil, preferencias, refresh y recuperación', async () => {
    const uniqueEmail = `traveler.${Date.now()}@exploro.us`;
    const registered = await guestClient.register({
      email: uniqueEmail,
      password: 'TravelerUS2026',
      displayName: 'Jordan US Traveler',
    });

    expect(registered.user.email).toBe(uniqueEmail);
    expect(registered.tokens.accessToken).toBeTruthy();

    let accessToken = registered.tokens.accessToken;
    const authClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => accessToken,
    });

    const profile = await authClient.getMyProfile();
    expect(profile.displayName).toBe('Jordan US Traveler');
    expect(profile.preferences.personalizationEnabled).toBe(true);

    const updated = await authClient.updateMyPreferences({
      personalizationEnabled: false,
      favoriteCategories: ['comida', 'turismo'],
    });
    expect(updated.preferences.personalizationEnabled).toBe(false);
    expect(updated.preferences.favoriteCategories).toEqual([
      'comida',
      'turismo',
    ]);

    // Probar rotación de refresh token
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: registered.tokens.refreshToken }),
    });
    const refreshBody = (await refreshRes.json()) as {
      success: boolean;
      data: { accessToken: string };
    };
    expect(refreshBody.success).toBe(true);
    accessToken = refreshBody.data.accessToken;

    // Probar recuperación de contraseña
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uniqueEmail }),
    });
    const forgotBody = (await forgotRes.json()) as {
      success: boolean;
      data: { resetTokenForDev?: string };
    };
    expect(forgotBody.success).toBe(true);
    expect(forgotBody.data.resetTokenForDev).toBeTruthy();

    const resetRes = await fetch(`${baseUrl}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: forgotBody.data.resetTokenForDev,
        newPassword: 'NewTravelerPassword99',
      }),
    });
    expect(resetRes.status).toBe(201);

    const reLogin = await guestClient.login({
      email: uniqueEmail,
      password: 'NewTravelerPassword99',
    });
    expect(reLogin.tokens.accessToken).toBeTruthy();
  });
});


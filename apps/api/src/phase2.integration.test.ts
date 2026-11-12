import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';

const AUSTIN = { lat: 30.2672, lng: -97.7431 };
const AUSTIN_SLUGS = [
  'barton-springs-austin',
  'franklin-barbecue-austin',
  'kayak-lady-bird-lake-austin',
];

describe('Fase 2 — Descubrimiento, favoritos, colecciones, personalización y «Sorpréndeme»', () => {
  let app: INestApplication;
  let baseUrl: string;
  let guest: ExploroApiClient;

  const newUser = async (
    label: string
  ): Promise<{ client: ExploroApiClient; email: string }> => {
    const email = `${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@exploro.us`;
    const session = await guest.register({
      email,
      password: 'TravelerUS2026',
      displayName: `Test ${label}`,
    });
    const token = session.tokens.accessToken;
    return {
      email,
      client: new ExploroApiClient({ baseUrl, getAccessToken: () => token }),
    };
  };

  const placeId = async (slug: string): Promise<string> =>
    (await guest.getPlaceBySlug(slug)).id;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 4098;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
    guest = new ExploroApiClient({ baseUrl });
  });

  afterAll(async () => {
    await app?.close();
  });

  // ------------------------------ Búsqueda geográfica ------------------------

  it('respeta el radio configurable con PostGIS y devuelve distancias reales ordenadas', async () => {
    const res = await guest.discoverPlaces({
      ...AUSTIN,
      radiusKm: 20,
      sortBy: 'distance',
    });
    expect(res.data.map((p) => p.slug).sort()).toEqual([...AUSTIN_SLUGS].sort());

    const distances = res.data.map((p) => p.distanceMeters!);
    expect(distances.every((d) => d <= 20_000)).toBe(true);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    expect(res.data[0]?.slug).toBe('kayak-lady-bird-lake-austin');
    expect(res.meta?.sortApplied).toBe('distance');
  });

  it('con radio de 1 km solo incluye lo cercano y "unbounded=false" en la URL no amplía la búsqueda', async () => {
    const response = await fetch(
      `${baseUrl}/discover/places?lat=${AUSTIN.lat}&lng=${AUSTIN.lng}&radiusKm=1&unbounded=false`
    );
    const body = (await response.json()) as {
      data: Array<{ slug: string; distanceMeters: number }>;
    };
    expect(body.data.map((p) => p.slug)).toEqual(['kayak-lady-bird-lake-austin']);
    expect(body.data[0]!.distanceMeters).toBeLessThanOrEqual(1000);
  });

  it('permite buscar sin límite geográfico fijo y conserva la distancia calculada', async () => {
    const res = await guest.discoverPlaces({
      ...AUSTIN,
      radiusKm: 1,
      unbounded: true,
      sortBy: 'distance',
      limit: 50,
    });
    expect(res.meta?.total).toBeGreaterThanOrEqual(13);
    const nyc = res.data.find((p) => p.slug === 'l-industrie-pizzeria-nyc');
    expect(nyc?.distanceMeters).toBeGreaterThan(2_000_000);
  });

  it('lista ciudades y el Top 10+ de lugares de Honduras dentro de 5 km en Colonia Florencia Norte, Tegucigalpa', async () => {
    const hnCities = await guest.getCities('HN');
    expect(hnCities.map((c) => c.slug)).toEqual(
      expect.arrayContaining(['tegucigalpa', 'san-pedro-sula', 'roatan', 'copan-ruinas'])
    );

    const tguPlaces = await guest.discoverPlaces({
      lat: 14.0885,
      lng: -87.1815,
      radiusKm: 5,
      categorySlug: 'comida',
      sortBy: 'recommended',
    });
    expect(tguPlaces.data.length).toBeGreaterThanOrEqual(10);
    expect(tguPlaces.data[0]?.slug).toBe('el-morito-la-hacienda-tegucigalpa');
    expect(tguPlaces.data[1]?.slug).toBe('restaurante-portobello-tegucigalpa');
    expect(tguPlaces.data[2]?.slug).toBe('la-pana-tegucigalpa');
  });

  it('degrada el orden por distancia a recomendado cuando no hay coordenadas', async () => {
    const res = await guest.discoverPlaces({ sortBy: 'distance', limit: 50 });
    expect(res.meta?.sortApplied).toBe('recommended');
    expect(res.data.every((p) => p.distanceMeters === null)).toBe(true);
  });

  it('filtra por categoría y subcategoría, pagina y reporta el total real', async () => {
    const miradores = await guest.discoverPlaces({
      categorySlug: 'turismo',
      subcategorySlug: 'miradores',
    });
    const slugs = miradores.data.map((p) => p.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        'brooklyn-bridge-park-pier-1',
        'griffith-observatory-la',
        'cristo-el-picacho-tegucigalpa',
      ])
    );
    expect(miradores.data.every((p) => p.subcategorySlug === 'miradores')).toBe(true);

    const page = await guest.discoverPlaces({
      categorySlug: 'comida',
      limit: 2,
      page: 1,
    });
    expect(page.data).toHaveLength(2);
    expect(page.meta?.total).toBeGreaterThanOrEqual(4);
    const page2 = await guest.discoverPlaces({
      categorySlug: 'comida',
      limit: 2,
      page: 2,
    });
    expect(page2.data).toHaveLength(2);
    expect(page2.data.map((p) => p.id)).not.toEqual(page.data.map((p) => p.id));
  });

  it('ordena alfabéticamente por nombre y filtra por ciudad', async () => {
    const res = await guest.discoverPlaces({ citySlug: 'austin', sortBy: 'name' });
    const names = res.data.map((p) => p.name);
    expect(names).toEqual(
      [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    );
    expect(res.data).toHaveLength(3);
  });

  it('marca los registros sembrados como datos de demostración y no inventa precios', async () => {
    const res = await guest.discoverPlaces({ limit: 50 });
    expect(res.data.every((p) => p.isDemoData)).toBe(true);

    const museum = res.data.find((p) => p.slug === 'art-institute-of-chicago');
    expect(museum?.avgPriceMin).toBeNull();
    expect(museum?.priceStatus).toBe('INSUFFICIENT_DATA');
    expect(museum?.recommendationReason).toContain('Evidencia limitada');
  });

  it('el detalle incluye establecimiento, actividades con duración conocida y evidencias', async () => {
    const pizza = await guest.getPlaceBySlug('l-industrie-pizzeria-nyc');
    expect(pizza.establishment?.specialties).toContain('Burrata Slice');
    expect(pizza.establishment?.openingHours).toBeNull();
    expect(pizza.evidences.length).toBeGreaterThanOrEqual(2);

    const pier = await guest.getPlaceBySlug('brooklyn-bridge-park-pier-1');
    expect(pier.activities).toHaveLength(1);
    expect(pier.activities[0]?.estimatedDurationMins).toBe(60);

    await expect(guest.getPlaceBySlug('no-existe')).rejects.toBeInstanceOf(
      ExploroApiError
    );
  });

  // ------------------------------ Favoritos ---------------------------------

  it('exige sesión para favoritos y colecciones', async () => {
    const response = await fetch(`${baseUrl}/favorites`);
    expect(response.status).toBe(401);
    const coll = await fetch(`${baseUrl}/collections`);
    expect(coll.status).toBe(401);
  });

  it('guarda y elimina favoritos de forma idempotente y rechaza lugares inexistentes', async () => {
    const { client } = await newUser('fav');
    const id = await placeId('griffith-observatory-la');

    await client.addFavorite(id);
    await client.addFavorite(id);
    let favorites = await client.listFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.place.slug).toBe('griffith-observatory-la');

    await client.removeFavorite(id);
    favorites = await client.listFavorites();
    expect(favorites).toHaveLength(0);

    await expect(
      client.addFavorite('00000000-0000-0000-0000-000000000000')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('aísla favoritos entre usuarios', async () => {
    const a = await newUser('iso-a');
    const b = await newUser('iso-b');
    await a.client.addFavorite(await placeId('baker-beach-san-francisco'));
    expect(await a.client.listFavorites()).toHaveLength(1);
    expect(await b.client.listFavorites()).toHaveLength(0);
  });

  // ------------------------------ Colecciones -------------------------------

  it('gestiona colecciones: crear, nombre único, agregar sin duplicar, detalle, quitar y eliminar', async () => {
    const { client } = await newUser('coll');
    const created = await client.createCollection({ name: 'Plan en Nueva York' });
    expect(created.itemCount).toBe(0);

    await expect(
      client.createCollection({ name: 'plan en nueva york' })
    ).rejects.toMatchObject({ statusCode: 409 });

    const pier = await placeId('brooklyn-bridge-park-pier-1');
    const pizza = await placeId('l-industrie-pizzeria-nyc');
    await client.addCollectionItem(created.id, pier);
    await client.addCollectionItem(created.id, pier);
    const withTwo = await client.addCollectionItem(created.id, pizza);
    expect(withTwo.itemCount).toBe(2);

    const detail = await client.getCollection(created.id);
    expect(detail.places?.map((p) => p.slug).sort()).toEqual([
      'brooklyn-bridge-park-pier-1',
      'l-industrie-pizzeria-nyc',
    ]);

    const afterRemove = await client.removeCollectionItem(created.id, pier);
    expect(afterRemove.itemCount).toBe(1);

    const list = await client.listCollections();
    expect(list.find((c) => c.id === created.id)?.itemCount).toBe(1);

    await client.deleteCollection(created.id);
    expect(await client.listCollections()).toHaveLength(0);
    // Eliminar la colección no elimina el lugar del catálogo.
    expect((await guest.getPlaceBySlug('brooklyn-bridge-park-pier-1')).id).toBe(pier);
  });

  it('no permite acceder a la colección de otro usuario', async () => {
    const owner = await newUser('owner');
    const intruder = await newUser('intruder');
    const collection = await owner.client.createCollection({ name: 'Privada' });

    await expect(intruder.client.getCollection(collection.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      intruder.client.addCollectionItem(collection.id, await placeId('baker-beach-san-francisco'))
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(intruder.client.deleteCollection(collection.id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  // ------------------------------ Personalización ---------------------------

  it('la personalización solo aplica con sesión y puede activarse o desactivarse', async () => {
    const { client } = await newUser('pers');
    const guestRes = await guest.discoverPlaces({ limit: 50 });
    expect(guestRes.data[0]?.slug).toBe('l-industrie-pizzeria-nyc');
    expect(guestRes.meta?.personalizationApplied).toBe(false);

    await client.updateMyPreferences({
      personalizationEnabled: true,
      favoriteCategories: ['turismo'],
    });
    const on = await client.discoverPlaces({ limit: 50 });
    expect(on.meta?.personalizationApplied).toBe(true);
    expect(on.data[0]?.categorySlug).toBe('turismo');

    const offByRequest = await client.discoverPlaces({
      limit: 50,
      applyPreferences: false,
    });
    expect(offByRequest.meta?.personalizationApplied).toBe(false);
    expect(offByRequest.data[0]?.slug).toBe('l-industrie-pizzeria-nyc');

    await client.updateMyPreferences({ personalizationEnabled: false });
    const offByPreference = await client.discoverPlaces({ limit: 50 });
    expect(offByPreference.meta?.personalizationApplied).toBe(false);
    expect(offByPreference.data[0]?.slug).toBe('l-industrie-pizzeria-nyc');
  });

  // ------------------------------ Sorpréndeme -------------------------------

  it('«Sorpréndeme» respeta el presupuesto: nunca sugiere un precio verificado superior', async () => {
    const res = await guest.surpriseMe({
      citySlug: 'new-york',
      budgetTier: 'FREE',
      availableMinutes: 240,
      companionType: 'COUPLE',
      seed: 5,
    });
    expect(res.suggestions.length).toBeGreaterThan(0);
    for (const s of res.suggestions) {
      if (s.budgetFit === 'CONFIRMED') {
        expect(s.place.priceTier).toBe('FREE');
      } else {
        expect(s.place.priceTier).toBe('UNKNOWN');
      }
      expect(['LOW', 'MEDIUM', 'HIGH', 'LUXURY']).not.toContain(s.place.priceTier);
    }
    if (res.suggestions.some((s) => s.budgetFit !== 'CONFIRMED')) {
      expect(res.notice).toContain('sin verificar');
    }
  });

  it('«Sorpréndeme» respeta el tiempo disponible y la ubicación', async () => {
    const res = await guest.surpriseMe({
      coordinates: AUSTIN,
      radiusKm: 25,
      budgetTier: 'HIGH',
      availableMinutes: 60,
      seed: 11,
    });
    const slugs = res.suggestions.map((s) => s.place.slug);
    expect(slugs).not.toContain('kayak-lady-bird-lake-austin'); // dura 120 min
    expect(slugs.every((s) => AUSTIN_SLUGS.includes(s))).toBe(true);
    expect(res.suggestions.every((s) => s.estimatedTravelMinutes !== null)).toBe(true);
  });

  it('«Sorpréndeme» es reproducible con la misma semilla', async () => {
    const input = {
      citySlug: 'miami',
      budgetTier: 'HIGH' as const,
      availableMinutes: 300,
      seed: 99,
    };
    const first = await guest.surpriseMe(input);
    const second = await guest.surpriseMe(input);
    expect(second.suggestions.map((s) => s.place.id)).toEqual(
      first.suggestions.map((s) => s.place.id)
    );
  });

  it('«Sorpréndeme» informa cuando no hay opciones en lugar de inventarlas', async () => {
    const res = await guest.surpriseMe({
      citySlug: 'chicago',
      budgetTier: 'FREE',
      availableMinutes: 30,
      seed: 1,
    });
    expect(res.suggestions).toHaveLength(0);
    expect(res.notice).toContain('No encontramos');
  });

  it('«Sorpréndeme» valida los parámetros', async () => {
    const response = await fetch(`${baseUrl}/discover/surprise-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableMinutes: 5 }),
    });
    expect(response.status).toBe(400);
  });
});


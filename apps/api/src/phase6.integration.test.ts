import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';
import { DatabaseService } from './database/database.service';

describe('Fase 6 — Planificador de Viajes Asistido (Oculto bajo Feature Flag)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let publicClient: ExploroApiClient;
  let internalClient: ExploroApiClient;
  let db: DatabaseService;
  let testUserId: string;
  let samplePlace1Id: string; // Brooklyn Bridge Park
  let samplePlace2Id: string; // L'Industrie Pizzeria
  let samplePlace3Id: string; // Comedy Cellar
  let sampleAlternativePlaceId: string; // Joe's Pizza NYC (test place)

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 4106;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    db = app.get(DatabaseService);

    // 1. Asegurar que feature_flags tenga trip_planner_enabled = false
    await db.query(
      `INSERT INTO feature_flags (key, enabled, description)
       VALUES ('trip_planner_enabled', false, 'Trip planner hidden feature flag')
       ON CONFLICT (key) DO UPDATE SET enabled = false`
    );

    // 2. Registrar usuario de prueba
    const guestClient = new ExploroApiClient({ baseUrl });
    const email = `traveler.phase6.${Date.now()}@exploro.test`;
    const session = await guestClient.register({
      email,
      password: 'TravelerPhase6Password!',
      displayName: 'Diana Exploradora',
    });
    testUserId = session.user.id;
    const token = session.tokens.accessToken;

    // Cliente público (sin cabecera interna -> debe ser bloqueado por el Feature Flag)
    publicClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => token,
    });

    // Cliente interno (con cabecera x-exploro-internal -> acceso concedido)
    internalClient = new ExploroApiClient({
      baseUrl,
      getAccessToken: () => token,
      defaultHeaders: {
        'x-exploro-internal': 'true',
      },
    });

    // 3. Obtener lugares de prueba en New York
    const p1 = await db.query<{ id: string }>(
      `SELECT id FROM places WHERE slug = 'brooklyn-bridge-park-pier-1' LIMIT 1`
    );
    const p2 = await db.query<{ id: string }>(
      `SELECT id FROM places WHERE slug = 'l-industrie-pizzeria-nyc' LIMIT 1`
    );
    const p3 = await db.query<{ id: string }>(
      `SELECT id FROM places WHERE slug = 'comedy-cellar-nyc' LIMIT 1`
    );

    samplePlace1Id = p1.rows[0]?.id;
    samplePlace2Id = p2.rows[0]?.id;
    samplePlace3Id = p3.rows[0]?.id;

    // 4. Crear un lugar muy cercano para probar Nivel 1 en alternativas (Joe's Pizza NYC en Greenwich Village)
    const foodCat = await db.query<{ id: string }>(
      `SELECT id FROM categories WHERE slug = 'comida' LIMIT 1`
    );
    const nyCity = await db.query<{ id: string }>(
      `SELECT id FROM cities WHERE slug = 'new-york' LIMIT 1`
    );

    const insertedAlt = await db.query<{ id: string }>(
      `INSERT INTO places (
         city_id, category_id, name, normalized_name, slug, description,
         address_text, location, price_tier, avg_price_min, currency_code, is_active
       ) VALUES (
         $1, $2, 'Joe''s Pizza Greenwich Village', 'joes pizza greenwich village',
         'joes-pizza-greenwich-village', 'Icónica pizzería por porción en Manhattan',
         '7 Carmine St, New York, NY 10014',
         ST_SetSRID(ST_MakePoint(-74.0021, 40.7305), 4326),
         'LOW', 5.00, 'USD', TRUE
       ) ON CONFLICT (slug) DO UPDATE SET is_active = TRUE
       RETURNING id`,
      [nyCity.rows[0].id, foodCat.rows[0].id]
    );
    sampleAlternativePlaceId = insertedAlt.rows[0].id;
  });

  afterAll(async () => {
    // Limpieza de lugar alternativo de prueba
    if (sampleAlternativePlaceId) {
      await db.query(`DELETE FROM places WHERE id = $1`, [
        sampleAlternativePlaceId,
      ]);
    }
    await app?.close();
  });

  // ---------------------------------------------------------------------------
  // 1. FEATURE FLAG: Bloqueo de acceso público (Paso 6.1 y 6.7)
  // ---------------------------------------------------------------------------
  it('1. rechaza el acceso a usuarios públicos cuando la bandera está deshabilitada (HTTP 403)', async () => {
    try {
      await publicClient.listTrips();
      expect.fail('Debió haber arrojado error 403 Forbidden');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ExploroApiError);
      const apiErr = err as ExploroApiError;
      expect(apiErr.statusCode).toBe(403);
      expect(apiErr.message).toContain('deshabilitado para usuarios públicos');
    }
  });

  // ---------------------------------------------------------------------------
  // 2. FEATURE FLAG: Acceso permitido con cabecera interna (Paso 6.1)
  // ---------------------------------------------------------------------------
  it('2. permite acceso cuando se envía la cabecera x-exploro-internal: true', async () => {
    const trips = await internalClient.listTrips();
    expect(Array.isArray(trips)).toBe(true);
    expect(trips.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 3. CREACIÓN MANUAL DE VIAJE Y DÍAS AUTOMÁTICOS (Paso 6.1)
  // ---------------------------------------------------------------------------
  let createdTripId: string;
  let firstDayId: string;
  let secondDayId: string;

  it('3. crea un viaje manual con días auto-generados según las fechas', async () => {
    const trip = await internalClient.createTrip({
      citySlug: 'new-york',
      title: 'Aventura en Nueva York Otoño 2026',
      description: 'Exploración cultural y gastronómica de Manhattan y Brooklyn',
      startDate: '2026-10-15',
      endDate: '2026-10-17', // 3 días: 15, 16, 17
      budgetTier: 'MEDIUM',
      travelStyles: ['CULTURAL', 'GASTRONOMICO'],
      flexibilityMinutes: 15,
    });

    expect(trip.id).toBeDefined();
    expect(trip.title).toBe('Aventura en Nueva York Otoño 2026');
    expect(trip.status).toBe('DRAFT');
    expect(trip.days).toHaveLength(3);

    expect(trip.days![0].dayNumber).toBe(1);
    expect(trip.days![0].date).toBe('2026-10-15');
    expect(trip.days![1].dayNumber).toBe(2);
    expect(trip.days![1].date).toBe('2026-10-16');
    expect(trip.days![2].dayNumber).toBe(3);
    expect(trip.days![2].date).toBe('2026-10-17');

    createdTripId = trip.id;
    firstDayId = trip.days![0].id;
    secondDayId = trip.days![1].id;
  });

  // ---------------------------------------------------------------------------
  // 4. AGREGAR ACTIVIDADES CON CÁLCULO DE DISTANCIA POSTGIS (Paso 6.1)
  // ---------------------------------------------------------------------------
  let item1Id: string;
  let item2Id: string;

  it('4. agrega actividades calculando distancia y tiempo de traslado vía PostGIS ST_Distance', async () => {
    // Actividad 1: Brooklyn Bridge Park (mañana)
    const item1 = await internalClient.createTripItem(
      createdTripId,
      firstDayId,
      {
        placeId: samplePlace1Id,
        customTitle: 'Vistas panorámicas en Brooklyn Bridge Park',
        startTime: '10:00',
        durationMinutes: 90,
        notes: 'Caminar por el muelle 1 y tomar fotos',
      }
    );

    expect(item1.id).toBeDefined();
    expect(item1.orderIndex).toBe(0);
    expect(item1.transitDistanceMetersFromPrev).toBe(0);
    expect(item1.transitMinutesFromPrev).toBe(0);
    item1Id = item1.id;

    // Actividad 2: L'Industrie Pizzeria (almuerzo)
    const item2 = await internalClient.createTripItem(
      createdTripId,
      firstDayId,
      {
        placeId: samplePlace2Id,
        customTitle: "Almuerzo en L'Industrie Pizzeria",
        startTime: '12:30',
        durationMinutes: 60,
        notes: 'Probar la pizza con burrata',
      }
    );

    expect(item2.id).toBeDefined();
    expect(item2.orderIndex).toBe(1);
    // PostGIS calcula la distancia entre Brooklyn Bridge Park y West Village (~3.5 a 4.5 km)
    expect(item2.transitDistanceMetersFromPrev).toBeGreaterThan(1000);
    expect(item2.transitMinutesFromPrev).toBeGreaterThan(10);
    item2Id = item2.id;
  });

  // ---------------------------------------------------------------------------
  // 5. REORDENAR ACTIVIDADES DE UN DÍA (Paso 6.1)
  // ---------------------------------------------------------------------------
  it('5. reordena actividades en un día y actualiza order_index', async () => {
    // Invertir orden: item2 primero, luego item1
    const reordered = await internalClient.reorderTripItems(
      createdTripId,
      firstDayId,
      {
        itemIdsInOrder: [item2Id, item1Id],
      }
    );

    expect(reordered).toHaveLength(2);
    expect(reordered[0].id).toBe(item2Id);
    expect(reordered[0].orderIndex).toBe(0);
    expect(reordered[1].id).toBe(item1Id);
    expect(reordered[1].orderIndex).toBe(1);

    // Restaurar orden original para los siguientes tests
    await internalClient.reorderTripItems(createdTripId, firstDayId, {
      itemIdsInOrder: [item1Id, item2Id],
    });
  });

  // ---------------------------------------------------------------------------
  // 6. MOTOR DE PLANIFICACIÓN ASISTIDA DETERMINISTA (Paso 6.2 y 6.3)
  // ---------------------------------------------------------------------------
  it('6. genera itinerario asistido determinista con bloques de mañana, almuerzo y tarde', async () => {
    const plan = await internalClient.generateAssistedPlan({
      citySlug: 'new-york',
      title: 'Nueva York en 1 Día — Asistido',
      startDate: '2026-11-20',
      endDate: '2026-11-20', // 1 solo día
      budgetTier: 'MEDIUM',
      travelStyles: ['CULTURAL'],
      flexibilityMinutes: 15,
    });

    expect(plan.id).toBeDefined();
    expect(plan.days).toHaveLength(1);
    const day = plan.days![0];
    expect(day.items).toBeDefined();
    expect(day.items!.length).toBeGreaterThanOrEqual(2);

    // Verificar que los ítems están cronológicamente ordenados
    const startTimes = day.items!.map((it) => it.startTime);
    for (let i = 1; i < startTimes.length; i++) {
      expect(startTimes[i]! >= startTimes[i - 1]!).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // 7. ALTERNATIVAS CLASIFICADAS EN 3 NIVELES (Paso 6.4)
  // ---------------------------------------------------------------------------
  it('7. clasifica alternativas en 3 niveles (Muy similares, Relacionadas, Requiere ajustes)', async () => {
    const alts = await internalClient.getActivityAlternatives(
      createdTripId,
      item2Id, // L'Industrie Pizzeria (comida, West Village)
      15
    );

    expect(alts).toBeDefined();
    expect(alts.verySimilar).toBeDefined();
    expect(alts.relatedExperiences).toBeDefined();
    expect(alts.requiresAdjustments).toBeDefined();

    // Nivel 1: Joe's Pizza (misma categoría comida, a ~400m de distancia en Manhattan)
    expect(alts.verySimilar.length).toBeGreaterThanOrEqual(1);
    const topSimilar = alts.verySimilar[0];
    expect(topSimilar.matchLevel).toBe('VERY_SIMILAR');
    expect(topSimilar.distanceMetersFromOriginal).toBeLessThan(2500);
    expect(topSimilar.explanation).toBeDefined();

    // Nivel 2 o 3: Lugares en otras zonas o ciudades lejanas
    expect(
      alts.relatedExperiences.length + alts.requiresAdjustments.length
    ).toBeGreaterThan(0);
    if (alts.requiresAdjustments.length > 0) {
      expect(alts.requiresAdjustments[0].matchLevel).toBe('REQUIRES_ADJUSTMENTS');
    }
  });

  // ---------------------------------------------------------------------------
  // 8. PREVISUALIZACIÓN DE REORGANIZACIÓN INTELIGENTE (Paso 6.6)
  // ---------------------------------------------------------------------------
  it('8. calcula el impacto de reorganización con explicaciones sin alterar la base de datos', async () => {
    // Supongamos que la actividad 1 (Brooklyn Bridge Park) se retrasa de 10:00 a 11:30 (90 min de retraso)
    const preview = await internalClient.previewReorganization(
      createdTripId,
      item1Id,
      {
        newStartTime: '11:30',
        newDurationMinutes: 90,
      }
    );

    expect(preview.requiresApproval).toBe(true);
    expect(preview.affectedCount).toBeGreaterThanOrEqual(1);
    expect(preview.shiftedItems.length).toBeGreaterThanOrEqual(1);

    const affectedItem = preview.shiftedItems[0];
    expect(affectedItem.itemId).toBe(item2Id);
    expect(affectedItem.shiftMinutes).toBeGreaterThan(0);
    expect(preview.reason).toContain('desplazar');

    // Verificar que en la base de datos NO se modificó aún (gobernanza intacta)
    const tripCheck = await internalClient.getTripById(createdTripId);
    const item2Check = tripCheck.days![0].items!.find((it) => it.id === item2Id);
    expect(item2Check?.startTime?.slice(0, 5)).toBe('12:30');
  });

  // ---------------------------------------------------------------------------
  // 9. APLICAR REORGANIZACIÓN APROBADA POR EL USUARIO (Paso 6.6)
  // ---------------------------------------------------------------------------
  it('9. aplica la reorganización tras confirmación explícita del usuario', async () => {
    // 1. Actualizar el ítem inicial
    await internalClient.updateTripItem(createdTripId, item1Id, {
      startTime: '11:30',
      durationMinutes: 90,
    });

    // 2. Aplicar el desplazamiento a los ítems subsecuentes afectados
    const applyRes = await internalClient.applyReorganization(createdTripId, {
      affectedItemIds: [item2Id],
      shiftMinutes: 90, // Desplazar 90 minutos (de 12:30 a 14:00)
    });

    expect(applyRes.success).toBe(true);
    expect(applyRes.updatedCount).toBe(1);

    // 3. Verificar que el ítem 2 ahora comienza a las 14:00
    const tripUpdated = await internalClient.getTripById(createdTripId);
    const item2Updated = tripUpdated.days![0].items!.find(
      (it) => it.id === item2Id
    );
    expect(item2Updated?.startTime?.slice(0, 5)).toBe('14:00');
  });

  // ---------------------------------------------------------------------------
  // 10. PREVENCIÓN DE HORARIOS IMPOSIBLES / MEDIANOCHE (Paso 6.7)
  // ---------------------------------------------------------------------------
  it('10. detecta sobrepaso de medianoche y marca scheduleOverflowsDay en la reorganización', async () => {
    // Intentar reorganizar para que empiece a las 23:00 con 120 min de duración
    const preview = await internalClient.previewReorganization(
      createdTripId,
      item1Id,
      {
        newStartTime: '23:00',
        newDurationMinutes: 120,
      }
    );

    // El desplazamiento excede el límite del día (23:30)
    expect(preview.scheduleOverflowsDay).toBe(true);
    expect(preview.recommendationMessage).toContain('23:30');
  });
});

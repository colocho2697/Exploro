import { describe, expect, it } from 'vitest';
import {
  applyReorganizationSchema,
  assistedPlanRequestSchema,
  completeActivityReviewSchema,
  coordinatesSchema,
  createEvidenceSchema,
  createSourceSchema,
  createTripItemSchema,
  createTripSchema,
  discoverPlacesQuerySchema,
  explainPlaceBodySchema,
  extractAspectsBodySchema,
  geoAutocompleteQuerySchema,
  geoRouteSchema,
  registerSchema,
  reorderTripItemsSchema,
  startActivitySchema,
  surpriseMeRequestSchema,
  updatePreferencesSchema,
  verifyVisitSchema,
} from './index';

describe('@exploro/validation schemas', () => {
  it('valida un registro correcto y normaliza el email a minúsculas', () => {
    const parsed = registerSchema.parse({
      email: '  Traveler.US@Exploro.app ',
      password: 'SafePassword123',
      displayName: 'Alex Traveler',
    });

    expect(parsed.email).toBe('traveler.us@exploro.app');
    expect(parsed.displayName).toBe('Alex Traveler');
  });

  it('rechaza contraseñas débiles sin números o mayúsculas', () => {
    const result = registerSchema.safeParse({
      email: 'user@exploro.app',
      password: 'weakpassword',
      displayName: 'Alex',
    });

    expect(result.success).toBe(false);
  });

  it('valida coordenadas de Estados Unidos (ej. Nueva York) y rechaza coordenadas fuera de rango', () => {
    const valid = coordinatesSchema.safeParse({ lat: 40.7128, lng: -74.006 });
    expect(valid.success).toBe(true);

    const invalid = coordinatesSchema.safeParse({ lat: 105.0, lng: -74.006 });
    expect(invalid.success).toBe(false);
  });

  it('aplica valores por defecto coherentes en búsquedas geográficas', () => {
    const query = discoverPlacesQuerySchema.parse({
      citySlug: 'new-york',
      categorySlug: 'comida',
    });

    expect(query.radiusKm).toBe(15);
    expect(query.unbounded).toBe(false);
    expect(query.applyPreferences).toBe(true);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('interpreta correctamente los booleanos "false"/"true" de la query string', () => {
    const off = discoverPlacesQuerySchema.parse({
      unbounded: 'false',
      applyPreferences: 'false',
    });
    expect(off.unbounded).toBe(false);
    expect(off.applyPreferences).toBe(false);

    const on = discoverPlacesQuerySchema.parse({
      unbounded: 'true',
      applyPreferences: '1',
    });
    expect(on.unbounded).toBe(true);
    expect(on.applyPreferences).toBe(true);

    expect(
      discoverPlacesQuerySchema.safeParse({ unbounded: 'talvez' }).success
    ).toBe(false);
  });

  it('acepta criterios de ordenamiento y rechaza valores desconocidos', () => {
    expect(discoverPlacesQuerySchema.parse({}).sortBy).toBe('recommended');
    expect(discoverPlacesQuerySchema.parse({ sortBy: 'distance' }).sortBy).toBe(
      'distance'
    );
    expect(
      discoverPlacesQuerySchema.safeParse({ sortBy: 'aleatorio' }).success
    ).toBe(false);
  });

  it('permite activar o desactivar la personalización en preferencias', () => {
    const prefs = updatePreferencesSchema.parse({
      personalizationEnabled: false,
      favoriteCategories: ['comida', 'turismo'],
    });

    expect(prefs.personalizationEnabled).toBe(false);
    expect(prefs.favoriteCategories).toEqual(['comida', 'turismo']);
  });

  it('valida una solicitud de Sorpréndeme con tiempo y compañía', () => {
    const surprise = surpriseMeRequestSchema.parse({
      citySlug: 'miami',
      budgetTier: 'LOW',
      availableMinutes: 120,
      companionType: 'COUPLE',
    });

    expect(surprise.citySlug).toBe('miami');
    expect(surprise.budgetTier).toBe('LOW');
    expect(surprise.companionType).toBe('COUPLE');
  });

  it('valida consultas de autocomplete y ruteo para mapas de costo cero (Fase 3)', () => {
    const autocomplete = geoAutocompleteQuerySchema.parse({
      q: 'Central Park',
      limit: '10',
    });
    expect(autocomplete.q).toBe('Central Park');
    expect(autocomplete.limit).toBe(10);

    const route = geoRouteSchema.parse({
      origin: { lat: 40.7128, lng: -74.006 },
      destination: { lat: 40.7829, lng: -73.9654 },
      mode: 'driving',
    });
    expect(route.origin.lat).toBe(40.7128);
    expect(route.mode).toBe('driving');
  });

  it('valida el registro de fuentes externas legales y rechaza códigos no estándar', () => {
    const validSource = createSourceSchema.parse({
      code: 'REDDIT_AUSTIN_FOOD',
      name: 'Reddit Austin Food & Drinks',
      sourceType: 'EXTERNAL_COMMUNITY',
      baseTrustWeight: 0.85,
    });
    expect(validSource.code).toBe('REDDIT_AUSTIN_FOOD');
    expect(validSource.baseTrustWeight).toBe(0.85);

    const invalidSource = createSourceSchema.safeParse({
      code: 'bad code with spaces',
      name: 'Test',
      sourceType: 'BLOG',
    });
    expect(invalidSource.success).toBe(false);
  });

  it('valida la ingesta de evidencias y restringe identificadores y longitudes', () => {
    const evidence = createEvidenceSchema.parse({
      placeId: '77777777-7777-7777-7777-777777777701',
      sourceCode: 'REDDIT_US_FOOD',
      extractedSnippet: 'Excelente pizza de masa madre en West Village por menos de $15.',
      evidenceType: 'OPINION',
      confidenceScore: 0.9,
    });
    expect(evidence.placeId).toBe('77777777-7777-7777-7777-777777777701');
    expect(evidence.confidenceScore).toBe(0.9);

    const invalidShort = createEvidenceSchema.safeParse({
      placeId: '77777777-7777-7777-7777-777777777701',
      sourceCode: 'REDDIT_US_FOOD',
      extractedSnippet: 'Ok', // muy corto (< 5)
    });
    expect(invalidShort.success).toBe(false);
  });

  it('valida la extracción de aspectos con lista de snippets (Fase 4)', () => {
    const valid = extractAspectsBodySchema.parse({
      categorySlug: 'comida',
      snippets: [
        'Masa crujiente y salsa de tomate fresco inigualable',
        'La burrata slice es la mejor opción pero suele haber fila',
      ],
    });
    expect(valid.categorySlug).toBe('comida');
    expect(valid.snippets).toHaveLength(2);

    const empty = extractAspectsBodySchema.safeParse({
      categorySlug: 'comida',
      snippets: [],
    });
    expect(empty.success).toBe(false);
  });

  it('valida el payload de generación de explicaciones anti-alucinación (Fase 4)', () => {
    const valid = explainPlaceBodySchema.parse({
      placeId: '77777777-7777-7777-7777-777777777701',
      placeName: "L'Industrie Pizzeria",
      categorySlug: 'comida',
      evidences: [
        {
          evidence_id: 'ev-1',
          source_code: 'INFATUATION_NYC',
          snippet: 'La masa fermentada por 48 horas crea una textura crujiente.',
          confidence_score: 0.95,
        },
      ],
    });
    expect(valid.placeName).toBe("L'Industrie Pizzeria");
    expect(valid.evidences[0].confidence_score).toBe(0.95);

    const invalidUuid = explainPlaceBodySchema.safeParse({
      placeId: 'not-a-uuid',
      placeName: 'Test Place',
      categorySlug: 'comida',
      evidences: [],
    });
    expect(invalidUuid.success).toBe(false);
  });

  // FASE 5: Pruebas de esquemas de actividades, verificación y opiniones adaptadas
  it('valida el inicio de actividad con lugar válido (Fase 5)', () => {
    const valid = startActivitySchema.parse({
      placeId: '77777777-7777-7777-7777-777777777701',
      activityTitle: 'Probar slice de Burrata',
    });
    expect(valid.placeId).toBe('77777777-7777-7777-7777-777777777701');
    expect(valid.activityTitle).toBe('Probar slice de Burrata');

    const invalidUuid = startActivitySchema.safeParse({
      placeId: 'invalid-id',
    });
    expect(invalidUuid.success).toBe(false);
  });

  it('valida la verificación de visita por GPS o QR y rechaza payloads vacíos (Fase 5)', () => {
    const validGps = verifyVisitSchema.parse({
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(validGps.latitude).toBe(40.7128);

    const validQr = verifyVisitSchema.parse({
      qrToken: 'EXPLORO-QR-BROOKLYN-PIER1',
    });
    expect(validQr.qrToken).toBe('EXPLORO-QR-BROOKLYN-PIER1');

    const invalidEmpty = verifyVisitSchema.safeParse({});
    expect(invalidEmpty.success).toBe(false);
  });

  it('valida el formulario corto y adaptado de opiniones de restaurantes y turismo (Fase 5)', () => {
    const restaurantReview = completeActivityReviewSchema.parse({
      reviewType: 'RESTAURANT',
      restaurantReview: {
        tasteQuality: 5,
        serviceRating: 4,
        valueForMoney: 'EXCELLENT',
        amountPaid: 16.5,
        recommendedDish: 'Burrata Pizza Slice',
        wouldReturn: true,
        comment: 'Increíble corteza crujiente.',
      },
      wouldReturnOrRecommend: true,
    });
    expect(restaurantReview.reviewType).toBe('RESTAURANT');
    expect(restaurantReview.restaurantReview?.tasteQuality).toBe(5);

    const tourismReview = completeActivityReviewSchema.parse({
      reviewType: 'TOURISM',
      tourismReview: {
        worthIt: true,
        durationSpent: '1_TO_2_HOURS',
        amountPaid: 0,
        accessibility: 'EASY',
        recommendedItem: 'Vistas del sunset hacia Manhattan',
        caveatOrTip: 'Llegar temprano para encontrar lugar en la banca.',
      },
      wouldReturnOrRecommend: true,
    });
    expect(tourismReview.reviewType).toBe('TOURISM');
    expect(tourismReview.tourismReview?.worthIt).toBe(true);
  });

  // FASE 6: Pruebas de esquemas del Planificador de Viajes
  it('valida la creación de un viaje con rango de fechas y estilos combinados (Fase 6)', () => {
    const valid = createTripSchema.parse({
      citySlug: 'new-york',
      title: 'Escapada cultural y gastronómica a NYC',
      startDate: '2026-12-01',
      endDate: '2026-12-04',
      budgetTier: 'MEDIUM',
      travelStyles: ['CULTURAL', 'GASTRONOMICO'],
      flexibilityMinutes: 30,
    });

    expect(valid.title).toBe('Escapada cultural y gastronómica a NYC');
    expect(valid.travelStyles).toEqual(['CULTURAL', 'GASTRONOMICO']);
    expect(valid.flexibilityMinutes).toBe(30);

    // Fecha fin anterior a fecha inicio
    const invalidDates = createTripSchema.safeParse({
      title: 'Viaje inválido',
      startDate: '2026-12-10',
      endDate: '2026-12-05',
    });
    expect(invalidDates.success).toBe(false);
  });

  it('valida la solicitud de planificación asistida con estilos y flexibilidad (Fase 6)', () => {
    const valid = assistedPlanRequestSchema.parse({
      citySlug: 'new-york',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
      budgetTier: 'LOW',
      travelStyles: ['FAMILIAR', 'NATURALEZA'],
      flexibilityMinutes: 15,
    });
    expect(valid.citySlug).toBe('new-york');
    expect(valid.travelStyles).toHaveLength(2);

    const missingStyles = assistedPlanRequestSchema.safeParse({
      citySlug: 'new-york',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
      travelStyles: [],
    });
    expect(missingStyles.success).toBe(false);
  });

  it('valida ítems de itinerario y reordenamiento (Fase 6)', () => {
    const item = createTripItemSchema.parse({
      placeId: '77777777-7777-7777-7777-777777777701',
      customTitle: 'Almuerzo pizza burrata',
      startTime: '13:00',
      durationMinutes: 45,
    });
    expect(item.startTime).toBe('13:00');
    expect(item.durationMinutes).toBe(45);

    const reorder = reorderTripItemsSchema.parse({
      itemIdsInOrder: [
        '77777777-7777-7777-7777-777777777701',
        '77777777-7777-7777-7777-777777777702',
      ],
    });
    expect(reorder.itemIdsInOrder).toHaveLength(2);

    const reorg = applyReorganizationSchema.parse({
      shiftMinutes: 30,
      affectedItemIds: ['77777777-7777-7777-7777-777777777702'],
    });
    expect(reorg.shiftMinutes).toBe(30);
  });
});




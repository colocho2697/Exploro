import { describe, expect, it } from 'vitest';
import {
  coordinatesSchema,
  createEvidenceSchema,
  createSourceSchema,
  discoverPlacesQuerySchema,
  explainPlaceBodySchema,
  extractAspectsBodySchema,
  geoAutocompleteQuerySchema,
  geoRouteSchema,
  registerSchema,
  surpriseMeRequestSchema,
  updatePreferencesSchema,
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
});




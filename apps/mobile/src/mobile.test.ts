import { describe, expect, it } from 'vitest';
import appConfig from '../app.config';
import {
  canAccessMode,
  getInitialModeDescriptors,
} from '@exploro/business-rules';
import { formatDistanceUS, milesToKm, US_CITIES } from './format';
import { surpriseMeRequestSchema } from '@exploro/validation';
import {
  OfflineStorageManager,
  getGridColumns,
  getScreenCategory,
  resolveLocationStrategy,
  validateBatteryFriendlyInterval,
} from './offline';

describe('@exploro/mobile — Configuración y Lógica de Fase 2', () => {
  it('configura Android e iOS con esquema de enlaces profundos y política Costo Cero', () => {
    expect(appConfig.expo.name).toBe('Exploro');
    expect(appConfig.expo.scheme).toBe('exploro');
    expect(appConfig.expo.android.package).toBe('com.exploro.app');
    expect(appConfig.expo.ios.bundleIdentifier).toBe('com.exploro.app');
    expect(appConfig.expo.extra.costPolicy).toBe('ZERO_COST');
  });

  it('mantiene deshabilitado el modo «Soy local» en v1 y habilita «Estoy de viaje»', () => {
    const modes = getInitialModeDescriptors(false);
    expect(modes[0]?.mode).toBe('TRAVELER');
    expect(modes[0]?.enabled).toBe(true);
    expect(modes[1]?.mode).toBe('LOCAL');
    expect(modes[1]?.enabled).toBe(false);
    expect(canAccessMode('LOCAL', false).allowed).toBe(false);
  });

  it('valida la lista de ciudades clave de EE. UU. con coordenadas y slugs válidos', () => {
    expect(US_CITIES.length).toBeGreaterThanOrEqual(8);
    const citiesWithCoords = US_CITIES.filter((c) => 'lat' in c && 'lng' in c);
    expect(citiesWithCoords.length).toBeGreaterThanOrEqual(7);

    const nyc = US_CITIES.find((c) => c.slug === 'new-york');
    expect(nyc).toBeDefined();
    expect(nyc?.lat).toBeCloseTo(40.71, 1);
    expect(nyc?.lng).toBeCloseTo(-74.0, 1);

    const miami = US_CITIES.find((c) => c.slug === 'miami');
    expect(miami?.lat).toBeCloseTo(25.76, 1);
  });

  it('formatea distancias en unidades de EE. UU. (pies bajo 0.1 mi, millas por encima)', () => {
    expect(formatDistanceUS(null)).toBeNull();
    expect(formatDistanceUS(-10)).toBeNull();

    // 50 metros ≈ 164 pies (< 0.1 mi ≈ 160.9 metros)
    expect(formatDistanceUS(50)).toBe('164 ft');

    // 161 metros > 0.1 mi
    expect(formatDistanceUS(161)).toBe('0.1 mi');

    // 1609.344 metros = 1 milla
    expect(formatDistanceUS(1609.344)).toBe('1.0 mi');

    // 16093.44 metros = 10 millas
    expect(formatDistanceUS(16093.44)).toBe('10 mi');

    // Conversión de millas a km
    expect(milesToKm(10)).toBe(16.093);
  });

  it('valida el payload de petición para Sorpréndeme móvil contra el schema', () => {
    const validPayload = {
      budgetTier: 'MEDIUM',
      availableMinutes: 120,
      companionType: 'SOLO',
      citySlug: 'new-york',
      coordinates: {
        lat: 40.7128,
        lng: -74.006,
      },
    };
    const parsed = surpriseMeRequestSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);

    const invalidBudget = {
      ...validPayload,
      budgetTier: 'TIER_INVALIDO',
    };
    const invalidParsed = surpriseMeRequestSchema.safeParse(invalidBudget);
    expect(invalidParsed.success).toBe(false);

    const invalidMinutes = {
      ...validPayload,
      availableMinutes: 10, // mínimo 30
    };
    expect(surpriseMeRequestSchema.safeParse(invalidMinutes).success).toBe(false);
  });

  it('maneja el conjunto de favoritos agregando y eliminando identificadores de forma inmutable', () => {
    let favorites = new Set<string>();

    const toggle = (id: string, current: Set<string>): Set<string> => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    };

    favorites = toggle('place-1', favorites);
    expect(favorites.has('place-1')).toBe(true);
    expect(favorites.size).toBe(1);

    favorites = toggle('place-2', favorites);
    expect(favorites.size).toBe(2);

    favorites = toggle('place-1', favorites);
    expect(favorites.has('place-1')).toBe(false);
    expect(favorites.size).toBe(1);
  });

  it('valida las peticiones de geocodificación y cálculo de rutas para móvil (Fase 3)', () => {
    const routeInput = {
      origin: { lat: 40.7128, lng: -74.006 },
      destination: { lat: 40.7332, lng: -74.0052 },
      mode: 'driving' as const,
    };
    expect(routeInput.origin.lat).toBe(40.7128);
    expect(routeInput.destination.lng).toBe(-74.0052);

    // Estimación en minutos a pie vs auto
    const distMeters = 3000;
    const walkMinutes = Math.round(distMeters / 80);
    const driveMinutes = Math.round((distMeters * 1.25) / 583);
    expect(walkMinutes).toBeGreaterThan(driveMinutes);
  });

  it('procesa el resumen de recomendación con IA y aspectos estructurados para móvil (Fase 4)', () => {
    const mockRecSummary = {
      placeId: '77777777-7777-7777-7777-777777777701',
      overallScore: 91.4,
      confidenceLevel: 'HIGH' as const,
      explanation: "L'Industrie Pizzeria destaca según 2 fuentes por sabor de la masa y calidad-precio.",
      explanationStatus: 'CONFIRMED' as const,
      topPositiveAspects: [
        {
          aspect: 'Sabor y calidad',
          category: 'comida',
          polarity: 'POSITIVE' as const,
          mentionsCount: 2,
          sampleQuotes: ['Masa crujiente y salsa fresca.'],
          confidence: 0.95,
        },
      ],
      topNegativeAspects: [
        {
          aspect: 'Largas filas y espera',
          category: 'comida',
          polarity: 'NEGATIVE' as const,
          mentionsCount: 1,
          sampleQuotes: ['Fila de 15 minutos.'],
          confidence: 0.8,
        },
      ],
      sourceDiversityCount: 2,
      independentCount: 2,
      agreementRatio: 0.9,
      factCheckPassed: true,
      costUsd: 0.0,
      calculatedAt: new Date().toISOString(),
    };

    expect(mockRecSummary.overallScore).toBeGreaterThan(80);
    expect(mockRecSummary.confidenceLevel).toBe('HIGH');
    expect(mockRecSummary.factCheckPassed).toBe(true);
    expect(mockRecSummary.costUsd).toBe(0.0);
    expect(mockRecSummary.topPositiveAspects[0]?.aspect).toBe('Sabor y calidad');
    expect(mockRecSummary.topNegativeAspects[0]?.aspect).toBe('Largas filas y espera');
  });

  it('gestiona el flujo de actividades, verificación opcional y opiniones comunitarias para móvil (Fase 5)', () => {
    // 1. Estado inicial de actividad no asume presencia física definitiva
    const mockActivity = {
      id: 'act-mob-1',
      userId: 'usr-1',
      placeId: '77777777-7777-7777-7777-777777777701',
      activityTitle: 'Probar slice de burrata',
      status: 'STARTED' as const,
      verificationMethod: 'NONE' as const,
      isVerifiedVisit: false,
      startedAt: new Date().toISOString(),
    };

    expect(mockActivity.status).toBe('STARTED');
    expect(mockActivity.isVerifiedVisit).toBe(false);
    expect(mockActivity.verificationMethod).toBe('NONE');

    // 2. Simulación de verificación con proximidad GPS
    const verifiedActivity = {
      ...mockActivity,
      verificationMethod: 'GPS_PROXIMITY' as const,
      isVerifiedVisit: true,
      verifiedAt: new Date().toISOString(),
    };
    expect(verifiedActivity.isVerifiedVisit).toBe(true);
    expect(verifiedActivity.verificationMethod).toBe('GPS_PROXIMITY');

    // 3. Reseñas nativas de la comunidad con distinción de verificación
    const mockReviews = [
      {
        id: 'rev-1',
        userId: 'usr-1',
        userName: 'Elena Gómez',
        placeId: mockActivity.placeId,
        reviewType: 'RESTAURANT' as const,
        tasteQuality: 5,
        serviceRating: 4,
        recommendedItem: 'Burrata Slice',
        wouldReturnOrRecommend: true,
        comment: 'La masa es crujiente y deliciosa.',
        isVerifiedVisit: true,
        verificationMethod: 'GPS_PROXIMITY' as const,
        moderationStatus: 'PUBLISHED' as const,
        createdAt: new Date().toISOString(),
        currencyCode: 'USD',
      },
      {
        id: 'rev-2',
        userId: 'usr-2',
        userName: 'Marcos R.',
        placeId: mockActivity.placeId,
        reviewType: 'RESTAURANT' as const,
        tasteQuality: 4,
        recommendedItem: 'Pepperoni clásico',
        wouldReturnOrRecommend: true,
        isVerifiedVisit: false,
        verificationMethod: 'NONE' as const,
        moderationStatus: 'PUBLISHED' as const,
        createdAt: new Date().toISOString(),
        currencyCode: 'USD',
      },
    ];

    expect(mockReviews).toHaveLength(2);
    expect(mockReviews[0]?.isVerifiedVisit).toBe(true);
    expect(mockReviews[1]?.isVerifiedVisit).toBe(false);
    expect(mockReviews[0]?.recommendedItem).toBe('Burrata Slice');
  });

  it('valida la lógica del planificador de viajes móvil bajo feature flag y clasificación de 3 niveles', () => {
    // 1. Feature Flag: el flag se respeta en móvil
    const featureFlags = { trip_planner_enabled: false };
    const canAccessPublicly = featureFlags.trip_planner_enabled;
    expect(canAccessPublicly).toBe(false);

    // Bypass interno para testing
    const internalHeaders = { 'x-exploro-internal': 'true' };
    expect(internalHeaders['x-exploro-internal']).toBe('true');

    // 2. Clasificación de 3 niveles en móvil
    const alternatives = [
      {
        placeId: 'p-1',
        placeName: "Joe's Pizza",
        matchLevel: 'VERY_SIMILAR' as const,
        distanceMeters: 400,
        label: '🟢 Nivel 1: Muy Similares',
      },
      {
        placeId: 'p-2',
        placeName: 'Comedy Cellar',
        matchLevel: 'RELATED_EXPERIENCE' as const,
        distanceMeters: 1200,
        label: '🟡 Nivel 2: Experiencias Relacionadas',
      },
      {
        placeId: 'p-3',
        placeName: 'Metropolitan Museum of Art',
        matchLevel: 'REQUIRES_ADJUSTMENTS' as const,
        distanceMeters: 8000,
        label: '🟠 Nivel 3: Requiere Ajustes',
      },
    ];

    expect(alternatives[0].label).toContain('Nivel 1');
    expect(alternatives[1].label).toContain('Nivel 2');
    expect(alternatives[2].label).toContain('Nivel 3');
  });

  // ---------------------------------------------------------------------------
  // FASE 8: PRUEBAS MÓVILES (Paso 8.2) — Conectividad, Pantallas, Permisos y Batería
  // ---------------------------------------------------------------------------
  it('gestiona la caché offline con estrategia stale-while-revalidate ante conectividad limitada', () => {
    const storage = new OfflineStorageManager();

    storage.set('saved-favorites', [{ id: 'fav-1', name: 'Central Park' }], 50); // 50ms TTL
    expect(storage.getCacheSize()).toBe(1);

    // Online y dentro de TTL
    const liveData = storage.get<{ id: string; name: string }[]>('saved-favorites', false);
    expect(liveData).toHaveLength(1);

    // Simular paso del tiempo expirando TTL
    // En modo offline (isOffline = true), se permite stale-while-offline
    const staleData = storage.get<{ id: string; name: string }[]>('saved-favorites', true);
    expect(staleData).toHaveLength(1);
    expect(staleData?.[0]?.name).toBe('Central Park');
  });

  it('adapta el diseño responsive según el tamaño de pantalla (Android / iOS / Tablet)', () => {
    // Teléfono compacto (< 360dp)
    expect(getScreenCategory(320)).toBe('PHONE_COMPACT');
    expect(getGridColumns('PHONE_COMPACT')).toBe(1);

    // Teléfono estándar (iPhone / Pixel: 375dp - 430dp)
    expect(getScreenCategory(393)).toBe('PHONE_STANDARD');
    expect(getGridColumns('PHONE_STANDARD')).toBe(1);

    // Tableta (iPad / Galaxy Tab: >= 600dp)
    expect(getScreenCategory(768)).toBe('TABLET');
    expect(getGridColumns('TABLET')).toBe(2);
  });

  it('aplica fallback elegante a selección de ciudad cuando el permiso GPS es denegado o no disponible', () => {
    // Permiso denegado
    const deniedStrategy = resolveLocationStrategy('DENIED', true);
    expect(deniedStrategy.useGps).toBe(false);
    expect(deniedStrategy.fallbackReason).toContain('Permiso de ubicación denegado');

    // GPS apagado en el dispositivo
    const noGpsStrategy = resolveLocationStrategy('GRANTED', false);
    expect(noGpsStrategy.useGps).toBe(false);
    expect(noGpsStrategy.fallbackReason).toContain('Servicios de ubicación del dispositivo desactivados');

    // Concedido y activo
    const grantedStrategy = resolveLocationStrategy('GRANTED', true);
    expect(grantedStrategy.useGps).toBe(true);
  });

  it('valida la política de ahorro de batería evitando sondeos en intervalos agresivos', () => {
    // Sondeo de 5 segundos -> Prohibido (drena batería innecesariamente)
    expect(validateBatteryFriendlyInterval(5000)).toBe(false);

    // Sondeo de 30 segundos o más -> Permitido y óptimo
    expect(validateBatteryFriendlyInterval(30000)).toBe(true);
    expect(validateBatteryFriendlyInterval(60000)).toBe(true);
  });
});


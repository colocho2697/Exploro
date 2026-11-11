import { describe, expect, it } from 'vitest';
import {
  calculateDeterministicPlaceScore,
  calculateEvidenceConfidence,
  calculateNativeSentimentScore,
  calculateTrigramSimilarity,
  canAccessMode,
  classifyActivityAlternatives,
  detectReorganizationImpact,
  determineReviewTypeForCategory,
  estimateTravelMinutes,
  evaluateBudgetFit,
  evaluatePlaceDuplicate,
  evaluateScheduleCompatibility,
  formatNativeReviewSnippet,
  formatVerifiedPriceRange,
  generateEvidenceContentHash,
  getInitialModeDescriptors,
  normalizePlaceName,
  resolveSafeRecommendationReason,
  ScheduleCandidateInput,
  selectSurpriseSuggestions,
  SurpriseCandidate,
  synthesizeAspectSummaries,
  tiersAboveBudget,
  verifyAntiHallucination,
  verifyProximityForVisit,
  verifyQrTokenForPlace,
} from './index';

const candidate = (over: Partial<SurpriseCandidate>): SurpriseCandidate => ({
  placeId: 'p',
  categorySlug: 'comida',
  priceTier: 'LOW',
  overallScore: 80,
  evidenceCount: 3,
  distanceMeters: 1000,
  estimatedDurationMins: 60,
  tags: [],
  ...over,
});

describe('@exploro/business-rules — Fase 2 (presupuesto, tiempo, Sorpréndeme)', () => {
  it('calcula niveles sobre el presupuesto y nunca asume económico un precio desconocido', () => {
    expect(tiersAboveBudget('LOW')).toEqual(['MEDIUM', 'HIGH', 'LUXURY']);
    expect(tiersAboveBudget('UNKNOWN')).toEqual([]);
    expect(evaluateBudgetFit('HIGH', 'LOW')).toBe('OVER');
    expect(evaluateBudgetFit('FREE', 'LOW')).toBe('WITHIN');
    expect(evaluateBudgetFit('UNKNOWN', 'LOW')).toBe('UNKNOWN');
  });

  it('estima el traslado solo cuando existe distancia', () => {
    expect(estimateTravelMinutes(5000)).toBe(10);
    expect(estimateTravelMinutes(null)).toBeNull();
  });

  it('excluye lugares con precio verificado sobre el presupuesto', () => {
    const res = selectSurpriseSuggestions(
      [
        candidate({ placeId: 'caro', priceTier: 'LUXURY' }),
        candidate({ placeId: 'ok', priceTier: 'LOW' }),
      ],
      { budgetTier: 'MEDIUM', availableMinutes: 240, companionType: 'SOLO', seed: 1 }
    );
    expect(res.map((r) => r.placeId)).toEqual(['ok']);
  });

  it('excluye lugares cuya duración conocida más el traslado excede el tiempo disponible', () => {
    const res = selectSurpriseSuggestions(
      [
        candidate({ placeId: 'largo', estimatedDurationMins: 200, distanceMeters: 2000 }),
        candidate({ placeId: 'corto', estimatedDurationMins: 45, distanceMeters: 2000 }),
      ],
      { budgetTier: 'MEDIUM', availableMinutes: 90, companionType: 'SOLO', seed: 1 }
    );
    expect(res.map((r) => r.placeId)).toEqual(['corto']);
    expect(res[0]?.timeFit).toBe('CONFIRMED');
  });

  it('marca como UNVERIFIED el precio y la duración desconocidos en lugar de inventarlos', () => {
    const [first] = selectSurpriseSuggestions(
      [candidate({ placeId: 'x', priceTier: 'UNKNOWN', estimatedDurationMins: null })],
      { budgetTier: 'LOW', availableMinutes: 120, companionType: 'SOLO', seed: 7 }
    );
    expect(first?.budgetFit).toBe('UNVERIFIED');
    expect(first?.timeFit).toBe('UNVERIFIED');
    expect(first?.reasons.join(' ')).toContain('Precio sin verificar');
  });

  it('es reproducible con la misma semilla y prioriza diversidad de categorías', () => {
    const pool = [
      candidate({ placeId: 'a', categorySlug: 'comida', overallScore: 95 }),
      candidate({ placeId: 'b', categorySlug: 'comida', overallScore: 94 }),
      candidate({ placeId: 'c', categorySlug: 'turismo', overallScore: 85 }),
      candidate({ placeId: 'd', categorySlug: 'actividades', overallScore: 80 }),
    ];
    const criteria = {
      budgetTier: 'MEDIUM' as const,
      availableMinutes: 300,
      companionType: 'COUPLE' as const,
      seed: 42,
      limit: 3,
    };
    const r1 = selectSurpriseSuggestions(pool, criteria);
    const r2 = selectSurpriseSuggestions(pool, criteria);
    expect(r1).toEqual(r2);
    expect(new Set(r1.map((r) => r.placeId)).size).toBe(3);
    const cats = r1.map((r) => pool.find((p) => p.placeId === r.placeId)?.categorySlug);
    expect(new Set(cats).size).toBe(3);
  });

  it('usa etiquetas y categorías favoritas para puntuar compañía y preferencias', () => {
    const [first] = selectSurpriseSuggestions(
      [candidate({ placeId: 'romantico', categorySlug: 'turismo', tags: ['Atardecer', 'Skyline'] })],
      {
        budgetTier: 'MEDIUM',
        availableMinutes: 200,
        companionType: 'COUPLE',
        favoriteCategories: ['turismo'],
        seed: 3,
      }
    );
    const text = first?.reasons.join(' ') ?? '';
    expect(text).toContain('compañía');
    expect(text).toContain('favoritas');
  });
});

describe('@exploro/business-rules', () => {
  it('bloquea funcionalmente el modo «Soy local» en la primera versión y habilita «Estoy de viaje»', () => {
    const modes = getInitialModeDescriptors(false);
    expect(modes).toHaveLength(2);
    expect(modes[0]).toMatchObject({ mode: 'TRAVELER', enabled: true });
    expect(modes[1]).toMatchObject({
      mode: 'LOCAL',
      enabled: false,
      badgeText: 'Próximamente',
    });

    expect(canAccessMode('TRAVELER', false).allowed).toBe(true);
    const localAccess = canAccessMode('LOCAL', false);
    expect(localAccess.allowed).toBe(false);
    expect(localAccess.reason).toContain('próximamente');
  });

  it('nunca inventa precios cuando faltan datos verificados', () => {
    const missing = formatVerifiedPriceRange({
      avgPriceMin: null,
      avgPriceMax: null,
      currencyCode: 'USD',
      priceStatus: 'INSUFFICIENT_DATA',
    });
    expect(missing).toBe('Precio sin datos suficientes');

    const verifiedRange = formatVerifiedPriceRange({
      avgPriceMin: 15,
      avgPriceMax: 28,
      currencyCode: 'USD',
      priceStatus: 'CONFIRMED',
    });
    expect(verifiedRange).toBe('$15 – $28');

    // Un precio sin verificar nunca se presenta como confirmado.
    expect(
      formatVerifiedPriceRange({
        avgPriceMin: 0,
        avgPriceMax: 0,
        currencyCode: 'USD',
        priceStatus: 'UNVERIFIED',
      })
    ).toBe('Gratis (sin verificar)');
    expect(
      formatVerifiedPriceRange({
        avgPriceMin: 12,
        avgPriceMax: 30,
        currencyCode: 'USD',
        priceStatus: 'UNVERIFIED',
      })
    ).toBe('$12 – $30 (sin verificar)');
    expect(
      formatVerifiedPriceRange({
        avgPriceMin: 0,
        avgPriceMax: 0,
        currencyCode: 'USD',
        priceStatus: 'CONFIRMED',
      })
    ).toBe('Gratis (verificado)');
  });

  it('calcula un ranking determinista y reproducible basado en evidencias y diversidad de fuentes', () => {
    const inputs = [
      {
        confidenceScore: 0.9,
        sentimentScore: 0.85,
        sourceCode: 'REDDIT_US_TRAVEL',
        ageInDays: 20,
        isNativeExperience: false,
        isVerifiedVisit: false,
      },
      {
        confidenceScore: 0.95,
        sentimentScore: 0.9,
        sourceCode: 'EXPLORO_NATIVE',
        ageInDays: 5,
        isNativeExperience: true,
        isVerifiedVisit: true,
      },
      {
        confidenceScore: 0.8,
        sentimentScore: 0.75,
        sourceCode: 'FOOD_BLOG_NYC',
        ageInDays: 45,
        isNativeExperience: false,
        isVerifiedVisit: false,
      },
      {
        confidenceScore: 0.85,
        sentimentScore: 0.8,
        sourceCode: 'REDDIT_NYC_FOOD',
        ageInDays: 30,
        isNativeExperience: false,
        isVerifiedVisit: false,
      },
    ];

    const run1 = calculateDeterministicPlaceScore(inputs);
    const run2 = calculateDeterministicPlaceScore(inputs);

    expect(run1).toEqual(run2);
    expect(run1.confidenceLevel).toBe('HIGH');
    expect(run1.overallScore).toBeGreaterThan(75);
    expect(run1.sourceDiversityCount).toBe(4);
  });

  it('indica explícitamente cuando la evidencia es limitada en lugar de alucinar una razón', () => {
    const result = resolveSafeRecommendationReason({
      verifiedExplanation: null,
      evidenceCount: 0,
    });

    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.text).toContain('Evidencia limitada');
  });

  describe('Fase 3 — Normalización, Deduplicación y Confiabilidad', () => {
    it('normaliza nombres de lugares eliminando acentos, puntuación y sufijos corporativos', () => {
      expect(normalizePlaceName("L'Industrie Pizzeria LLC")).toBe('l industrie pizzeria');
      expect(normalizePlaceName('Café & Restaurant El Sol, Inc.')).toBe('el sol');
      expect(normalizePlaceName('Sángüich de Miami')).toBe('sanguich de miami');
    });

    it('calcula similitud de trigramas concordante con pg_trgm', () => {
      // Coincidencia exacta
      expect(calculateTrigramSimilarity('Central Park', 'Central Park')).toBe(1.0);

      // Coincidencia alta con variación ortográfica
      const simHigh = calculateTrigramSimilarity('L’Industrie Pizzeria', 'L Industrie Pizza');
      expect(simHigh).toBeGreaterThan(0.7);

      // Nombres totalmente distintos
      const simLow = calculateTrigramSimilarity('The Met Museum', 'Joe Pizza');
      expect(simLow).toBeLessThan(0.2);
    });

    it('aplica las reglas estrictas de deduplicación (Principio #1: no fusionar en ambigüedad)', () => {
      const coordsA = { lat: 40.7332, lng: -74.0052 };

      // Caso 1: Mismo lugar a 5 metros y nombre idéntico -> AUTO_MERGE
      const coordsClose = { lat: 40.73322, lng: -74.00522 };
      const autoMerge = evaluatePlaceDuplicate({
        nameA: "L'Industrie Pizzeria",
        coordsA,
        nameB: 'L’Industrie Pizzeria NYC',
        coordsB: coordsClose,
      });
      expect(autoMerge.action).toBe('AUTO_MERGE');
      expect(autoMerge.isDuplicate).toBe(true);

      // Caso 2: Similitud y distancia moderada (150m) -> MANUAL_REVIEW (nunca auto-fusionar)
      const coordsNearby = { lat: 40.7345, lng: -74.006 };
      const manualReview = evaluatePlaceDuplicate({
        nameA: 'Joe Pizza West Village',
        coordsA,
        nameB: 'Joes Pizza Village',
        coordsB: coordsNearby,
      });
      expect(manualReview.action).toBe('MANUAL_REVIEW');
      expect(manualReview.isDuplicate).toBe(true);

      // Caso 3: Lugares a 2 km -> DISTINCT
      const coordsFar = { lat: 40.75, lng: -73.98 };
      const distinct = evaluatePlaceDuplicate({
        nameA: 'Central Park',
        coordsA,
        nameB: 'Battery Park',
        coordsB: coordsFar,
      });
      expect(distinct.action).toBe('DISTINCT');
      expect(distinct.isDuplicate).toBe(false);
    });

    it('genera hashes de contenido deterministas y de longitud fija para evidencias', () => {
      const hash1 = generateEvidenceContentHash(
        'REDDIT_US_FOOD',
        'https://reddit.com/r/FoodNYC/post1',
        'Masa crujiente y deliciosa.'
      );
      const hash2 = generateEvidenceContentHash(
        'REDDIT_US_FOOD',
        'https://reddit.com/r/FoodNYC/post1',
        'Masa crujiente y deliciosa.'
      );
      const hash3 = generateEvidenceContentHash(
        'REDDIT_US_FOOD',
        'https://reddit.com/r/FoodNYC/post1',
        'Masa diferente y suave.'
      );

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1.length).toBeLessThanOrEqual(64);
    });

    it('calcula la confianza de evidencias premiando verificabilidad y fecha', () => {
      const native = calculateEvidenceConfidence({
        baseTrustWeight: 0.8,
        hasPublishedAt: true,
        hasExternalUrl: true,
        isNativeReview: true,
      });
      expect(native).toBeGreaterThanOrEqual(0.95);

      const externalNoDate = calculateEvidenceConfidence({
        baseTrustWeight: 0.75,
        hasPublishedAt: false,
        hasExternalUrl: false,
      });
      expect(externalNoDate).toBe(0.75);
    });
  });

  describe('Fase 4 — Extracción de Aspectos y Guardián Anti-Alucinaciones', () => {
    it('sintetiza aspectos positivos, negativos y precios a partir de evidencias reales', () => {
      const snippets = [
        'Masa crujiente y salsa de tomate fresco, el sabor es auténtico y delicioso.',
        'La porción es generosa y el precio de $4.50 por rebanada vale totalmente la pena.',
        'Suele haber una fila larga y espera de 30 minutos en horas punta.',
        'Recomiendo probar la slice de burrata con miel picante.',
      ];

      const result = synthesizeAspectSummaries({
        categorySlug: 'comida',
        snippets,
      });

      expect(result.positiveAspects.length).toBeGreaterThan(0);
      const aspectNames = result.positiveAspects.map((a) => a.aspect);
      expect(aspectNames).toContain('Sabor y calidad');
      expect(aspectNames).toContain('Relación calidad-precio');
      expect(aspectNames).toContain('Porciones abundantes');

      // Aspectos negativos
      expect(result.negativeAspects.length).toBeGreaterThan(0);
      expect(result.negativeAspects[0].aspect).toBe('Largas filas y espera');

      // Precios detectados
      expect(result.detectedPrices).toContain('$4.50');

      // Actividades recomendadas
      expect(result.recommendedActivities.length).toBeGreaterThan(0);
    });

    it('guardián anti-alucinaciones aprueba si los aspectos están respaldados y rechaza hechos inventados', () => {
      const rawSnippets = [
        'Increíble vista panorámica del skyline al atardecer, es una experiencia hermosa y gratis.',
      ];

      // Caso 1: Todo respaldado
      const valid = verifyAntiHallucination({
        placeExists: true,
        explanation: 'El mirador destaca por su vista panorámica según testimonios.',
        evidencesCount: 2,
        claimedAspects: ['Experiencia y vista', 'Costo y gratuidad'],
        rawSnippets,
      });
      expect(valid.passed).toBe(true);
      expect(valid.status).toBe('CONFIRMED');

      // Caso 2: Aspecto no respaldado (alucinación)
      const hallucinated = verifyAntiHallucination({
        placeExists: true,
        explanation: 'Destaca por su menú gastronómico de mariscos frescos.',
        evidencesCount: 2,
        claimedAspects: ['Gastronomía marina gourmet'],
        rawSnippets,
      });
      expect(hallucinated.passed).toBe(false);
      expect(hallucinated.reason).toContain('no tiene respaldo');

      // Caso 3: 0 evidencias -> INSUFFICIENT_DATA
      const zeroData = verifyAntiHallucination({
        placeExists: true,
        explanation: null,
        evidencesCount: 0,
        claimedAspects: [],
        rawSnippets: [],
      });
      expect(zeroData.passed).toBe(true);
      expect(zeroData.status).toBe('INSUFFICIENT_DATA');
    });
  });

  describe('Fase 5 — Sistema de Experiencias Propias y Verificación', () => {
    it('verifica proximidad voluntaria por GPS solo dentro del radio de 100m y no por simple inicio', () => {
      // Pier 1 Brooklyn Bridge Park Coords: 40.70228, -73.99643
      const placeLat = 40.70228;
      const placeLng = -73.99643;

      // Usuario a ~30 metros
      const near = verifyProximityForVisit(40.70245, -73.9963, placeLat, placeLng);
      expect(near.isVerified).toBe(true);
      expect(near.distanceMeters).toBeLessThanOrEqual(100);

      // Usuario a ~500 metros
      const far = verifyProximityForVisit(40.706, -73.992, placeLat, placeLng);
      expect(far.isVerified).toBe(false);
      expect(far.distanceMeters).toBeGreaterThan(100);
    });

    it('valida tokens QR oficiales y rechaza tokens apócrifos', () => {
      const placeId = '77777777-7777-7777-7777-777777777701';
      const slug = 'l-industrie-pizzeria-nyc';

      expect(verifyQrTokenForPlace(placeId, placeId, slug)).toBe(true);
      expect(verifyQrTokenForPlace(slug, placeId, slug)).toBe(true);
      expect(verifyQrTokenForPlace(`EXPLORO-QR-${slug}`, placeId, slug)).toBe(true);
      expect(verifyQrTokenForPlace(`EXPLORO-QR-${placeId}`, placeId, slug)).toBe(true);
      expect(verifyQrTokenForPlace('QR-INVALIDO-OTRO-LUGAR', placeId, slug)).toBe(false);
    });

    it('determina el tipo de cuestionario adaptado según la categoría', () => {
      expect(determineReviewTypeForCategory('comida')).toBe('RESTAURANT');
      expect(determineReviewTypeForCategory('restaurantes')).toBe('RESTAURANT');
      expect(determineReviewTypeForCategory('turismo')).toBe('TOURISM');
      expect(determineReviewTypeForCategory('actividades')).toBe('TOURISM');
    });

    it('calcula sentimiento determinista para restaurantes y turismo sin costo de IA', () => {
      const restaurantSent = calculateNativeSentimentScore({
        reviewType: 'RESTAURANT',
        restaurantReview: {
          tasteQuality: 5,
          serviceRating: 5,
          valueForMoney: 'EXCELLENT',
          wouldReturn: true,
        },
      });
      expect(restaurantSent).toBe(1.0);

      const negativeRestSent = calculateNativeSentimentScore({
        reviewType: 'RESTAURANT',
        restaurantReview: {
          tasteQuality: 2,
          serviceRating: 1,
          valueForMoney: 'EXPENSIVE',
          wouldReturn: false,
        },
      });
      expect(negativeRestSent).toBeLessThan(0);

      const tourismSent = calculateNativeSentimentScore({
        reviewType: 'TOURISM',
        tourismReview: {
          worthIt: true,
          accessibility: 'EASY',
        },
        wouldReturnOrRecommend: true,
      });
      expect(tourismSent).toBeGreaterThan(0.5);
    });

    it('pondera las visitas verificadas con bono mayor en el ranking determinista', () => {
      const baseEvidences = [
        {
          confidenceScore: 0.8,
          sentimentScore: 0.9,
          sourceCode: 'GOOGLE_MAPS_EXT',
          ageInDays: 30,
          isNativeExperience: false,
          isVerifiedVisit: false,
        },
      ];

      const withUnverifiedNative = [
        ...baseEvidences,
        {
          confidenceScore: 0.8,
          sentimentScore: 0.9,
          sourceCode: 'EXPLORO_NATIVE',
          ageInDays: 1,
          isNativeExperience: true,
          isVerifiedVisit: false,
        },
      ];

      const withVerifiedNative = [
        ...baseEvidences,
        {
          confidenceScore: 0.8,
          sentimentScore: 0.9,
          sourceCode: 'EXPLORO_NATIVE',
          ageInDays: 1,
          isNativeExperience: true,
          isVerifiedVisit: true, // Bono de 1.35x
        },
      ];

      const scoreUnverified = calculateDeterministicPlaceScore(withUnverifiedNative);
      const scoreVerified = calculateDeterministicPlaceScore(withVerifiedNative);

      expect(scoreVerified.overallScore).toBeGreaterThanOrEqual(scoreUnverified.overallScore);
    });

    it('formatea snippets auditables distinguiendo visitas verificadas de no verificadas', () => {
      const verifiedSnippet = formatNativeReviewSnippet({
        authorName: 'Carlos M.',
        reviewType: 'RESTAURANT',
        restaurantReview: {
          recommendedDish: 'Burrata Slice',
          valueForMoney: 'EXCELLENT',
          amountPaid: 15,
          wouldReturn: true,
        },
        comment: 'Totalmente imperdible.',
        isVerifiedVisit: true,
      });

      expect(verifiedSnippet).toContain('[Visita Verificada]');
      expect(verifiedSnippet).toContain('Carlos M.');
      expect(verifiedSnippet).toContain('Burrata Slice');

      const unverifiedSnippet = formatNativeReviewSnippet({
        authorName: 'Elena R.',
        reviewType: 'TOURISM',
        tourismReview: {
          worthIt: true,
          recommendedItem: 'Llevar abrigo para la brisa',
        },
        isVerifiedVisit: false,
      });

      expect(unverifiedSnippet).toContain('[Comunidad Exploro]');
      expect(unverifiedSnippet).toContain('Llevar abrigo para la brisa');
    });
  });

  describe('Fase 6 — Planificador de Viajes (Oculto) y Motor de Itinerarios', () => {
    it('evalúa compatibilidad horaria evitando horarios imposibles o fuera de operación (Paso 6.3)', () => {
      // 1. Horario imposible: inicio después de 23:00 con 2 horas de duración
      const impossibleLate = evaluateScheduleCompatibility({
        startHour: 22.5,
        durationMinutes: 120,
        transitMinutes: 15,
        flexibilityMinutes: 0,
      });
      expect(impossibleLate.compatible).toBe(false);
      expect(impossibleLate.reason).toContain('horario imposible');

      // 2. Horario antes de 07:00 am
      const impossibleEarly = evaluateScheduleCompatibility({
        startHour: 5.5,
        durationMinutes: 60,
        transitMinutes: 15,
        flexibilityMinutes: 0,
      });
      expect(impossibleEarly.compatible).toBe(false);

      // 3. Ajuste inteligente con flexibilidad si abre un poco después (+15m)
      const adjustedOpening = evaluateScheduleCompatibility({
        startHour: 9.75, // 09:45
        durationMinutes: 60,
        transitMinutes: 15,
        flexibilityMinutes: 30,
        openingHour: 10, // Abre a las 10:00
      });
      expect(adjustedOpening.compatible).toBe(true);
      expect(adjustedOpening.adjustedStartHour).toBe(10);
    });

    it('clasifica alternativas de actividades en 3 niveles oficiales (Paso 6.4)', () => {
      const original: ScheduleCandidateInput = {
        placeId: 'orig-1',
        name: "L'Industrie Pizzeria",
        slug: 'l-industrie',
        categorySlug: 'comida',
        subcategorySlug: 'pizzeria',
        lat: 40.7153,
        lng: -73.9592,
        overallScore: 92,
        priceTier: 'LOW',
        estimatedCost: 15,
        estimatedDurationMins: 45,
      };

      const candidates: ScheduleCandidateInput[] = [
        // Nivel 1: Muy similar (misma categoría, < 2.5km, misma duración aprox)
        {
          placeId: 'cand-1',
          name: 'Joe’s Pizza',
          slug: 'joes-pizza',
          categorySlug: 'comida',
          subcategorySlug: 'pizzeria',
          lat: 40.718,
          lng: -73.955,
          overallScore: 89,
          priceTier: 'LOW',
          estimatedCost: 12,
          estimatedDurationMins: 40,
        },
        // Nivel 2: Experiencia relacionada (comida/café o turismo cercano < 6km)
        {
          placeId: 'cand-2',
          name: 'Devoción Coffee Roasters',
          slug: 'devocion-coffee',
          categorySlug: 'comida',
          subcategorySlug: 'cafe',
          lat: 40.722,
          lng: -73.962,
          overallScore: 86,
          priceTier: 'LOW',
          estimatedCost: 8,
          estimatedDurationMins: 30,
        },
        // Nivel 3: Requiere ajustes (más lejos, > 8km)
        {
          placeId: 'cand-3',
          name: 'Central Park Boathouse',
          slug: 'central-park-boathouse',
          categorySlug: 'turismo',
          lat: 40.775,
          lng: -73.968,
          overallScore: 90,
          priceTier: 'HIGH',
          estimatedCost: 45,
          estimatedDurationMins: 90,
        },
      ];

      const classified = classifyActivityAlternatives(original, candidates, 15);

      expect(classified.verySimilar).toHaveLength(1);
      expect(classified.verySimilar[0]?.placeId).toBe('cand-1');

      expect(classified.relatedExperiences).toHaveLength(1);
      expect(classified.relatedExperiences[0]?.placeId).toBe('cand-2');

      expect(classified.requiresAdjustments).toHaveLength(1);
      expect(classified.requiresAdjustments[0]?.placeId).toBe('cand-3');
    });

    it('detecta impacto de reorganización sin modificar unilateralmente y calcula desplazamientos (Paso 6.6)', () => {
      const dayItems = [
        {
          id: 'item-1',
          placeName: 'Museo de Historia Natural',
          startTime: '10:00',
          durationMinutes: 90, // Termina a las 11:30
          transitMinutesFromPrev: 0,
        },
        {
          id: 'item-2',
          placeName: 'Almuerzo en Café cercano',
          startTime: '11:45',
          durationMinutes: 45, // Termina a las 12:30
          transitMinutesFromPrev: 15,
        },
        {
          id: 'item-3',
          placeName: 'Caminata en Central Park',
          startTime: '13:00',
          durationMinutes: 60,
          transitMinutesFromPrev: 15,
        },
      ];

      // El usuario extiende el museo de 90 a 150 minutos (termina a las 12:30)
      // Con 15 min de traslado hacia el café, el café ahora debe iniciar a las 12:45 (+60 min de desplazamiento)
      const impact = detectReorganizationImpact({
        modifiedItemId: 'item-1',
        newStartTime: '10:00',
        newDurationMinutes: 150,
        currentItems: dayItems,
        flexibilityMinutes: 15,
      });

      expect(impact.requiresApproval).toBe(true);
      expect(impact.affectedCount).toBeGreaterThan(0);
      expect(impact.shiftedItems[0]?.itemId).toBe('item-2');
      expect(impact.shiftedItems[0]?.proposedStartTime).toBe('12:45');
      expect(impact.reason).toContain('requiere desplazar');
    });
  });
});




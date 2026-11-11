import { describe, expect, it } from 'vitest';
import {
  calculateDeterministicPlaceScore,
  calculateEvidenceConfidence,
  calculateTrigramSimilarity,
  canAccessMode,
  estimateTravelMinutes,
  evaluateBudgetFit,
  evaluatePlaceDuplicate,
  formatVerifiedPriceRange,
  generateEvidenceContentHash,
  getInitialModeDescriptors,
  normalizePlaceName,
  resolveSafeRecommendationReason,
  selectSurpriseSuggestions,
  SurpriseCandidate,
  tiersAboveBudget,
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
});



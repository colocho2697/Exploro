import { describe, expect, it } from 'vitest';
import {
  calculateDeterministicPlaceScore,
  canAccessMode,
  estimateTravelMinutes,
  evaluateBudgetFit,
  formatVerifiedPriceRange,
  getInitialModeDescriptors,
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
});


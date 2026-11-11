import {
  BudgetTier,
  CompanionType,
  ConfidenceLevel,
  DataAvailabilityStatus,
  ExplorationMode,
  ModeDescriptor,
} from '@exploro/shared-types';

/**
 * Regla de Negocio (Paso 1.5 y Parte V Sección 6):
 * Primera pantalla: «Estoy de viaje» (activo) y «Soy local (próximamente)» (deshabilitado en v1).
 */
export function getInitialModeDescriptors(
  localModeEnabled = false
): ModeDescriptor[] {
  return [
    {
      mode: 'TRAVELER',
      label: 'Estoy de viaje',
      subtitle:
        'Descubre lugares, comida, actividades y experiencias respaldadas por viajeros reales en tu destino.',
      enabled: true,
    },
    {
      mode: 'LOCAL',
      label: 'Soy local',
      subtitle:
        'Explora joyas ocultas, eventos de tu ciudad y recomendaciones de tu comunidad.',
      enabled: localModeEnabled,
      badgeText: localModeEnabled ? undefined : 'Próximamente',
    },
  ];
}

export function canAccessMode(
  mode: ExplorationMode,
  localModeEnabled = false
): { allowed: boolean; reason?: string } {
  if (mode === 'TRAVELER') {
    return { allowed: true };
  }
  if (mode === 'LOCAL' && !localModeEnabled) {
    return {
      allowed: false,
      reason:
        'El modo «Soy local» se encuentra en preparación (próximamente) y no está habilitado en esta versión.',
    };
  }
  return { allowed: true };
}

/**
 * Regla de Negocio (Principio #2 y Paso 2.4):
 * Prohibido inventar precios. Si no hay datos verificados, se indica explícitamente.
 */
export function formatVerifiedPriceRange(params: {
  avgPriceMin: number | null;
  avgPriceMax: number | null;
  currencyCode: string;
  priceStatus: DataAvailabilityStatus;
}): string {
  const { avgPriceMin, avgPriceMax, currencyCode, priceStatus } = params;

  if (
    priceStatus === 'INSUFFICIENT_DATA' ||
    (avgPriceMin === null && avgPriceMax === null)
  ) {
    return 'Precio sin datos suficientes';
  }

  const symbol = currencyCode === 'USD' ? '$' : `${currencyCode} `;
  const unverifiedSuffix = priceStatus === 'CONFIRMED' ? '' : ' (sin verificar)';

  if (avgPriceMin === 0 && (avgPriceMax === 0 || avgPriceMax === null)) {
    return priceStatus === 'CONFIRMED'
      ? 'Gratis (verificado)'
      : 'Gratis (sin verificar)';
  }

  if (avgPriceMin !== null && avgPriceMax !== null) {
    if (avgPriceMin === avgPriceMax) {
      return `${symbol}${avgPriceMin} promedio${unverifiedSuffix}`;
    }
    return `${symbol}${avgPriceMin} – ${symbol}${avgPriceMax}${unverifiedSuffix}`;
  }

  if (avgPriceMin !== null) {
    return `Desde ${symbol}${avgPriceMin}${unverifiedSuffix}`;
  }

  return `Hasta ${symbol}${avgPriceMax}${unverifiedSuffix}`;
}

export interface RankingEvidenceInput {
  /** Puntaje de confianza de la evidencia (0 a 1) */
  confidenceScore: number;
  /** Sentimiento normalizado (-1 a +1) */
  sentimentScore: number;
  /** Código de la fuente para medir diversidad */
  sourceCode: string;
  /** Antigüedad en días desde la publicación o captura */
  ageInDays: number;
  /** Indica si proviene de experiencia propia en Exploro */
  isNativeExperience: boolean;
  /** Indica si tuvo verificación opcional (GPS o QR) */
  isVerifiedVisit: boolean;
}

export interface DeterministicRankingResult {
  overallScore: number;
  confidenceLevel: ConfidenceLevel;
  independentCount: number;
  sourceDiversityCount: number;
  agreementRatio: number;
}

/**
 * Motor determinista y reproducible de ranking basado en evidencias (Paso 4.3).
 * No utiliza estrellas de terceros (como Google Maps) ni depende de un LLM para ordenar.
 */
export function calculateDeterministicPlaceScore(
  evidences: RankingEvidenceInput[]
): DeterministicRankingResult {
  if (evidences.length === 0) {
    return {
      overallScore: 0,
      confidenceLevel: 'LOW',
      independentCount: 0,
      sourceDiversityCount: 0,
      agreementRatio: 0,
    };
  }

  const uniqueSources = new Set(evidences.map((e) => e.sourceCode));
  const sourceDiversityCount = uniqueSources.size;
  const independentCount = evidences.length;

  let weightedSentimentSum = 0;
  let totalWeight = 0;
  let positiveCount = 0;

  for (const ev of evidences) {
    // Decaimiento suave por antigüedad (media vida ~365 días, mínimo 0.45)
    const recencyFactor = Math.max(0.45, Math.exp(-ev.ageInDays / 730));
    // Bono por experiencia propia y verificación de visita
    const nativeBonus = ev.isNativeExperience
      ? ev.isVerifiedVisit
        ? 1.35
        : 1.15
      : 1.0;

    const weight =
      Math.max(0.1, Math.min(1, ev.confidenceScore)) *
      recencyFactor *
      nativeBonus;

    weightedSentimentSum += ev.sentimentScore * weight;
    totalWeight += weight;

    if (ev.sentimentScore > 0.15) {
      positiveCount += 1;
    }
  }

  const normalizedSentiment =
    totalWeight > 0 ? weightedSentimentSum / totalWeight : 0; // rango [-1, 1]
  const baseQuality = ((normalizedSentiment + 1) / 2) * 70; // hasta 70 pts

  // Consistencia entre opiniones (hasta 15 pts)
  const agreementRatio = positiveCount / independentCount;
  const consistencyPoints = agreementRatio * 15;

  // Diversidad de fuentes y volumen de evidencia independiente (hasta 15 pts)
  const diversityPoints = Math.min(8, sourceDiversityCount * 2.5);
  const volumePoints = Math.min(7, Math.log2(independentCount + 1) * 2.5);

  const rawScore =
    baseQuality + consistencyPoints + diversityPoints + volumePoints;
  const overallScore = Number(Math.max(0, Math.min(100, rawScore)).toFixed(2));

  let confidenceLevel: ConfidenceLevel = 'LOW';
  if (independentCount >= 4 && sourceDiversityCount >= 2) {
    confidenceLevel = 'HIGH';
  } else if (independentCount >= 2) {
    confidenceLevel = 'MEDIUM';
  }

  return {
    overallScore,
    confidenceLevel,
    independentCount,
    sourceDiversityCount,
    agreementRatio: Number(agreementRatio.toFixed(2)),
  };
}

/**
 * Regla anti-alucinación para explicaciones (Paso 4.4 y 4.5):
 * Si la cantidad de evidencias es insuficiente o no hay explicación respaldada,
 * devuelve un aviso transparente en lugar de inventar hechos.
 */
export function resolveSafeRecommendationReason(params: {
  verifiedExplanation: string | null;
  evidenceCount: number;
}): { text: string; status: DataAvailabilityStatus } {
  const { verifiedExplanation, evidenceCount } = params;

  if (
    evidenceCount <= 0 ||
    !verifiedExplanation ||
    verifiedExplanation.trim().length === 0
  ) {
    return {
      text: 'Evidencia limitada: aún estamos recopilando más experiencias verificadas para este lugar.',
      status: 'INSUFFICIENT_DATA',
    };
  }

  return {
    text: verifiedExplanation.trim(),
    status: evidenceCount >= 2 ? 'CONFIRMED' : 'UNVERIFIED',
  };
}


// ---------------------------------------------------------------------------
// Fase 2 — Presupuesto, tiempo y motor «Sorpréndeme» (Paso 2.6)
// ---------------------------------------------------------------------------

export const BUDGET_ORDER: Record<Exclude<BudgetTier, 'UNKNOWN'>, number> = {
  FREE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  LUXURY: 4,
};

/** Niveles de precio que superan el presupuesto indicado (UNKNOWN nunca se incluye). */
export function tiersAboveBudget(budget: BudgetTier): BudgetTier[] {
  if (budget === 'UNKNOWN') return [];
  const limit = BUDGET_ORDER[budget];
  return (Object.keys(BUDGET_ORDER) as Array<keyof typeof BUDGET_ORDER>).filter(
    (tier) => BUDGET_ORDER[tier] > limit
  );
}

/**
 * Compara el precio verificado de un lugar con el presupuesto.
 * Un precio desconocido NO se asume económico: se devuelve 'UNKNOWN'.
 */
export function evaluateBudgetFit(
  priceTier: BudgetTier,
  budget: BudgetTier
): 'WITHIN' | 'OVER' | 'UNKNOWN' {
  if (priceTier === 'UNKNOWN') return 'UNKNOWN';
  if (budget === 'UNKNOWN') return 'WITHIN';
  return BUDGET_ORDER[priceTier] <= BUDGET_ORDER[budget] ? 'WITHIN' : 'OVER';
}

/** Velocidad urbana de referencia: 30 km/h = 500 m/min. Es una estimación, no una ruta real. */
export const ESTIMATED_METERS_PER_MINUTE = 500;

export function estimateTravelMinutes(
  distanceMeters: number | null
): number | null {
  if (distanceMeters === null || distanceMeters < 0) return null;
  return Math.ceil(distanceMeters / ESTIMATED_METERS_PER_MINUTE);
}

export const COMPANION_TAG_HINTS: Record<CompanionType, string[]> = {
  SOLO: ['fotografía', 'cultura', 'museo', 'caminata'],
  COUPLE: ['romántico', 'atardecer', 'vista', 'skyline'],
  FAMILY: ['familiar', 'gratis', 'aire libre', 'naturaleza'],
  FRIENDS: ['música', 'nocturno', 'grupo', 'porciones generosas'],
};

export interface SurpriseCandidate {
  placeId: string;
  categorySlug: string;
  priceTier: BudgetTier;
  overallScore: number;
  evidenceCount: number;
  distanceMeters: number | null;
  /** Duración conocida de la actividad; null si no existe dato verificado. */
  estimatedDurationMins: number | null;
  tags: string[];
}

export interface SurpriseCriteria {
  budgetTier: BudgetTier;
  availableMinutes: number;
  companionType: CompanionType;
  favoriteCategories?: string[];
  seed?: number;
  limit?: number;
}

export interface SurpriseSelection {
  placeId: string;
  matchScore: number;
  budgetFit: DataAvailabilityStatus;
  timeFit: DataAvailabilityStatus;
  estimatedTravelMinutes: number | null;
  reasons: string[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Selecciona sugerencias coherentes con ubicación, presupuesto, tiempo, compañía
 * y preferencias. Reglas duras (excluyen): precio verificado sobre el presupuesto
 * o traslado estimado + duración conocida mayor al tiempo disponible.
 * Reglas blandas (puntúan): score por evidencias, cercanía, etiquetas de compañía
 * y categorías favoritas. Dato desconocido => se marca UNVERIFIED y penaliza.
 * Con la misma semilla el resultado es reproducible.
 */
export function selectSurpriseSuggestions(
  candidates: SurpriseCandidate[],
  criteria: SurpriseCriteria
): SurpriseSelection[] {
  const limit = criteria.limit ?? 3;
  const rng = mulberry32(
    criteria.seed ?? Math.floor(Math.random() * 2_147_483_647)
  );
  const hints = COMPANION_TAG_HINTS[criteria.companionType];
  const favorites = new Set(criteria.favoriteCategories ?? []);
  const scored: SurpriseSelection[] = [];
  const categoryOf = new Map<string, string>();

  for (const c of candidates) {
    const budgetEval = evaluateBudgetFit(c.priceTier, criteria.budgetTier);
    if (budgetEval === 'OVER') continue;

    const travel = estimateTravelMinutes(c.distanceMeters);
    if ((travel ?? 0) + (c.estimatedDurationMins ?? 0) > criteria.availableMinutes) {
      continue;
    }

    const reasons: string[] = [];
    let score = c.overallScore * 0.6;
    score += (Math.min(c.evidenceCount, 5) / 5) * 100 * 0.2;

    if (c.distanceMeters !== null) {
      const km = c.distanceMeters / 1000;
      score += Math.max(0, 100 - km * 4) * 0.1;
      reasons.push(`A ~${km.toFixed(1)} km de tu ubicación`);
    }

    const loweredTags = c.tags.map((t) => t.toLowerCase());
    const hintMatches = hints.filter((h) =>
      loweredTags.some((t) => t.includes(h))
    ).length;
    if (hintMatches > 0) {
      score += Math.min(12, hintMatches * 6);
      reasons.push('Sus etiquetas coinciden con tu tipo de compañía');
    }

    if (favorites.has(c.categorySlug)) {
      score += 8;
      reasons.push('Pertenece a una de tus categorías favoritas');
    }

    const budgetFit: DataAvailabilityStatus =
      budgetEval === 'WITHIN' ? 'CONFIRMED' : 'UNVERIFIED';
    if (budgetFit === 'UNVERIFIED') {
      score -= 8;
      reasons.push('Precio sin verificar: confirma el costo antes de ir');
    } else {
      reasons.push('Precio verificado dentro de tu presupuesto');
    }

    const timeFit: DataAvailabilityStatus =
      c.estimatedDurationMins !== null ? 'CONFIRMED' : 'UNVERIFIED';
    if (timeFit === 'UNVERIFIED') {
      score -= 4;
      reasons.push('Duración desconocida');
    }

    // Variación controlada: «sorprende» sin invertir el orden por calidad.
    score += rng() * 8;

    categoryOf.set(c.placeId, c.categorySlug);
    scored.push({
      placeId: c.placeId,
      matchScore: Number(Math.max(0, Math.min(100, score)).toFixed(2)),
      budgetFit,
      timeFit,
      estimatedTravelMinutes: travel,
      reasons,
    });
  }

  scored.sort(
    (a, b) => b.matchScore - a.matchScore || a.placeId.localeCompare(b.placeId)
  );

  // Diversidad: primero una sugerencia por categoría, luego completar.
  const picked: SurpriseSelection[] = [];
  const usedCategories = new Set<string>();
  for (const s of scored) {
    const cat = categoryOf.get(s.placeId) ?? '';
    if (!usedCategories.has(cat) && picked.length < limit) {
      picked.push(s);
      usedCategories.add(cat);
    }
  }
  for (const s of scored) {
    if (picked.length >= limit) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// FASE 3: Normalización, Deduplicación y Confiabilidad de Evidencias
// ---------------------------------------------------------------------------

/**
 * Normaliza el nombre de un lugar eliminando acentos, puntuación, mayúsculas
 * y sufijos corporativos comunes para comparar entidades de diferentes fuentes.
 */
export function normalizePlaceName(rawName: string): string {
  if (!rawName) return '';

  let normalized = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas
    .toLowerCase()
    .replace(/['’".,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Elimina sufijos corporativos comunes en EE. UU.
  normalized = normalized
    .replace(/\b(llc|inc|corp|co|ltd|restaurant|bar|cafe)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Calcula la similitud de trigramas (coeficiente Sørensen-Dice) entre dos textos,
 * equivalente al operador % / función similarity() de pg_trgm en PostgreSQL.
 */
export function calculateTrigramSimilarity(a: string, b: string): number {
  const normA = normalizePlaceName(a);
  const normB = normalizePlaceName(b);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const getTrigrams = (str: string): Map<string, number> => {
    const padded = `  ${str} `;
    const trigrams = new Map<string, number>();
    for (let i = 0; i < padded.length - 2; i++) {
      const tri = padded.substring(i, i + 3);
      trigrams.set(tri, (trigrams.get(tri) ?? 0) + 1);
    }
    return trigrams;
  };

  const triA = getTrigrams(normA);
  const triB = getTrigrams(normB);

  let matches = 0;
  let totalA = 0;
  let totalB = 0;

  for (const count of triA.values()) totalA += count;
  for (const count of triB.values()) totalB += count;

  for (const [tri, countA] of triA.entries()) {
    const countB = triB.get(tri);
    if (countB) {
      matches += Math.min(countA, countB);
    }
  }

  if (totalA + totalB === 0) return 0.0;
  return Number(((2 * matches) / (totalA + totalB)).toFixed(4));
}

/**
 * Calcula la distancia ortodrómica en metros entre dos coordenadas (Fórmula Haversine).
 */
export function calculateHaversineDistanceMeters(
  coordA: { lat: number; lng: number },
  coordB: { lat: number; lng: number }
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((coordB.lat - coordA.lat) * Math.PI) / 180;
  const dLng = ((coordB.lng - coordA.lng) * Math.PI) / 180;
  const lat1 = (coordA.lat * Math.PI) / 180;
  const lat2 = (coordB.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface DuplicateEvaluation {
  isDuplicate: boolean;
  nameSimilarity: number;
  distanceMeters: number;
  action: 'AUTO_MERGE' | 'MANUAL_REVIEW' | 'DISTINCT';
  reason: string;
}

/**
 * Regla de Negocio (Paso 3.4 y Principio #1):
 * No fusionar automáticamente registros cuando exista ambigüedad.
 * Solo fusiona de forma autónoma con certeza geográfica y nominal alta.
 */
export function evaluatePlaceDuplicate(params: {
  nameA: string;
  coordsA: { lat: number; lng: number };
  nameB: string;
  coordsB: { lat: number; lng: number };
}): DuplicateEvaluation {
  const { nameA, coordsA, nameB, coordsB } = params;

  const distanceMeters = calculateHaversineDistanceMeters(coordsA, coordsB);
  const similarity = calculateTrigramSimilarity(nameA, nameB);

  // Mismo lugar exacto: distancia insignificante (< 25 metros) y nombres prácticamente idénticos
  if (distanceMeters <= 25 && similarity >= 0.9) {
    return {
      isDuplicate: true,
      nameSimilarity: similarity,
      distanceMeters,
      action: 'AUTO_MERGE',
      reason: 'Ubicación casi exacta (<25 m) y coincidencia nominal >= 90%.',
    };
  }

  // Zona ambigua: nombres muy similares a menos de 250 metros o idénticos a menos de 500 metros
  if (
    (distanceMeters <= 250 && similarity >= 0.65) ||
    (distanceMeters <= 500 && similarity >= 0.85)
  ) {
    return {
      isDuplicate: true,
      nameSimilarity: similarity,
      distanceMeters,
      action: 'MANUAL_REVIEW',
      reason:
        'Ambigüedad detectada: proximidad geográfica con similitud moderada. Requiere revisión para evitar fusión errónea.',
    };
  }

  // Lugares distintos
  return {
    isDuplicate: false,
    nameSimilarity: similarity,
    distanceMeters,
    action: 'DISTINCT',
    reason: 'Distancia o nombres difieren lo suficiente para considerarse independientes.',
  };
}

/**
 * Genera un hash criptográfico determinista (FNV-1a 64-bit expandido a 64 hex chars)
 * para evitar registros duplicados de evidencias sin dependencias nativas de Node.
 */
export function generateEvidenceContentHash(
  sourceCode: string,
  externalUrl: string | null | undefined,
  snippet: string
): string {
  const payload = `${sourceCode.trim()}|${(externalUrl ?? '').trim()}|${snippet.trim()}`;

  // Dos hashes FNV-1a de 32 bits con semillas distintas para 64 bits de entropía
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x55555555;

  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;

    h2 ^= code;
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }

  const hex1 = h1.toString(16).padStart(8, '0');
  const hex2 = h2.toString(16).padStart(8, '0');
  const rawPrefix = `ev_${hex1}${hex2}`;

  // Rellena hasta 64 caracteres de forma determinista para ajustarse a VARCHAR(64)
  return (rawPrefix + hex1.repeat(4) + hex2.repeat(2)).substring(0, 64);
}

/**
 * Calcula el nivel de confianza de una evidencia según su origen y atributos verificables.
 */
export function calculateEvidenceConfidence(params: {
  baseTrustWeight: number;
  hasPublishedAt: boolean;
  hasExternalUrl: boolean;
  isNativeReview?: boolean;
}): number {
  let score = params.baseTrustWeight;

  if (params.isNativeReview) {
    score = 0.95;
  }
  if (params.hasPublishedAt) {
    score += 0.04;
  }
  if (params.hasExternalUrl) {
    score += 0.04;
  }

  return Number(Math.max(0.1, Math.min(1.0, score)).toFixed(2));
}


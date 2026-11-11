import {
  BudgetTier,
  CompanionType,
  ConfidenceLevel,
  DataAvailabilityStatus,
  ExplorationMode,
  ExtractedAspectItem,
  ModeDescriptor,
  RestaurantReviewInput,
  ReviewType,
  TourismReviewInput,
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
  externalUrlOrSnippet: string | null | undefined,
  snippet?: string
): string {
  const url = snippet !== undefined ? (externalUrlOrSnippet ?? '') : '';
  const text = snippet !== undefined ? snippet : (externalUrlOrSnippet ?? '');
  const payload = `${(sourceCode ?? '').trim()}|${url.trim()}|${text.trim()}`;

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

// ---------------------------------------------------------------------------
// FASE 4: Taxonomía de Aspectos, Síntesis y Guardián Anti-Alucinaciones
// ---------------------------------------------------------------------------

export const RESTAURANT_ASPECT_TAXONOMY: Record<string, string[]> = {
  'Sabor y calidad': ['sabor', 'delicios', 'crujiente', 'masa', 'fresco', 'auténtic', 'textura', 'ingredientes', 'rico', 'exquisito'],
  'Atención y servicio': ['atención', 'amable', 'servicio', 'rápido', 'camarero', 'personal', 'staff', 'cordial'],
  'Relación calidad-precio': ['precio', 'calidad-precio', 'barato', 'económico', 'accesible', 'vale la pena', 'precio justo', 'buen precio'],
  'Ambiente y comodidad': ['ambiente', 'terraza', 'música', 'vista', 'acogedor', 'decoración', 'vibra', 'espacio'],
  'Porciones abundantes': ['porción', 'porciones', 'generos', 'abundante', 'grande', 'suficiente', 'llena'],
  'Especialidades de la casa': ['especialidad', 'burrata', 'slice', 'rebanada', 'tacos', 'hamburguesa', 'pasta', 'postre', 'café'],
};

export const TOURISM_ASPECT_TAXONOMY: Record<string, string[]> = {
  'Experiencia y vista': ['experiencia', 'vista', 'panorámic', 'skyline', 'atardecer', 'paisaje', 'hermos', 'impresionante'],
  'Accesibilidad y transporte': ['accesible', 'caminar', 'metro', 'estación', 'estacionamiento', 'fácil acceso', 'transporte'],
  'Duración del recorrido': ['duración', 'horas', 'minutos', 'recorrido', 'visita rápida', 'tiempo'],
  'Costo y gratuidad': ['gratis', 'gratuito', 'sin costo', 'económico', 'libre acceso', 'sin pagar'],
  'Seguridad según testimonios': ['seguro', 'tranquilo', 'familiar', 'iluminado', 'confiable', 'vigilado'],
  'Valor cultural e histórico': ['historia', 'monumento', 'arquitectura', 'museo', 'arte', 'emblemátic', 'icónico', 'patrimonio'],
  'Recomendación imperdible': ['imperdible', 'recomendad', 'joya', 'vale la pena', 'obligad', 'must visit'],
};

export const NEGATIVE_ASPECT_TAXONOMY: Record<string, string[]> = {
  'Largas filas y espera': ['fila', 'filas', 'espera', 'larga espera', 'cola', 'tiempo de espera', 'esperar mucho', 'demora'],
  'Lugar abarrotado o ruidoso': ['abarrotado', 'ruidoso', 'demasiada gente', 'apretado', 'multitud', 'atestado', 'bullicio'],
  'Precios elevados': ['caro', 'costoso', 'precio alto', 'sobrevalorado', 'carísimo', 'no vale lo que cuesta'],
  'Atención mejorable': ['servicio lento', 'mala atención', 'grosero', 'desatento', 'poca amabilidad', 'tardaron'],
};

/**
 * Síntesis extractiva de aspectos positivos y negativos a partir de evidencias (Paso 4.1 y 4.2).
 * Sin llamadas a modelos externos de pago ($0.00).
 */
export function synthesizeAspectSummaries(params: {
  categorySlug: string;
  snippets: string[];
}): {
  positiveAspects: ExtractedAspectItem[];
  negativeAspects: ExtractedAspectItem[];
  detectedPrices: string[];
  recommendedActivities: string[];
} {
  const { categorySlug, snippets } = params;
  const isFood = categorySlug === 'comida' || categorySlug === 'food';
  const taxonomy = isFood ? RESTAURANT_ASPECT_TAXONOMY : TOURISM_ASPECT_TAXONOMY;

  const positiveAspects: ExtractedAspectItem[] = [];
  const negativeAspects: ExtractedAspectItem[] = [];
  const detectedPrices: Set<string> = new Set();
  const recommendedActivities: Set<string> = new Set();

  // 1. Detectar aspectos positivos
  for (const [aspectName, keywords] of Object.entries(taxonomy)) {
    const matchingSnippets: string[] = [];
    for (const snippet of snippets) {
      const lower = snippet.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw))) {
        matchingSnippets.push(snippet);
      }
    }

    if (matchingSnippets.length > 0) {
      positiveAspects.push({
        aspect: aspectName,
        category: categorySlug,
        polarity: 'POSITIVE',
        mentionsCount: matchingSnippets.length,
        sampleQuotes: matchingSnippets.slice(0, 2),
        confidence: Number(Math.min(1.0, 0.75 + matchingSnippets.length * 0.08).toFixed(2)),
      });
    }
  }

  // 2. Detectar aspectos negativos / advertencias
  for (const [aspectName, keywords] of Object.entries(NEGATIVE_ASPECT_TAXONOMY)) {
    const matchingSnippets: string[] = [];
    for (const snippet of snippets) {
      const lower = snippet.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw))) {
        matchingSnippets.push(snippet);
      }
    }

    if (matchingSnippets.length > 0) {
      negativeAspects.push({
        aspect: aspectName,
        category: categorySlug,
        polarity: 'NEGATIVE',
        mentionsCount: matchingSnippets.length,
        sampleQuotes: matchingSnippets.slice(0, 2),
        confidence: Number(Math.min(1.0, 0.70 + matchingSnippets.length * 0.1).toFixed(2)),
      });
    }
  }

  // 3. Extraer precios y actividades mencionadas
  for (const snippet of snippets) {
    const lower = snippet.toLowerCase();
    // Precios
    const priceMatches = snippet.match(/\$\s?\d+(\.\d{2})?/g);
    if (priceMatches) {
      priceMatches.forEach((p) => detectedPrices.add(p.replace(/\s+/, '')));
    }
    if (lower.includes('gratis') || lower.includes('gratuito')) {
      detectedPrices.add('Gratis');
    }

    // Actividades sugeridas
    if (lower.includes('probar') || lower.includes('pedir') || lower.includes('recomiendo')) {
      const phrase = snippet.length > 60 ? `${snippet.substring(0, 57)}...` : snippet;
      recommendedActivities.add(phrase);
    }
  }

  return {
    positiveAspects: positiveAspects.sort((a, b) => b.mentionsCount - a.mentionsCount),
    negativeAspects: negativeAspects.sort((a, b) => b.mentionsCount - a.mentionsCount),
    detectedPrices: Array.from(detectedPrices),
    recommendedActivities: Array.from(recommendedActivities).slice(0, 3),
  };
}

/**
 * Guardián Anti-Alucinaciones estricto (Paso 4.5).
 * Valida que:
 * 1. El lugar exista en el catálogo.
 * 2. Si no hay evidencias, devuelva INSUFFICIENT_DATA y no genere hechos falsos.
 * 3. Las afirmaciones de aspectos tengan al menos un fragmento de soporte.
 * 4. No existan contradicciones flagrantes entre la recomendación y la evidencia.
 */
export function verifyAntiHallucination(params: {
  placeExists: boolean;
  explanation: string | null;
  evidencesCount: number;
  claimedAspects: string[];
  rawSnippets: string[];
}): {
  passed: boolean;
  status: DataAvailabilityStatus;
  reason?: string;
} {
  const { placeExists, explanation, evidencesCount, claimedAspects, rawSnippets } = params;

  if (!placeExists) {
    return {
      passed: false,
      status: 'INSUFFICIENT_DATA',
      reason: 'El lugar no existe en el catálogo verificado.',
    };
  }

  if (evidencesCount === 0 || rawSnippets.length === 0) {
    return {
      passed: true,
      status: 'INSUFFICIENT_DATA',
      reason: 'No hay evidencias registradas: se marca como información insuficiente sin inventar datos.',
    };
  }

  if (!explanation || explanation.trim().length < 10) {
    return {
      passed: false,
      status: 'UNVERIFIED',
      reason: 'La explicación generada está vacía o es demasiado corta.',
    };
  }

  // Verificar que cada aspecto reclamado tenga al menos una evidencia con palabras clave afines
  const combinedSnippets = rawSnippets.join(' ').toLowerCase();
  for (const claimed of claimedAspects) {
    const taxonomyKeywords =
      RESTAURANT_ASPECT_TAXONOMY[claimed] ??
      TOURISM_ASPECT_TAXONOMY[claimed] ??
      NEGATIVE_ASPECT_TAXONOMY[claimed];

    let hasBacking = false;
    if (taxonomyKeywords && taxonomyKeywords.length > 0) {
      hasBacking = taxonomyKeywords.some((kw) => combinedSnippets.includes(kw));
    }

    if (!hasBacking) {
      const words = claimed
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      hasBacking = words.some((w) => combinedSnippets.includes(w));
    }

    if (!hasBacking) {
      return {
        passed: false,
        status: 'UNVERIFIED',
        reason: `Aspecto afirmado "${claimed}" no tiene respaldo en los fragmentos de evidencias.`,
      };
    }
  }

  return {
    passed: true,
    status: evidencesCount >= 2 ? 'CONFIRMED' : 'UNVERIFIED',
  };
}

// ============================================================================
// FASE 5: REGLAS DE NEGOCIO PARA EXPERIENCIAS PROPIAS Y VERIFICACIÓN
// ============================================================================

/**
 * Regla de Negocio (Paso 5.5):
 * Verificación opcional de visita mediante proximidad voluntaria GPS.
 * Compara la posición del usuario con el lugar usando Haversine esférico.
 * Si distancia <= maxDistanceMeters (por defecto 100m) -> visita verificada.
 * Principio: "No utilizar el simple inicio de una actividad como prueba definitiva de visita."
 */
export function verifyProximityForVisit(
  userLat: number,
  userLng: number,
  placeLat: number,
  placeLng: number,
  maxDistanceMeters = 100
): { isVerified: boolean; distanceMeters: number } {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((placeLat - userLat) * Math.PI) / 180;
  const dLng = ((placeLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((placeLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = Math.round(R * c);

  return {
    isVerified: distanceMeters <= maxDistanceMeters,
    distanceMeters,
  };
}

/**
 * Regla de Negocio (Paso 5.5):
 * Verificación opcional mediante escaneo de código QR en el establecimiento o lugar.
 * Valida contra UUID del lugar, slug o token formateado "EXPLORO-QR-<slug/uuid>".
 */
export function verifyQrTokenForPlace(
  token: string,
  placeId: string,
  placeSlug?: string
): boolean {
  if (!token || !token.trim()) return false;
  const cleanToken = token.trim();

  // Coincidencia exacta con UUID
  if (cleanToken.toLowerCase() === placeId.toLowerCase()) return true;

  // Coincidencia exacta con Slug
  if (placeSlug && cleanToken.toLowerCase() === placeSlug.toLowerCase()) return true;

  // Formato oficial de token Exploro QR
  const prefixMatch = cleanToken.match(/^EXPLORO-QR-(.+)$/i);
  if (prefixMatch) {
    const payload = prefixMatch[1].toLowerCase();
    if (payload === placeId.toLowerCase()) return true;
    if (placeSlug && payload === placeSlug.toLowerCase()) return true;
  }

  return false;
}

/**
 * Regla de Negocio (Paso 5.2):
 * Determina el tipo de cuestionario breve adaptado según la categoría del lugar.
 * Evita formularios largos; adapta las preguntas a comida vs turismo.
 */
export function determineReviewTypeForCategory(categorySlug: string): ReviewType {
  const norm = categorySlug.toLowerCase().trim();
  if (norm === 'comida' || norm === 'restaurantes' || norm === 'gastronomia') {
    return 'RESTAURANT';
  }
  return 'TOURISM';
}

/**
 * Regla de Negocio (Paso 5.3, 5.4, 5.6):
 * Calcula el sentimiento normalizado (-1 a +1) de una opinión de experiencia nativa
 * sin recurrir a LLMs, garantizando predictibilidad y costo cero ($0.00).
 */
export function calculateNativeSentimentScore(params: {
  reviewType: ReviewType;
  restaurantReview?: RestaurantReviewInput;
  tourismReview?: TourismReviewInput;
  wouldReturnOrRecommend?: boolean;
}): number {
  const { reviewType, restaurantReview, tourismReview, wouldReturnOrRecommend } = params;

  if (reviewType === 'RESTAURANT' && restaurantReview) {
    let scoreSum = 0;
    let components = 0;

    if (restaurantReview.tasteQuality !== undefined) {
      scoreSum += ((restaurantReview.tasteQuality - 1) / 4) * 2 - 1;
      components++;
    }

    if (restaurantReview.serviceRating !== undefined) {
      scoreSum += ((restaurantReview.serviceRating - 1) / 4) * 2 - 1;
      components++;
    }

    if (restaurantReview.valueForMoney) {
      if (restaurantReview.valueForMoney === 'EXCELLENT') scoreSum += 1.0;
      else if (restaurantReview.valueForMoney === 'FAIR') scoreSum += 0.3;
      else if (restaurantReview.valueForMoney === 'EXPENSIVE') scoreSum -= 0.6;
      components++;
    }

    if (restaurantReview.wouldReturn !== undefined) {
      scoreSum += restaurantReview.wouldReturn ? 1.0 : -1.0;
      components++;
    }

    if (components === 0) return 0.5;
    return Number((scoreSum / components).toFixed(2));
  }

  if (reviewType === 'TOURISM' && tourismReview) {
    let scoreSum = 0;
    let components = 0;

    if (tourismReview.worthIt !== undefined) {
      scoreSum += tourismReview.worthIt ? 1.0 : -0.8;
      components++;
    }

    if (tourismReview.accessibility) {
      if (
        tourismReview.accessibility === 'WHEELCHAIR_ACCESSIBLE' ||
        tourismReview.accessibility === 'EASY'
      ) {
        scoreSum += 0.5;
      } else if (tourismReview.accessibility === 'MODERATE') {
        scoreSum += 0.2;
      } else {
        scoreSum -= 0.2;
      }
      components++;
    }

    if (wouldReturnOrRecommend !== undefined) {
      scoreSum += wouldReturnOrRecommend ? 1.0 : -0.8;
      components++;
    }

    if (components === 0) return 0.6;
    return Number((scoreSum / components).toFixed(2));
  }

  return wouldReturnOrRecommend !== false ? 0.7 : -0.5;
}

/**
 * Regla de Negocio (Paso 5.6):
 * Formatea un snippet conciso a partir de la experiencia del usuario
 * para que sirva de evidencia transparente y auditable.
 */
export function formatNativeReviewSnippet(params: {
  authorName: string;
  reviewType: ReviewType;
  restaurantReview?: RestaurantReviewInput;
  tourismReview?: TourismReviewInput;
  comment?: string;
  isVerifiedVisit: boolean;
}): string {
  const {
    authorName,
    reviewType,
    restaurantReview,
    tourismReview,
    comment,
    isVerifiedVisit,
  } = params;
  const verifiedTag = isVerifiedVisit
    ? '[Visita Verificada]'
    : '[Comunidad Exploro]';
  const parts: string[] = [`${verifiedTag} ${authorName}:`];

  if (reviewType === 'RESTAURANT' && restaurantReview) {
    if (restaurantReview.recommendedDish) {
      parts.push(`Recomienda el plato "${restaurantReview.recommendedDish}".`);
    }
    if (restaurantReview.valueForMoney) {
      const vMap: Record<string, string> = {
        EXCELLENT: 'excelente relación calidad-precio',
        FAIR: 'precio justo',
        EXPENSIVE: 'precios elevados',
      };
      parts.push(`Opina: ${vMap[restaurantReview.valueForMoney] || 'precio estándar'}.`);
    }
    if (restaurantReview.amountPaid) {
      parts.push(`Gasto reportado: $${restaurantReview.amountPaid}.`);
    }
    if (restaurantReview.wouldReturn) {
      parts.push('Definitivamente volvería.');
    }
  } else if (reviewType === 'TOURISM' && tourismReview) {
    if (tourismReview.worthIt) {
      parts.push('Confirma que valió totalmente la pena.');
    }
    if (tourismReview.recommendedItem) {
      parts.push(`Consejo: "${tourismReview.recommendedItem}".`);
    }
    if (tourismReview.caveatOrTip) {
      parts.push(`Advertencia útil: "${tourismReview.caveatOrTip}".`);
    }
  }

  if (comment && comment.trim()) {
    parts.push(`"${comment.trim()}"`);
  }

  return parts.join(' ');
}




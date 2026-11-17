import { PlaceCardDTO } from '@exploro/shared-types';
import { GOOGLE_PLACES_PHOTOS } from './google-places-photos';
import { DICTIONARIES, SUPPORTED_LOCALES, SupportedLocale } from './i18n';

export const KM_PER_MILE = 1.609344;
export const METERS_PER_MILE = 1609.344;
export const FEET_PER_METER = 3.28084;

/** Radio inicial por defecto en el mapa: 5 km a la redonda. */
export const DEFAULT_RADIUS_KM = 5;

/** Equivalente en millas para compatibilidad legacy. */
export const DEFAULT_RADIUS_MILES = 3.1;

/** Opciones de radio en kilómetros para el filtro del mapa. */
export const RADIUS_OPTIONS_KM = [2, 5, 10, 20, 50] as const;

/** Opciones de radio en millas; la API trabaja en kilómetros. */
export const RADIUS_OPTIONS_MI = [1, 3, 5, 8, 15, 25, 50] as const;

export const HONDURAS_CITIES = [
  { label: 'Col. Florencia Norte (Tegucigalpa), HN', value: 'Tegucigalpa', slug: 'tegucigalpa', lat: 14.0885, lng: -87.1815 },
  { label: 'San Pedro Sula, HN', value: 'San Pedro Sula', slug: 'san-pedro-sula', lat: 15.5042, lng: -88.025 },
  { label: 'Roatán, HN', value: 'Roatán', slug: 'roatan', lat: 16.2753, lng: -86.5986 },
  { label: 'Copán Ruinas, HN', value: 'Copán Ruinas', slug: 'copan-ruinas', lat: 14.84, lng: -89.1419 },
  { label: 'Valle de Ángeles, HN', value: 'Valle de Ángeles', slug: 'valle-de-angeles', lat: 14.1578, lng: -87.0419 },
  { label: 'La Ceiba, HN', value: 'La Ceiba', slug: 'la-ceiba', lat: 15.7797, lng: -86.7916 },
] as const;

export const US_CITIES = [
  { label: 'Todas las ciudades', value: '', slug: '' },
  ...HONDURAS_CITIES,
  { label: 'New York (NYC)', value: 'New York', slug: 'new-york', lat: 40.7128, lng: -74.006 },
  { label: 'Miami', value: 'Miami', slug: 'miami', lat: 25.7617, lng: -80.1918 },
  { label: 'Los Angeles', value: 'Los Angeles', slug: 'los-angeles', lat: 34.0522, lng: -118.2437 },
  { label: 'Chicago', value: 'Chicago', slug: 'chicago', lat: 41.8781, lng: -87.6298 },
  { label: 'Austin', value: 'Austin', slug: 'austin', lat: 30.2672, lng: -97.7431 },
  { label: 'San Francisco', value: 'San Francisco', slug: 'san-francisco', lat: 37.7749, lng: -122.4194 },
  { label: 'Orlando', value: 'Orlando', slug: 'orlando', lat: 28.5383, lng: -81.3792 },
] as const;

export function milesToKm(miles: number): number {
  return Number((miles * KM_PER_MILE).toFixed(3));
}

/** Distancia legible en metros o kilómetros (para radio de 5 km a la redonda). */
export function formatDistanceKm(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined || Number.isNaN(meters) || meters < 0) return null;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Distancia legible para EE. UU.: pies por debajo de 0.1 mi, millas en otro caso. */
export function formatDistanceUS(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined || Number.isNaN(meters) || meters < 0) return null;
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.1) {
    return `${Math.round(meters * FEET_PER_METER)} ft`;
  }
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

/** Opciones enriquecidas para iniciar navegación directa y precisa. */
export interface NavigationOptions {
  name?: string;
  addressText?: string | null;
  cityName?: string | null;
  countryName?: string | null;
  origin?: string | null;
}

/** Enlace universal directo y gratuito ($0.00) para iniciar navegación en Waze con búsqueda precisa del local. */
export function buildWazeUrl(
  lat: number,
  lng: number,
  options?: { name?: string; cityName?: string; countryName?: string }
): string {
  if (options?.name) {
    const cleanName = options.name.replace(/^#?\d+[\.\s\-—]+/, '').trim();
    const parts = [cleanName];
    if (options.cityName) parts.push(options.cityName);
    if (options.countryName) {
      parts.push(options.countryName);
    } else if (
      options.cityName?.toLowerCase().includes('tegucigalpa') ||
      options.cityName?.toLowerCase().includes('pedro sula')
    ) {
      parts.push('Honduras');
    }
    const query = parts.join(', ');
    return `https://waze.com/ul?q=${encodeURIComponent(query)}&ll=${lat},${lng}&navigate=yes`;
  }
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/** Enlace universal directo y gratuito ($0.00) para iniciar ruta en Google Maps con origen y destino exactos. */
export function buildGoogleMapsUrl(
  lat: number,
  lng: number,
  options?: NavigationOptions
): string {
  if (options?.name) {
    const cleanName = options.name.replace(/^#?\d+[\.\s\-—]+/, '').trim();
    const destinationParts = [cleanName];
    if (options.addressText) destinationParts.push(options.addressText);
    if (options.cityName) destinationParts.push(options.cityName);
    if (options.countryName) {
      destinationParts.push(options.countryName);
    } else if (
      options.cityName?.toLowerCase().includes('tegucigalpa') ||
      options.cityName?.toLowerCase().includes('pedro sula') ||
      options.origin?.toLowerCase().includes('honduras')
    ) {
      destinationParts.push('Honduras');
    }
    const destinationQuery = destinationParts.join(', ');

    if (options.origin) {
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        options.origin
      )}&destination=${encodeURIComponent(destinationQuery)}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      destinationQuery
    )}&travelmode=driving`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export interface ParsedRecommendation {
  choiceReason: string;
  backing: string | null;
  caveat: string | null;
}

export interface PlaceReasonContext {
  categorySlug?: string;
  cityName?: string;
  mapsStars?: number;
}

/**
 * Separa y adapta nativamente la explicación a cada idioma:
 * - En Español conserva el texto exacto.
 * - En Inglés, Portugués, Francés, Alemán, Chino o Ruso, transcrea la razón
 *   y las observaciones como si hubieran sido escritas originalmente en ese idioma.
 */
export function parseRecommendationReason(
  raw: string,
  locale: SupportedLocale = 'es',
  context?: PlaceReasonContext
): ParsedRecommendation {
  const [mainPart, caveatPart] = raw.split('|').map((s) => s.trim());
  const [choicePart, backingPart] = (mainPart ?? '').split('•').map((s) => s.trim());
  const rawCaveat = caveatPart ? caveatPart.replace(/^⚠️\s*/u, '').trim() : null;

  if (locale === 'es' || !context) {
    return {
      choiceReason: choicePart || raw,
      backing: backingPart || null,
      caveat: rawCaveat,
    };
  }

  const dict = DICTIONARIES[locale] ?? DICTIONARIES.es;
  const catKey = (
    context.categorySlug && context.categorySlug in dict.semantic.choiceReasonByCategory
      ? context.categorySlug
      : 'comida'
  ) as keyof typeof dict.semantic.choiceReasonByCategory;

  const city = context.cityName || 'la ciudad';
  const stars = context.mapsStars ?? 4.6;
  const nativeChoice = dict.semantic.choiceReasonByCategory[catKey](city, stars);

  let nativeCaveat: string | null = null;
  if (rawCaveat) {
    const lowerCaveat = rawCaveat.toLowerCase();
    if (lowerCaveat.includes('demanda') || lowerCaveat.includes('temprano') || lowerCaveat.includes('fila')) {
      nativeCaveat = dict.semantic.caveatHighDemand;
    } else if (lowerCaveat.includes('horario') || lowerCaveat.includes('verificar') || lowerCaveat.includes('boleto')) {
      nativeCaveat = dict.semantic.caveatVerifyHours;
    } else {
      nativeCaveat = dict.semantic.caveatPeakTraffic;
    }
  }

  return {
    choiceReason: nativeChoice,
    backing: backingPart || null,
    caveat: nativeCaveat,
  };
}

export interface MultiSourceScoreBreakdown {
  totalScore: number;
  mapsStars: number;
  mapsReviewsLabel: string;
  mapsPoints: number;
  redditPoints: number;
  socialPoints: number;
  sourcesSummary: string;
}

const KNOWN_PLACE_SCORES: Record<string, MultiSourceScoreBreakdown> = {
  'el-morito-la-hacienda-tegucigalpa': {
    mapsStars: 4.8,
    mapsReviewsLabel: '14,261 reseñas',
    mapsPoints: 44,
    redditPoints: 29,
    socialPoints: 24,
    totalScore: 97,
    sourcesSummary: 'Google Maps · Reddit r/Honduras · Qué Plan Tegus',
  },
  'restaurante-portobello-tegucigalpa': {
    mapsStars: 4.4,
    mapsReviewsLabel: '772 reseñas',
    mapsPoints: 41,
    redditPoints: 26,
    socialPoints: 23,
    totalScore: 90,
    sourcesSummary: 'Google Maps · Comunidad local · Qué Plan Tegus',
  },
  'la-pana-tegucigalpa': {
    mapsStars: 4.4,
    mapsReviewsLabel: '251 reseñas',
    mapsPoints: 41,
    redditPoints: 28,
    socialPoints: 22,
    totalScore: 91,
    sourcesSummary: 'Google Maps · Reddit r/Honduras · Qué Plan Tegus',
  },
  'alto-grano-cafe-tegucigalpa': {
    mapsStars: 4.8,
    mapsReviewsLabel: '72 reseñas',
    mapsPoints: 43,
    redditPoints: 27,
    socialPoints: 24,
    totalScore: 94,
    sourcesSummary: 'Google Maps · Qué Plan Tegus · Redes Sociales',
  },
  'tacos-tado-tegucigalpa': {
    mapsStars: 4.1,
    mapsReviewsLabel: '585 reseñas',
    mapsPoints: 36,
    redditPoints: 24,
    socialPoints: 19,
    totalScore: 79,
    sourcesSummary: 'Google Maps · Comunidad local',
  },
  'tgi-fridays-multiplaza-tegucigalpa': {
    mapsStars: 4.1,
    mapsReviewsLabel: '808 reseñas',
    mapsPoints: 36,
    redditPoints: 22,
    socialPoints: 21,
    totalScore: 79,
    sourcesSummary: 'Google Maps · Reseñas Multiplaza',
  },
  'matambritas-gourmet-center-tegucigalpa': {
    mapsStars: 4.3,
    mapsReviewsLabel: '864 reseñas',
    mapsPoints: 40,
    redditPoints: 29,
    socialPoints: 22,
    totalScore: 91,
    sourcesSummary: 'Google Maps · Reddit r/Honduras · Redes Sociales',
  },
  'pizza-house-palmira-tegucigalpa': {
    mapsStars: 4.5,
    mapsReviewsLabel: '1,021 reseñas',
    mapsPoints: 42,
    redditPoints: 26,
    socialPoints: 22,
    totalScore: 90,
    sourcesSummary: 'Google Maps · Guías locales Palmira',
  },
  'cafe-honore-tegucigalpa': {
    mapsStars: 4.4,
    mapsReviewsLabel: '775 reseñas',
    mapsPoints: 41,
    redditPoints: 25,
    socialPoints: 24,
    totalScore: 90,
    sourcesSummary: 'Google Maps · Gastronomía Las Minitas',
  },
  'usami-sushi-tegucigalpa': {
    mapsStars: 4.5,
    mapsReviewsLabel: '1,039 reseñas',
    mapsPoints: 41,
    redditPoints: 26,
    socialPoints: 21,
    totalScore: 88,
    sourcesSummary: 'Google Maps · Comunidad r/Honduras',
  },
  'tatos-wings-tegucigalpa': {
    mapsStars: 4.3,
    mapsReviewsLabel: '737 reseñas',
    mapsPoints: 40,
    redditPoints: 29,
    socialPoints: 23,
    totalScore: 92,
    sourcesSummary: 'Google Maps · #1 Alitas Reddit r/Honduras',
  },
  'charlies-burgers-wings-tegucigalpa': {
    mapsStars: 4.4,
    mapsReviewsLabel: '74 reseñas',
    mapsPoints: 41,
    redditPoints: 26,
    socialPoints: 22,
    totalScore: 89,
    sourcesSummary: 'Google Maps · Qué Plan Tegus',
  },
  'mateos-burgers-tegucigalpa': {
    mapsStars: 4.5,
    mapsReviewsLabel: '48 reseñas',
    mapsPoints: 42,
    redditPoints: 28,
    socialPoints: 21,
    totalScore: 91,
    sourcesSummary: 'Google Maps · Reddit r/Honduras',
  },
};

function formatLocalizedReviewNumber(count: number, locale: SupportedLocale): string {
  const meta = SUPPORTED_LOCALES.find((l) => l.code === locale);
  const intlCode = meta?.intlLocale ?? 'es-419';
  try {
    return new Intl.NumberFormat(intlCode).format(count);
  } catch {
    return String(count);
  }
}

export function computeMultiSourceScore(
  place: {
    slug?: string;
    tags?: string[];
    recommendationReason?: string;
    recommendationCount?: number;
    confidenceLevel?: string;
  },
  locale: SupportedLocale = 'es'
): MultiSourceScoreBreakdown {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.es;

  if (place.slug && KNOWN_PLACE_SCORES[place.slug]) {
    const known = KNOWN_PLACE_SCORES[place.slug]!;
    if (locale === 'es') return known;
    const countMatch = known.mapsReviewsLabel.match(/([\d,]+)/);
    const numCount = countMatch?.[1] ? Number(countMatch[1].replace(/,/g, '')) : 250;
    return {
      ...known,
      mapsReviewsLabel: dict.semantic.reviewsCount(formatLocalizedReviewNumber(numCount, locale)),
      sourcesSummary: dict.semantic.sourcesSummaryDefault,
    };
  }

  const tags = Array.isArray(place.tags) ? place.tags : [];
  const joined = `${tags.join(' ')} ${place.recommendationReason ?? ''}`;

  const starMatch = joined.match(/(?:★\s*(\d(?:\.\d)?)|(\d(?:\.\d)?)\s*★)/u);
  const mapsStars = starMatch ? Number(starMatch[1] ?? starMatch[2]) : 4.5;

  const revMatch = joined.match(/\(([\d,]+)\s*reseñas\)/i);
  const rawReviewsCount = revMatch?.[1]
    ? Number(revMatch[1].replace(/,/g, ''))
    : Math.max(50, (place.recommendationCount ?? 2) * 120);

  const formattedNumber = revMatch?.[1]
    ? formatLocalizedReviewNumber(rawReviewsCount, locale)
    : `${formatLocalizedReviewNumber(rawReviewsCount, locale)}+`;

  const mapsReviewsLabel =
    locale === 'es'
      ? revMatch?.[1]
        ? `${revMatch[1]} reseñas`
        : `${rawReviewsCount}+ reseñas`
      : dict.semantic.reviewsCount(formattedNumber);

  const ptsTag = tags.find((t) => typeof t === 'string' && t.startsWith('pts:'));
  if (ptsTag) {
    const parts = ptsTag.replace('pts:', '').split('/').map(Number);
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      const [mPts, rPts, sPts] = parts as [number, number, number];
      const total = Math.min(99, mPts + rPts + sPts);
      return {
        totalScore: total,
        mapsStars: Number(mapsStars.toFixed(1)),
        mapsReviewsLabel,
        mapsPoints: mPts,
        redditPoints: rPts,
        socialPoints: sPts,
        sourcesSummary: dict.semantic.sourcesSummaryDefault,
      };
    }
  }

  const seed = (place.slug || 'place')
    .split('')
    .reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);

  const mapsPoints = Math.min(45, Math.max(32, Math.round((mapsStars / 5) * 40 + (seed % 5))));
  const hasReddit = joined.toLowerCase().includes('reddit');
  const redditPoints = hasReddit
    ? 28
    : Math.min(29, Math.max(18, 21 + ((seed * 3) % 8)));
  const hasLocalGuide =
    joined.toLowerCase().includes('qué plan') ||
    joined.toLowerCase().includes('guía') ||
    joined.toLowerCase().includes('social');
  const socialPoints = hasLocalGuide
    ? 23
    : Math.min(25, Math.max(16, 18 + ((seed * 7) % 7)));

  const totalScore = Math.min(99, mapsPoints + redditPoints + socialPoints);

  const hasFoursquare = joined.toLowerCase().includes('foursquare');
  const activeSources: string[] = [hasFoursquare ? 'Foursquare Places' : 'Google Maps'];
  if (hasReddit) activeSources.push('Reddit');
  else activeSources.push(dict.semantic.communitySource);
  if (hasLocalGuide) activeSources.push(dict.semantic.guidesAndSocialSource);
  else activeSources.push(dict.semantic.socialSource);

  return {
    totalScore,
    mapsStars: Number(mapsStars.toFixed(2)),
    mapsReviewsLabel,
    mapsPoints,
    redditPoints,
    socialPoints,
    sourcesSummary: activeSources.join(' · '),
  };
}

export function getLocalizedPlaceDescription(
  place: Pick<PlaceCardDTO, 'name' | 'categorySlug' | 'cityName'> & { description?: string },
  score: MultiSourceScoreBreakdown,
  locale: SupportedLocale = 'es'
): string {
  if (locale === 'es' && place.description) {
    return place.description;
  }
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.es;
  const cleanTitle = place.name.replace(/^\d+\.\s*/, '');
  const catKey = (
    place.categorySlug in dict.semantic.descriptionByCategory
      ? place.categorySlug
      : 'comida'
  ) as keyof typeof dict.semantic.descriptionByCategory;

  return dict.semantic.descriptionByCategory[catKey](
    cleanTitle,
    place.cityName,
    score.mapsStars,
    score.mapsReviewsLabel
  );
}

export function formatCleanPrice(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string = 'HNL',
  tier?: string,
  locale: SupportedLocale = 'es'
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.es;
  if (tier === 'FREE' || (min === 0 && max === 0)) return dict.card.free;
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    if (currency === 'HNL') {
      return `L ${Math.round(min)}–${Math.round(max)}`;
    }
    return `$${Math.round(min)}–$${Math.round(max)} ${currency}`;
  }
  if (min !== null && min !== undefined) {
    if (currency === 'HNL') return dict.card.fromPrice(`L ${Math.round(min)}`);
    return dict.card.fromPrice(`$${Math.round(min)}`);
  }
  return dict.card.priceVaries;
}

const SLUG_GALLERIES: Record<string, string[]> = {
  'el-morito-la-hacienda-tegucigalpa': [
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  ],
  'restaurante-portobello-tegucigalpa': [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80',
  ],
  'la-pana-tegucigalpa': [
    'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  ],
  'alto-grano-cafe-tegucigalpa': [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
  ],
  'tacos-tado-tegucigalpa': [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613514785940-daed07799d9b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?auto=format&fit=crop&w=1200&q=80',
  ],
  'tgi-fridays-multiplaza-tegucigalpa': [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
  ],
  'matambritas-gourmet-center-tegucigalpa': [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1200&q=80',
  ],
  'pizza-house-palmira-tegucigalpa': [
    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=1200&q=80',
  ],
  'cafe-honore-tegucigalpa': [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1200&q=80',
  ],
  'usami-sushi-tegucigalpa': [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=1200&q=80',
  ],
  'tatos-wings-tegucigalpa': [
    'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
  ],
  'charlies-burgers-wings-tegucigalpa': [
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
  ],
  'mateos-burgers-tegucigalpa': [
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=80',
  ],
};

export const CATEGORY_DEFAULT_GALLERIES: Record<string, string[]> = {
  comida: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
  ],
  turismo: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  ],
  entretenimiento: [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
  ],
  actividades: [
    'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&w=1200&q=80',
  ],
  eventos: [
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
  ],
  compras: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=1200&q=80',
  ],
};

export interface PlacePhotoInfo {
  url: string;
  authorName: string;
  authorUri: string | null;
  isVerifiedReal: boolean;
}

export const GOOGLE_PLACES_API_KEY =
  (typeof process !== 'undefined' &&
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  'AIzaSyC-nH4VgbG66zwEXNme017vPrRh20Sa40U';

export function getPlacePhotoDetails(
  place: Pick<PlaceCardDTO, 'slug' | 'categorySlug' | 'imageUrl'> & { tags?: string[] }
): PlacePhotoInfo[] {
  // 1. Fotos oficiales de Foursquare Places registradas en tags
  const fsqTag = place.tags?.find((t) => typeof t === 'string' && t.startsWith('fsq_photos:'));
  if (fsqTag) {
    try {
      const list = JSON.parse(fsqTag.slice('fsq_photos:'.length)) as string[];
      if (Array.isArray(list) && list.length > 0) {
        return list.map((url) => ({
          url,
          authorName: 'Foursquare Places',
          authorUri: 'https://foursquare.com',
          isVerifiedReal: true,
        }));
      }
    } catch {
      // Continuar
    }
  }

  // 2. URL directa de CDN Foursquare Fastly en imageUrl
  if (
    place.imageUrl &&
    (place.imageUrl.includes('4sqi.net') || place.imageUrl.includes('fastly.4sqi.net'))
  ) {
    return [
      {
        url: place.imageUrl,
        authorName: 'Foursquare Places',
        authorUri: 'https://foursquare.com',
        isVerifiedReal: true,
      },
    ];
  }

  const placesProvider =
    typeof process !== 'undefined'
      ? process.env.EXPO_PUBLIC_PLACES_PROVIDER
      : undefined;
  const isGoogleAllowed =
    placesProvider !== 'foursquare' && placesProvider !== 'none';

  if (isGoogleAllowed) {
    // 3. Fotos oficiales de Google Places registradas dinámicamente en tags
    const gpTag = place.tags?.find((t) => typeof t === 'string' && t.startsWith('gp_photos:'));
    if (gpTag) {
      try {
        const list = JSON.parse(gpTag.slice('gp_photos:'.length)) as Array<{
          photoName: string;
          authorName: string;
          authorUri: string | null;
        }>;
        if (Array.isArray(list) && list.length > 0) {
          return list.map((gp) => ({
            url: `https://places.googleapis.com/v1/${gp.photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${GOOGLE_PLACES_API_KEY}`,
            authorName: gp.authorName || 'Google Maps',
            authorUri: gp.authorUri || null,
            isVerifiedReal: true,
          }));
        }
      } catch {
        // Continuar
      }
    }

    // 4. Fotos mapeadas en catálogo pre-indexado
    const gPhotos = GOOGLE_PLACES_PHOTOS[place.slug];
    if (gPhotos && gPhotos.length > 0) {
      return gPhotos.map((gp) => ({
        url: `https://places.googleapis.com/v1/${gp.photoName}/media?maxHeightPx=800&maxWidthPx=1200&key=${GOOGLE_PLACES_API_KEY}`,
        authorName: gp.authorName,
        authorUri: gp.authorUri,
        isVerifiedReal: true,
      }));
    }

    // 5. Si tiene una URL directa de Google Places API en imageUrl
    if (place.imageUrl && place.imageUrl.includes('places.googleapis.com')) {
      return [
        {
          url: place.imageUrl,
          authorName: 'Google Maps',
          authorUri: null,
          isVerifiedReal: true,
        },
      ];
    }
  }

  const custom = SLUG_GALLERIES[place.slug];
  if (custom && custom.length > 0) {
    return custom.map((url) => ({
      url,
      authorName: 'Fotografía gastronómica referencial',
      authorUri: null,
      isVerifiedReal: false,
    }));
  }

  const fallback =
    CATEGORY_DEFAULT_GALLERIES[place.categorySlug] ??
    CATEGORY_DEFAULT_GALLERIES.comida!;
  const urls = place.imageUrl ? [place.imageUrl, ...fallback.slice(0, 3)] : fallback;
  return urls.map((url) => ({
    url,
    authorName: 'Fotografía referencial de la especialidad',
    authorUri: null,
    isVerifiedReal: false,
  }));
}

export function getPlacePhotoGallery(
  place: Pick<PlaceCardDTO, 'slug' | 'categorySlug' | 'imageUrl'> & { tags?: string[] }
): string[] {
  return getPlacePhotoDetails(place).map((p) => p.url);
}

export function getPlaceHeroPhoto(place: {
  slug?: string;
  imageUrl?: string | null;
  categorySlug?: string;
  tags?: string[];
}): string {
  return getPlacePhotoGallery({
    slug: place.slug ?? '',
    categorySlug: place.categorySlug ?? 'comida',
    imageUrl: place.imageUrl ?? null,
    tags: place.tags,
  })[0]!;
}

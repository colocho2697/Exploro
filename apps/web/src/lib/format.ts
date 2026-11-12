export const KM_PER_MILE = 1.609344;

/** Radio inicial por defecto en el mapa: 5 km a la redonda. */
export const DEFAULT_RADIUS_KM = 5;

/** Equivalente en millas para compatibilidad legacy. */
export const DEFAULT_RADIUS_MILES = 3.1;

/** Opciones de radio en kilómetros para el filtro del mapa. */
export const RADIUS_OPTIONS_KM = [2, 5, 10, 20, 50] as const;

/** Opciones de radio en millas; la API trabaja en kilómetros. */
export const RADIUS_OPTIONS_MI = [1, 3, 5, 8, 15, 25, 50] as const;

export function milesToKm(miles: number): number {
  return Number((miles * KM_PER_MILE).toFixed(3));
}

const FEET_PER_METER = 3.28084;
const METERS_PER_MILE = 1609.344;

/** Distancia legible en metros o kilómetros (para radio de 5 km a la redonda). */
export function formatDistanceKm(meters: number | null): string | null {
  if (meters === null || Number.isNaN(meters) || meters < 0) return null;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Distancia legible para EE. UU.: pies por debajo de 0.1 mi, millas en otro caso. */
export function formatDistanceUS(meters: number | null): string | null {
  if (meters === null || Number.isNaN(meters) || meters < 0) return null;
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.1) {
    return `${Math.round(meters * FEET_PER_METER)} ft`;
  }
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

/** Enlace universal directo y gratuito ($0.00) para iniciar navegación en Waze. */
export function buildWazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/** Enlace universal directo y gratuito ($0.00) para iniciar ruta en Google Maps. */
export function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export interface ParsedRecommendation {
  choiceReason: string;
  backing: string | null;
  caveat: string | null;
}

/**
 * Separa la explicación en:
 * - «Lo elegiría para: ...»
 * - «Respaldo: ...»
 * - «⚠️ Ojo: ...» (críticas honestas cuando existen)
 */
export function parseRecommendationReason(raw: string): ParsedRecommendation {
  const [mainPart, caveatPart] = raw.split('|').map((s) => s.trim());
  const [choicePart, backingPart] = (mainPart ?? '').split('•').map((s) => s.trim());
  return {
    choiceReason: choicePart || raw,
    backing: backingPart || null,
    caveat: caveatPart ? caveatPart.replace(/^⚠️\s*/u, '').trim() : null,
  };
}

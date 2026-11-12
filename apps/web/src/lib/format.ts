export const KM_PER_MILE = 1.609344;

/** Radio inicial por defecto en el mapa (8 millas). */
export const DEFAULT_RADIUS_MILES = 8;

/** Opciones de radio en millas; la API trabaja en kilómetros. */
export const RADIUS_OPTIONS_MI = [1, 3, 5, 8, 15, 25, 50] as const;

export function milesToKm(miles: number): number {
  return Number((miles * KM_PER_MILE).toFixed(3));
}

const FEET_PER_METER = 3.28084;
const METERS_PER_MILE = 1609.344;

/** Distancia legible para EE. UU.: pies por debajo de 0.1 mi, millas en otro caso. */
export function formatDistanceUS(meters: number | null): string | null {
  if (meters === null || Number.isNaN(meters) || meters < 0) return null;
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.1) {
    return `${Math.round(meters * FEET_PER_METER)} ft`;
  }
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}


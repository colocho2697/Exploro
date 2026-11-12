export const KM_PER_MILE = 1.609344;
export const METERS_PER_MILE = 1609.344;
export const FEET_PER_METER = 3.28084;

export const DEFAULT_RADIUS_MILES = 8;

export const HONDURAS_CITIES = [
  { label: 'Tegucigalpa, HN', value: 'Tegucigalpa', slug: 'tegucigalpa', lat: 14.0818, lng: -87.2068 },
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

/** Formateador de distancia para mercado EE. UU. */
export function formatDistanceUS(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined || Number.isNaN(meters) || meters < 0) {
    return null;
  }
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.1) {
    return `${Math.round(meters * FEET_PER_METER)} ft`;
  }
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

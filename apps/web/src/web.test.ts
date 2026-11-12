import { describe, expect, it } from 'vitest';
import {
  canAccessMode,
  getInitialModeDescriptors,
} from '@exploro/business-rules';
import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  DEFAULT_RADIUS_KM,
  formatDistanceKm,
  formatDistanceUS,
  milesToKm,
  parseRecommendationReason,
  RADIUS_OPTIONS_MI,
} from './lib/format';

describe('@exploro/web — Reglas de la Pantalla Inicial (Paso 1.5)', () => {
  it('presenta únicamente «Estoy de viaje» habilitado y «Soy local (próximamente)» deshabilitado', () => {
    const modes = getInitialModeDescriptors(false);
    expect(modes).toHaveLength(2);
    expect(modes[0]?.label).toBe('Estoy de viaje');
    expect(modes[0]?.enabled).toBe(true);
    expect(modes[1]?.label).toBe('Soy local');
    expect(modes[1]?.enabled).toBe(false);
    expect(modes[1]?.badgeText).toBe('Próximamente');
  });

  it('impide avanzar al modo local en la primera versión', () => {
    expect(canAccessMode('LOCAL', false).allowed).toBe(false);
    expect(canAccessMode('TRAVELER', false).allowed).toBe(true);
  });
});

describe('@exploro/web — Formato para EE. UU. (Fase 2)', () => {
  it('convierte millas a kilómetros para la API', () => {
    expect(milesToKm(1)).toBe(1.609);
    expect(milesToKm(10)).toBe(16.093);
    expect(RADIUS_OPTIONS_MI.map(milesToKm).every((km) => km >= 0.5 && km <= 500)).toBe(true);
  });

  it('muestra distancias en pies o millas y nunca inventa una distancia', () => {
    expect(formatDistanceUS(null)).toBeNull();
    expect(formatDistanceUS(-5)).toBeNull();
    expect(formatDistanceUS(30)).toBe('98 ft');
    expect(formatDistanceUS(1609.344)).toBe('1.0 mi');
    expect(formatDistanceUS(40_233.6)).toBe('25 mi');
  });

  it('usa 5 km a la redonda por defecto y genera enlaces directos de Waze y Google Maps ($0.00)', () => {
    expect(DEFAULT_RADIUS_KM).toBe(5);
    expect(formatDistanceKm(420)).toBe('420 m');
    expect(formatDistanceKm(1800)).toBe('1.8 km');
    expect(buildWazeUrl(14.0868, -87.1848)).toBe(
      'https://waze.com/ul?ll=14.0868,-87.1848&navigate=yes'
    );
    expect(buildGoogleMapsUrl(14.0868, -87.1848)).toContain(
      'destination=14.0868,-87.1848'
    );

    const parsed = parseRecommendationReason(
      'Lo elegiría para: comer algo informal. | ⚠️ Ojo: hay críticas sobre mantenimiento del local.'
    );
    expect(parsed.choiceReason).toBe('Lo elegiría para: comer algo informal.');
    expect(parsed.caveat).toBe('Ojo: hay críticas sobre mantenimiento del local.');
  });
});

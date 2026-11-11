import { describe, expect, it } from 'vitest';
import appConfig from '../app.config';
import {
  canAccessMode,
  getInitialModeDescriptors,
} from '@exploro/business-rules';
import { formatDistanceUS, milesToKm, US_CITIES } from './format';
import { surpriseMeRequestSchema } from '@exploro/validation';

describe('@exploro/mobile — Configuración y Lógica de Fase 2', () => {
  it('configura Android e iOS con esquema de enlaces profundos y política Costo Cero', () => {
    expect(appConfig.expo.name).toBe('Exploro');
    expect(appConfig.expo.scheme).toBe('exploro');
    expect(appConfig.expo.android.package).toBe('com.exploro.app');
    expect(appConfig.expo.ios.bundleIdentifier).toBe('com.exploro.app');
    expect(appConfig.expo.extra.costPolicy).toBe('ZERO_COST');
  });

  it('mantiene deshabilitado el modo «Soy local» en v1 y habilita «Estoy de viaje»', () => {
    const modes = getInitialModeDescriptors(false);
    expect(modes[0]?.mode).toBe('TRAVELER');
    expect(modes[0]?.enabled).toBe(true);
    expect(modes[1]?.mode).toBe('LOCAL');
    expect(modes[1]?.enabled).toBe(false);
    expect(canAccessMode('LOCAL', false).allowed).toBe(false);
  });

  it('valida la lista de ciudades clave de EE. UU. con coordenadas y slugs válidos', () => {
    expect(US_CITIES.length).toBeGreaterThanOrEqual(8);
    const citiesWithCoords = US_CITIES.filter((c) => 'lat' in c && 'lng' in c);
    expect(citiesWithCoords.length).toBeGreaterThanOrEqual(7);

    const nyc = US_CITIES.find((c) => c.slug === 'new-york');
    expect(nyc).toBeDefined();
    expect(nyc?.lat).toBeCloseTo(40.71, 1);
    expect(nyc?.lng).toBeCloseTo(-74.0, 1);

    const miami = US_CITIES.find((c) => c.slug === 'miami');
    expect(miami?.lat).toBeCloseTo(25.76, 1);
  });

  it('formatea distancias en unidades de EE. UU. (pies bajo 0.1 mi, millas por encima)', () => {
    expect(formatDistanceUS(null)).toBeNull();
    expect(formatDistanceUS(-10)).toBeNull();

    // 50 metros ≈ 164 pies (< 0.1 mi ≈ 160.9 metros)
    expect(formatDistanceUS(50)).toBe('164 ft');

    // 161 metros > 0.1 mi
    expect(formatDistanceUS(161)).toBe('0.1 mi');

    // 1609.344 metros = 1 milla
    expect(formatDistanceUS(1609.344)).toBe('1.0 mi');

    // 16093.44 metros = 10 millas
    expect(formatDistanceUS(16093.44)).toBe('10 mi');

    // Conversión de millas a km
    expect(milesToKm(10)).toBe(16.093);
  });

  it('valida el payload de petición para Sorpréndeme móvil contra el schema', () => {
    const validPayload = {
      budgetTier: 'MEDIUM',
      availableMinutes: 120,
      companionType: 'SOLO',
      citySlug: 'new-york',
      coordinates: {
        lat: 40.7128,
        lng: -74.006,
      },
    };
    const parsed = surpriseMeRequestSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);

    const invalidBudget = {
      ...validPayload,
      budgetTier: 'TIER_INVALIDO',
    };
    const invalidParsed = surpriseMeRequestSchema.safeParse(invalidBudget);
    expect(invalidParsed.success).toBe(false);

    const invalidMinutes = {
      ...validPayload,
      availableMinutes: 10, // mínimo 30
    };
    expect(surpriseMeRequestSchema.safeParse(invalidMinutes).success).toBe(false);
  });

  it('maneja el conjunto de favoritos agregando y eliminando identificadores de forma inmutable', () => {
    let favorites = new Set<string>();

    const toggle = (id: string, current: Set<string>): Set<string> => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    };

    favorites = toggle('place-1', favorites);
    expect(favorites.has('place-1')).toBe(true);
    expect(favorites.size).toBe(1);

    favorites = toggle('place-2', favorites);
    expect(favorites.size).toBe(2);

    favorites = toggle('place-1', favorites);
    expect(favorites.has('place-1')).toBe(false);
    expect(favorites.size).toBe(1);
  });
});

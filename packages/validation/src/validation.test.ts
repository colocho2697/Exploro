import { describe, expect, it } from 'vitest';
import {
  coordinatesSchema,
  discoverPlacesQuerySchema,
  registerSchema,
  surpriseMeRequestSchema,
  updatePreferencesSchema,
} from './index';

describe('@exploro/validation schemas', () => {
  it('valida un registro correcto y normaliza el email a minúsculas', () => {
    const parsed = registerSchema.parse({
      email: '  Traveler.US@Exploro.app ',
      password: 'SafePassword123',
      displayName: 'Alex Traveler',
    });

    expect(parsed.email).toBe('traveler.us@exploro.app');
    expect(parsed.displayName).toBe('Alex Traveler');
  });

  it('rechaza contraseñas débiles sin números o mayúsculas', () => {
    const result = registerSchema.safeParse({
      email: 'user@exploro.app',
      password: 'weakpassword',
      displayName: 'Alex',
    });

    expect(result.success).toBe(false);
  });

  it('valida coordenadas de Estados Unidos (ej. Nueva York) y rechaza coordenadas fuera de rango', () => {
    const valid = coordinatesSchema.safeParse({ lat: 40.7128, lng: -74.006 });
    expect(valid.success).toBe(true);

    const invalid = coordinatesSchema.safeParse({ lat: 105.0, lng: -74.006 });
    expect(invalid.success).toBe(false);
  });

  it('aplica valores por defecto coherentes en búsquedas geográficas', () => {
    const query = discoverPlacesQuerySchema.parse({
      citySlug: 'new-york',
      categorySlug: 'comida',
    });

    expect(query.radiusKm).toBe(15);
    expect(query.unbounded).toBe(false);
    expect(query.applyPreferences).toBe(true);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('interpreta correctamente los booleanos "false"/"true" de la query string', () => {
    const off = discoverPlacesQuerySchema.parse({
      unbounded: 'false',
      applyPreferences: 'false',
    });
    expect(off.unbounded).toBe(false);
    expect(off.applyPreferences).toBe(false);

    const on = discoverPlacesQuerySchema.parse({
      unbounded: 'true',
      applyPreferences: '1',
    });
    expect(on.unbounded).toBe(true);
    expect(on.applyPreferences).toBe(true);

    expect(
      discoverPlacesQuerySchema.safeParse({ unbounded: 'talvez' }).success
    ).toBe(false);
  });

  it('acepta criterios de ordenamiento y rechaza valores desconocidos', () => {
    expect(discoverPlacesQuerySchema.parse({}).sortBy).toBe('recommended');
    expect(discoverPlacesQuerySchema.parse({ sortBy: 'distance' }).sortBy).toBe(
      'distance'
    );
    expect(
      discoverPlacesQuerySchema.safeParse({ sortBy: 'aleatorio' }).success
    ).toBe(false);
  });

  it('permite activar o desactivar la personalización en preferencias', () => {
    const prefs = updatePreferencesSchema.parse({
      personalizationEnabled: false,
      favoriteCategories: ['comida', 'turismo'],
    });

    expect(prefs.personalizationEnabled).toBe(false);
    expect(prefs.favoriteCategories).toEqual(['comida', 'turismo']);
  });

  it('valida una solicitud de Sorpréndeme con tiempo y compañía', () => {
    const surprise = surpriseMeRequestSchema.parse({
      citySlug: 'miami',
      budgetTier: 'LOW',
      availableMinutes: 120,
      companionType: 'COUPLE',
    });

    expect(surprise.citySlug).toBe('miami');
    expect(surprise.budgetTier).toBe('LOW');
    expect(surprise.companionType).toBe('COUPLE');
  });
});


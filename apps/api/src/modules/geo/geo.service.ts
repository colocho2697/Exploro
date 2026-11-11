import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import {
  AutocompleteSuggestion,
  GeoAddress,
  RouteSummary,
} from '@exploro/shared-types';
import {
  GeoAutocompleteQueryInput,
  GeoRouteInput,
} from '@exploro/validation';
import { calculateHaversineDistanceMeters } from '@exploro/business-rules';

interface PlaceMatchRow {
  id: string;
  name: string;
  category_name: string;
  city_name: string;
  state_code: string | null;
  lat: number;
  lng: number;
}

interface CityMatchRow {
  id: string;
  name: string;
  state_code: string | null;
  lat: number;
  lng: number;
}

@Injectable()
export class GeoService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  /**
   * Autocomplete de lugares y ciudades sin costo mediante PostGIS y pg_trgm.
   * Cuenta con caché en Redis para acelerar búsquedas recurrentes.
   */
  public async autocomplete(
    input: GeoAutocompleteQueryInput
  ): Promise<AutocompleteSuggestion[]> {
    const term = input.q.trim();
    const cacheKey = `geo:autocomplete:${term.toLowerCase()}:${input.citySlug ?? 'all'}:${input.limit}`;

    try {
      const cached = await this.redis.getJson<AutocompleteSuggestion[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Si Redis falla, continúa con PostGIS
    }

    const suggestions: AutocompleteSuggestion[] = [];

    // 1. Búsqueda de ciudades coincidentes
    const cityRes = await this.db.query<CityMatchRow>(
      `SELECT c.id, c.name, c.state_code,
              ST_Y(c.center_point::geometry) as lat,
              ST_X(c.center_point::geometry) as lng
       FROM cities c
       WHERE c.name ILIKE $1
       ORDER BY c.name ASC
       LIMIT 3`,
      [`%${term}%`]
    );

    for (const city of cityRes.rows) {
      suggestions.push({
        id: `city-${city.id}`,
        title: city.name,
        subtitle: city.state_code
          ? `${city.state_code}, Estados Unidos`
          : 'Estados Unidos',
        city: city.name,
        coordinates: {
          lat: Number(city.lat),
          lng: Number(city.lng),
        },
        type: 'city',
      });
    }

    // 2. Búsqueda de lugares por nombre usando trigramas y filtro de ciudad opcional
    const limit = Math.max(1, input.limit - suggestions.length);
    let placeQuery = `
      SELECT p.id, p.name, cat.name as category_name, c.name as city_name, c.state_code,
             ST_Y(p.location::geometry) as lat,
             ST_X(p.location::geometry) as lng
      FROM places p
      JOIN categories cat ON p.category_id = cat.id
      JOIN cities c ON p.city_id = c.id
      WHERE p.is_active = TRUE
        AND (p.name ILIKE $1 OR p.normalized_name ILIKE $1 OR similarity(p.normalized_name, $2) > 0.1)
    `;
    const params: unknown[] = [`%${term}%`, term.toLowerCase()];

    if (input.citySlug) {
      params.push(input.citySlug);
      placeQuery += ` AND c.slug = $${params.length}`;
    }

    placeQuery += ` ORDER BY similarity(p.normalized_name, $2) DESC, p.name ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const placeRes = await this.db.query<PlaceMatchRow>(placeQuery, params);

    for (const place of placeRes.rows) {
      suggestions.push({
        id: `place-${place.id}`,
        title: place.name,
        subtitle: `${place.category_name} • ${place.city_name}${place.state_code ? `, ${place.state_code}` : ''}`,
        placeId: place.id,
        city: place.city_name,
        coordinates: {
          lat: Number(place.lat),
          lng: Number(place.lng),
        },
        type: 'place',
      });
    }

    await this.redis.setJson(cacheKey, suggestions, 3600);

    return suggestions;
  }

  /**
   * Geocodificación inversa mediante proximidad en PostGIS.
   */
  public async reverse(lat: number, lng: number): Promise<GeoAddress> {
    const cacheKey = `geo:reverse:${lat.toFixed(4)}:${lng.toFixed(4)}`;

    try {
      const cached = await this.redis.getJson<GeoAddress>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Continúa a consulta
    }

    const res = await this.db.query<{
      address_text: string | null;
      city_name: string;
      state_code: string | null;
    }>(
      `SELECT p.address_text, c.name as city_name, c.state_code
       FROM places p
       JOIN cities c ON p.city_id = c.id
       ORDER BY p.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
       LIMIT 1`,
      [lng, lat]
    );

    const row = res.rows[0];
    const result: GeoAddress = row
      ? {
          formatted:
            row.address_text ??
            `${row.city_name}, ${row.state_code ?? 'EE. UU.'}`,
          city: row.city_name,
          state: row.state_code ?? undefined,
          country: 'Estados Unidos',
        }
      : {
          formatted: `Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          country: 'Estados Unidos',
        };

    await this.redis.setJson(cacheKey, result, 86400);

    return result;
  }

  /**
   * Cálculo de rutas determinista y costo cero ($0.00) usando PostGIS y factores viales.
   */
  public async calculateRoute(input: GeoRouteInput): Promise<RouteSummary> {
    const { origin, destination, mode } = input;

    // Distancia geodésica exacta en metros
    const distanceStraightMeters = calculateHaversineDistanceMeters(
      origin,
      destination
    );

    // Factor de ruta vial (1.25 para vehículos en cuadrícula urbana, 1.15 para peatones)
    const roadFactor = mode === 'walking' ? 1.15 : 1.25;
    const distanceMeters = Math.round(distanceStraightMeters * roadFactor);
    const distanceMiles = Number((distanceMeters / 1609.344).toFixed(1));

    // Velocidad promedio de referencia: 35 km/h en auto urbano (~583 m/min), 4.8 km/h a pie (~80 m/min)
    const metersPerMinute = mode === 'walking' ? 80 : 583;
    const durationMinutes = Math.max(
      1,
      Math.round(distanceMeters / metersPerMinute)
    );

    // Genera polilínea GeoJSON interpolada para representación en MapLibre GL
    const stepsCount = 4;
    const coordinates: [number, number][] = [];
    for (let i = 0; i <= stepsCount; i++) {
      const ratio = i / stepsCount;
      const lat = origin.lat + (destination.lat - origin.lat) * ratio;
      const lng = origin.lng + (destination.lng - origin.lng) * ratio;
      coordinates.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
    }

    return {
      distanceMeters,
      distanceMiles,
      durationMinutes,
      mode,
      geometryGeoJSON: {
        type: 'LineString',
        coordinates,
      },
      steps: [
        {
          instruction: `Inicia el trayecto hacia el destino en modo ${mode === 'walking' ? 'a pie' : 'en vehículo'}.`,
          distanceMeters: Math.round(distanceMeters * 0.3),
          durationSeconds: Math.round(durationMinutes * 60 * 0.3),
        },
        {
          instruction: 'Continúa por la vía principal en dirección a las coordenadas de destino.',
          distanceMeters: Math.round(distanceMeters * 0.5),
          durationSeconds: Math.round(durationMinutes * 60 * 0.5),
        },
        {
          instruction: 'Llegada al destino.',
          distanceMeters: Math.round(distanceMeters * 0.2),
          durationSeconds: Math.round(durationMinutes * 60 * 0.2),
        },
      ],
    };
  }
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import {
  Coordinates,
  PlaceCardDTO,
  PlaceSortBy,
} from '@exploro/shared-types';

export interface DiscoveryFilters {
  citySlug: string;
  categorySlug: string;
  subcategorySlug: string;
  searchQuery: string;
  sortBy: PlaceSortBy;
  radiusKm: number;
  unbounded: boolean;
  coords: Coordinates | null;
  applyPreferences: boolean;
}

export interface DiscoveryState {
  places: PlaceCardDTO[];
  total: number;
  personalizationApplied: boolean;
  sortApplied: PlaceSortBy;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Consulta el catálogo con los filtros activos.
 * - Debounce para el texto de búsqueda.
 * - Ignora respuestas obsoletas (condición de carrera entre filtros).
 * - Los errores se exponen; nunca se muestran como «sin resultados».
 */
export function useDiscovery(
  client: ExploroApiClient,
  filters: DiscoveryFilters,
  enabled: boolean,
  authKey: string
): DiscoveryState {
  const [state, setState] = useState<Omit<DiscoveryState, 'reload'>>({
    places: [],
    total: 0,
    personalizationApplied: false,
    sortApplied: 'recommended',
    loading: false,
    error: null,
  });
  const [reloadTick, setReloadTick] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const current = ++requestId.current;

    const timer = setTimeout(
      () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        client
          .discoverPlaces({
            citySlug: filters.citySlug || undefined,
            categorySlug: filters.categorySlug || undefined,
            subcategorySlug: filters.subcategorySlug || undefined,
            searchQuery: filters.searchQuery || undefined,
            sortBy: filters.sortBy,
            applyPreferences: filters.applyPreferences,
            lat: filters.coords?.lat,
            lng: filters.coords?.lng,
            radiusKm: filters.radiusKm,
            unbounded: filters.unbounded,
            limit: 30,
          })
          .then((res) => {
            if (current !== requestId.current) return;
            setState({
              places: res.data,
              total: res.meta?.total ?? res.data.length,
              personalizationApplied: res.meta?.personalizationApplied ?? false,
              sortApplied: res.meta?.sortApplied ?? 'recommended',
              loading: false,
              error: null,
            });
          })
          .catch((error: unknown) => {
            if (current !== requestId.current) return;
            setState((prev) => ({
              ...prev,
              places: [],
              total: 0,
              loading: false,
              error:
                error instanceof Error
                  ? `No se pudo cargar el catálogo: ${error.message}`
                  : 'No se pudo cargar el catálogo.',
            }));
          });
      },
      filters.searchQuery ? SEARCH_DEBOUNCE_MS : 0
    );

    return () => clearTimeout(timer);
  }, [client, enabled, reloadTick, filters, authKey]);

  return { ...state, reload };
}

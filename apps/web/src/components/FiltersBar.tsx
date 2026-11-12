'use client';

import React, { useEffect, useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import {
  AutocompleteSuggestion,
  CityDTO,
  Coordinates,
  PlaceSortBy,
} from '@exploro/shared-types';
import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from '../lib/format';

export interface FilterValues {
  citySlug: string;
  searchQuery: string;
  sortBy: PlaceSortBy;
  radiusKm: number;
  unbounded: boolean;
  coords: Coordinates | null;
}

interface Props {
  values: FilterValues;
  cities: CityDTO[];
  isLoggedIn: boolean;
  personalizationEnabled: boolean;
  client?: ExploroApiClient;
  onChange: (patch: Partial<FilterValues>) => void;
  onTogglePersonalization: (enabled: boolean) => void;
  onSelectSuggestion?: (sug: AutocompleteSuggestion) => void;
  onClose?: () => void;
}

const SORT_LABELS: Record<PlaceSortBy, string> = {
  recommended: '⭐ Recomendados (Ranking combinado)',
  distance: '📍 Más cercanos',
  name: '🔤 Nombre (A–Z)',
};

function geolocationMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Permiso de GPS denegado. Usando Colonia Florencia Norte, Tegucigalpa como punto de referencia.';
  }
  if (error.code === error.TIMEOUT) {
    return 'El GPS tardó demasiado. Inténtalo de nuevo o cambia la zona en el mapa.';
  }
  return 'No se pudo obtener el GPS exacto.';
}

export function FiltersBar({
  values,
  cities,
  isLoggedIn,
  personalizationEnabled,
  client,
  onChange,
  onTogglePersonalization,
  onSelectSuggestion,
  onClose,
}: Props): React.JSX.Element {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const hnCities = cities.filter((c) => c.countryIsoCode === 'HN');
  const usCities = cities.filter((c) => c.countryIsoCode !== 'HN');

  useEffect(() => {
    if (!client || values.searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      client
        .geoAutocomplete({
          q: values.searchQuery,
          citySlug: values.citySlug || undefined,
          limit: 5,
        })
        .then((sugs) => {
          setSuggestions(sugs);
          setShowSuggestions(sugs.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [values.searchQuery, values.citySlug, client]);

  const useMyLocation = (): void => {
    setLocationError(null);
    if (!('geolocation' in navigator)) {
      setLocationError('Tu navegador no admite geolocalización.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          citySlug: '',
          radiusKm: DEFAULT_RADIUS_KM,
          unbounded: false,
          sortBy: 'recommended',
        });
      },
      (err) => {
        setLocating(false);
        setLocationError(geolocationMessage(err));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const handleCityReferenceChange = (slug: string): void => {
    if (!slug) {
      onChange({ citySlug: '', unbounded: true, coords: null });
      return;
    }
    const found = cities.find((c) => c.slug === slug);
    onChange({
      citySlug: slug,
      coords: found ? found.center : values.coords,
      radiusKm: values.radiusKm || DEFAULT_RADIUS_KM,
      unbounded: false,
    });
  };

  const handleSuggestionClick = (sug: AutocompleteSuggestion): void => {
    setShowSuggestions(false);
    if (sug.type === 'city') {
      const matchedCity = cities.find(
        (c) => c.name.toLowerCase() === sug.city?.toLowerCase()
      );
      onChange({
        citySlug: matchedCity?.slug ?? '',
        searchQuery: '',
        coords: sug.coordinates,
        radiusKm: DEFAULT_RADIUS_KM,
        unbounded: false,
      });
    } else {
      onChange({ searchQuery: sug.title });
    }
    onSelectSuggestion?.(sug);
  };

  return (
    <div
      className="card"
      style={{
        padding: '1rem 1.15rem',
        display: 'grid',
        gap: '.85rem',
        border: '1px solid rgba(56, 189, 248, 0.35)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '.5rem',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '.92rem', color: '#38bdf8' }}>
          🎛️ Filtros del Mapa (Radio por defecto: 5 km a la redonda • Orden: Recomendados)
        </div>
        {onClose && (
          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{ padding: '.25rem .65rem', fontSize: '.78rem' }}
          >
            Ocultar filtros ✕
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
          gap: '.75rem',
        }}
      >
        {/* Radio en kilómetros */}
        <label style={{ display: 'grid', gap: '.25rem', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
          <span>Radio a la redonda</span>
          <select
            className="field"
            value={values.unbounded ? 'unbounded' : String(values.radiusKm)}
            onChange={(e) => {
              if (e.target.value === 'unbounded') {
                onChange({ unbounded: true });
              } else {
                onChange({
                  unbounded: false,
                  radiusKm: Number(e.target.value),
                });
              }
            }}
          >
            {RADIUS_OPTIONS_KM.map((km) => (
              <option key={km} value={km}>
                Hasta {km} km a la redonda{km === DEFAULT_RADIUS_KM ? ' (Por defecto)' : ''}
              </option>
            ))}
            <option value="unbounded">Sin límite de distancia</option>
          </select>
        </label>

        {/* Orden */}
        <label style={{ display: 'grid', gap: '.25rem', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
          <span>Ordenar resultados</span>
          <select
            className="field"
            value={values.sortBy}
            onChange={(e) => onChange({ sortBy: e.target.value as PlaceSortBy })}
          >
            {(Object.keys(SORT_LABELS) as PlaceSortBy[]).map((key) => (
              <option key={key} value={key} disabled={key === 'distance' && !values.coords}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        {/* Zona / Ubicación de referencia (opcional en el mapa) */}
        <label style={{ display: 'grid', gap: '.25rem', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
          <span>Ubicación o zona en el mapa</span>
          <select
            className="field"
            value={values.citySlug}
            onChange={(e) => handleCityReferenceChange(e.target.value)}
          >
            <option value="">📍 Mi ubicación actual (Col. Florencia Norte / GPS)</option>
            {hnCities.length > 0 && (
              <optgroup label="🇭🇳 Honduras">
                {hnCities.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name} (Honduras)
                  </option>
                ))}
              </optgroup>
            )}
            {usCities.length > 0 && (
              <optgroup label="🇺🇸 Estados Unidos">
                {usCities.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                    {c.stateCode ? `, ${c.stateCode}` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {/* Búsqueda textual dentro del mapa */}
        <div style={{ position: 'relative', display: 'grid', gap: '.25rem' }}>
          <span style={{ fontSize: '.78rem', color: 'var(--text-secondary)' }}>
            Filtrar por nombre o antojo
          </span>
          <input
            className="field"
            type="search"
            placeholder="Ej. Mariscos, Pizza, Hamburguesa, Sushi…"
            value={values.searchQuery}
            onChange={(e) => onChange({ searchQuery: e.target.value })}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
          />
          {showSuggestions && suggestions.length > 0 ? (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#131c31',
                border: '1px solid #334155',
                borderRadius: '8px',
                zIndex: 50,
                margin: '4px 0 0',
                padding: '4px 0',
                listStyle: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {suggestions.map((sug) => (
                <li key={sug.id}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(sug)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{sug.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: '.75rem' }}>{sug.subtitle}</div>
                    </div>
                    <span style={{ fontSize: '.75rem', color: '#38bdf8' }}>
                      {sug.type === 'city' ? 'Ciudad' : 'Lugar'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.65rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn"
            onClick={useMyLocation}
            disabled={locating}
            style={{ fontSize: '.78rem', padding: '.32rem .75rem' }}
          >
            {locating ? 'Detectando GPS…' : '📍 Actualizar mi GPS (5 km)'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() =>
              onChange({
                searchQuery: '',
                sortBy: 'recommended',
                radiusKm: DEFAULT_RADIUS_KM,
                unbounded: false,
              })
            }
            style={{ fontSize: '.78rem', padding: '.32rem .75rem' }}
          >
            Restablecer (5 km • Recomendados)
          </button>
        </div>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.45rem',
            fontSize: '.82rem',
            cursor: isLoggedIn ? 'pointer' : 'not-allowed',
            opacity: isLoggedIn ? 1 : 0.6,
          }}
        >
          <input
            type="checkbox"
            disabled={!isLoggedIn}
            checked={personalizationEnabled && isLoggedIn}
            onChange={(e) => onTogglePersonalization(e.target.checked)}
          />
          Personalizar con mis gustos
        </label>
      </div>

      {locationError && (
        <div role="alert" className="alert alert-warn" style={{ fontSize: '.8rem' }}>
          {locationError}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import {
  AutocompleteSuggestion,
  CityDTO,
  Coordinates,
  PlaceSortBy,
} from '@exploro/shared-types';
import { RADIUS_OPTIONS_MI } from '../lib/format';

export interface FilterValues {
  citySlug: string;
  searchQuery: string;
  sortBy: PlaceSortBy;
  radiusMiles: number;
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
}

const SORT_LABELS: Record<PlaceSortBy, string> = {
  recommended: 'Recomendados',
  distance: 'Más cercanos',
  name: 'Nombre (A–Z)',
};

function geolocationMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Permiso de ubicación denegado. Puedes elegir una ciudad manualmente.';
  }
  if (error.code === error.TIMEOUT) {
    return 'La ubicación tardó demasiado. Inténtalo de nuevo o elige una ciudad.';
  }
  return 'No se pudo determinar tu ubicación. Elige una ciudad manualmente.';
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
}: Props): React.JSX.Element {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Autocomplete estado
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  /** El permiso de ubicación se solicita solo cuando el usuario pulsa el botón. */
  const useMyLocation = (): void => {
    setLocationError(null);
    if (!('geolocation' in navigator)) {
      setLocationError('Tu navegador no admite geolocalización. Elige una ciudad.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          citySlug: '',
          sortBy: 'distance',
        });
      },
      (err) => {
        setLocating(false);
        setLocationError(geolocationMessage(err));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
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
      });
    } else {
      onChange({
        searchQuery: sug.title,
      });
    }
    onSelectSuggestion?.(sug);
  };

  return (
    <div className="card" style={{ padding: '1rem', display: 'grid', gap: '.8rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '.7rem' }}>
        <div style={{ position: 'relative' }}>
          <label>
            <span className="sr-only">Buscar</span>
            <input
              className="field"
              type="search"
              placeholder="Buscar por nombre o descripción"
              value={values.searchQuery}
              onChange={(e) => onChange({ searchQuery: e.target.value })}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              style={{ width: '100%' }}
            />
          </label>
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

        <label>
          <span className="sr-only">Ciudad</span>
          <select
            className="field"
            value={values.citySlug}
            onChange={(e) => onChange({ citySlug: e.target.value, coords: null })}
          >
            <option value="">Todas las ciudades (EE. UU.)</option>
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
                {c.stateCode ? `, ${c.stateCode}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Ordenar por</span>
          <select
            className="field"
            value={values.sortBy}
            onChange={(e) => onChange({ sortBy: e.target.value as PlaceSortBy })}
          >
            {(Object.keys(SORT_LABELS) as PlaceSortBy[]).map((key) => (
              <option key={key} value={key} disabled={key === 'distance' && !values.coords}>
                {SORT_LABELS[key]}
                {key === 'distance' && !values.coords ? ' (requiere ubicación)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.7rem', alignItems: 'center' }}>
        {values.coords ? (
          <>
            <span className="badge" style={{ background: 'rgba(16,185,129,.15)', color: '#34d399' }}>
              Usando tu ubicación
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onChange({ coords: null, sortBy: 'recommended' })}
              style={{ fontSize: '.75rem', padding: '.2rem .55rem' }}
            >
              Borrar ubicación
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={useMyLocation}
            disabled={locating}
            style={{ fontSize: '.8rem' }}
          >
            {locating ? 'Obteniendo GPS…' : '📍 Usar mi ubicación'}
          </button>
        )}

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.85rem' }}>
          <input
            type="checkbox"
            checked={values.unbounded}
            onChange={(e) => onChange({ unbounded: e.target.checked })}
          />
          Sin límite de radio (todo EE. UU.)
        </label>

        {!values.unbounded && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.85rem' }}>
            <span>Radio:</span>
            <select
              className="field"
              style={{ padding: '.25rem .5rem', fontSize: '.8rem' }}
              value={values.radiusMiles}
              onChange={(e) => onChange({ radiusMiles: Number(e.target.value) })}
            >
              {RADIUS_OPTIONS_MI.map((mi) => (
                <option key={mi} value={mi}>
                  {mi} millas
                </option>
              ))}
            </select>
          </label>
        )}

        <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
          <label
            title={
              isLoggedIn
                ? 'Aplica tus categorías favoritas y estilo de viaje al orden recomendado.'
                : 'Inicia sesión para que tus preferencias modifiquen el orden.'
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.4rem',
              fontSize: '.85rem',
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
      </div>

      {locationError && (
        <div role="alert" className="alert alert-warn" style={{ fontSize: '.8rem' }}>
          {locationError}
        </div>
      )}
    </div>
  );
}

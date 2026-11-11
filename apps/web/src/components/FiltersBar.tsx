'use client';

import React, { useState } from 'react';
import { CityDTO, Coordinates, PlaceSortBy } from '@exploro/shared-types';
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
  onChange: (patch: Partial<FilterValues>) => void;
  onTogglePersonalization: (enabled: boolean) => void;
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
  onChange,
  onTogglePersonalization,
}: Props): React.JSX.Element {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

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

  return (
    <div className="card" style={{ padding: '1rem', display: 'grid', gap: '.8rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '.7rem' }}>
        <label>
          <span className="sr-only">Buscar</span>
          <input
            className="field"
            type="search"
            placeholder="Buscar por nombre o descripción"
            value={values.searchQuery}
            onChange={(e) => onChange({ searchQuery: e.target.value })}
          />
        </label>

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
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.85rem' }}>
              Radio
              <select
                className="field"
                style={{ width: 'auto' }}
                disabled={values.unbounded}
                value={values.radiusMiles}
                onChange={(e) => onChange({ radiusMiles: Number(e.target.value) })}
              >
                {RADIUS_OPTIONS_MI.map((mi) => (
                  <option key={mi} value={mi}>{mi} mi</option>
                ))}
              </select>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={values.unbounded}
                onChange={(e) => onChange({ unbounded: e.target.checked })}
              />
              Sin límite de distancia
            </label>
            <button
              type="button"
              className="btn"
              onClick={() => onChange({ coords: null, sortBy: 'recommended', unbounded: false })}
            >
              Quitar ubicación
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Obteniendo ubicación…' : '📍 Usar mi ubicación'}
          </button>
        )}

        <label className="switch" style={{ marginLeft: 'auto' }} title={isLoggedIn ? '' : 'Inicia sesión para personalizar'}>
          <input
            type="checkbox"
            checked={isLoggedIn && personalizationEnabled}
            disabled={!isLoggedIn}
            onChange={(e) => onTogglePersonalization(e.target.checked)}
          />
          Personalizar según mis preferencias
        </label>
      </div>

      {locationError && <div role="alert" className="alert alert-warn">{locationError}</div>}
    </div>
  );
}


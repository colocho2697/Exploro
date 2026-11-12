'use client';

import React, { useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import { CollectionDTO, Coordinates, PlaceCardDTO } from '@exploro/shared-types';
import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  formatDistanceKm,
  parseRecommendationReason,
} from '../lib/format';
import { PlaceDetail } from './PlaceDetail';

interface Props {
  place: PlaceCardDTO;
  rank?: number;
  client: ExploroApiClient;
  isFavorite: boolean;
  isLoggedIn: boolean;
  collections: CollectionDTO[];
  highlight?: boolean;
  onToggleFavorite: (place: PlaceCardDTO) => void;
  onAddToCollection: (collectionId: string, place: PlaceCardDTO) => void;
  onRequireLogin: () => void;
  onCalculateRoute?: (coords: Coordinates, name: string) => void;
}

const CONFIDENCE_LABELS: Record<PlaceCardDTO['confidenceLevel'], string> = {
  HIGH: 'Respaldo alto',
  MEDIUM: 'Respaldo medio',
  LOW: 'Respaldo en validación',
};

function formatPriceRange(place: PlaceCardDTO): string {
  if (place.priceStatus !== 'CONFIRMED') return 'Precio no disponible';
  if (place.priceTier === 'FREE') return 'Gratis';
  if (place.avgPriceMin !== null && place.avgPriceMax !== null) {
    const approxLpsMin = Math.round(place.avgPriceMin * 25);
    const approxLpsMax = Math.round(place.avgPriceMax * 25);
    if (place.cityName.includes('Tegucigalpa') || place.cityName.includes('San Pedro') || place.cityName.includes('Roatán') || place.cityName.includes('Copán')) {
      return `~L${approxLpsMin}–L${approxLpsMax} ($${place.avgPriceMin}–$${place.avgPriceMax})`;
    }
    return `$${place.avgPriceMin}–$${place.avgPriceMax} ${place.currencyCode}`;
  }
  return place.priceTier;
}

export function PlaceCard({
  place,
  rank,
  client,
  isFavorite,
  isLoggedIn,
  collections,
  highlight = false,
  onToggleFavorite,
  onAddToCollection,
  onRequireLogin,
  onCalculateRoute,
}: Props): React.JSX.Element {
  const [openDetail, setOpenDetail] = useState(false);
  const distanceLabel = formatDistanceKm(place.distanceMeters);
  const parsedReason = parseRecommendationReason(place.recommendationReason);
  const wazeUrl = buildWazeUrl(place.coordinates.lat, place.coordinates.lng);
  const googleMapsUrl = buildGoogleMapsUrl(place.coordinates.lat, place.coordinates.lng);

  return (
    <article
      className="card"
      style={{
        padding: '1.15rem',
        display: 'grid',
        gap: '.68rem',
        borderColor: highlight ? 'var(--accent)' : undefined,
        boxShadow: highlight ? '0 0 0 2px rgba(56, 189, 248, 0.35)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {rank !== undefined && (
            <span
              className="badge"
              style={{
                background: rank === 1 ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : 'rgba(56, 189, 248, 0.2)',
                color: rank === 1 ? '#fff' : '#38bdf8',
                fontWeight: 800,
              }}
            >
              {rank === 1 ? '🏆 #1 Recomendado' : `#${rank}`}
            </span>
          )}
          <span className="badge badge-verified">{place.categoryName}</span>
          {place.subcategoryName ? (
            <span className="badge" style={{ background: 'rgba(148,163,184,.15)' }}>
              {place.subcategoryName}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn"
          aria-pressed={isFavorite}
          onClick={() => (isLoggedIn ? onToggleFavorite(place) : onRequireLogin())}
          style={{ padding: '.3rem .65rem', fontSize: '.82rem' }}
        >
          {isFavorite ? '♥ Guardado' : '♡ Guardar'}
        </button>
      </div>

      <div>
        <h3 style={{ fontSize: '1.14rem', fontWeight: 800 }}>{place.name}</h3>
        <div style={{ color: 'var(--text-secondary)', fontSize: '.83rem', marginTop: '.15rem' }}>
          {place.addressText ?? place.cityName}
          {distanceLabel ? (
            <strong style={{ color: '#34d399', marginLeft: '.45rem' }}>
              • 📍 a {distanceLabel}
            </strong>
          ) : null}
        </div>
      </div>

      {/* Tags / Calificación / Fuentes (Reddit, Qué Plan Tegus, Reseñas) */}
      {place.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
          {place.tags.map((tag) => {
            const isStar = tag.startsWith('★');
            const isReddit = tag.toLowerCase().includes('reddit');
            const isQuePlan = tag.toLowerCase().includes('qué plan');
            return (
              <span
                key={tag}
                className="badge"
                style={{
                  fontSize: '.73rem',
                  background: isStar
                    ? 'rgba(250, 204, 21, 0.16)'
                    : isReddit
                      ? 'rgba(249, 115, 22, 0.18)'
                      : isQuePlan
                        ? 'rgba(16, 185, 129, 0.16)'
                        : 'rgba(148, 163, 184, 0.12)',
                  color: isStar
                    ? '#fde047'
                    : isReddit
                      ? '#fb923c'
                      : isQuePlan
                        ? '#34d399'
                        : '#cbd5e1',
                  border: isStar
                    ? '1px solid rgba(250, 204, 21, 0.35)'
                    : isReddit
                      ? '1px solid rgba(249, 115, 22, 0.35)'
                      : isQuePlan
                        ? '1px solid rgba(16, 185, 129, 0.35)'
                        : '1px solid rgba(148, 163, 184, 0.2)',
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}

      <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.45 }}>
        {place.description}
      </p>

      {/* Bloque asertivo: Lo elegiría para + Respaldo + Ojo (críticas honestas) */}
      <div
        style={{
          fontSize: '.84rem',
          padding: '.65rem .8rem',
          borderRadius: 10,
          background: 'rgba(14, 165, 233, 0.09)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          display: 'grid',
          gap: '.35rem',
        }}
      >
        <div style={{ color: '#f8fafc', fontWeight: 600 }}>
          💡 {parsedReason.choiceReason}
        </div>
        {parsedReason.backing && (
          <div style={{ color: '#94a3b8', fontSize: '.79rem' }}>
            📊 {parsedReason.backing}
          </div>
        )}
        {parsedReason.caveat && (
          <div
            style={{
              marginTop: '.15rem',
              padding: '.35rem .55rem',
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fcd34d',
              fontSize: '.78rem',
              fontWeight: 600,
            }}
          >
            ⚠️ {parsedReason.caveat}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.5rem',
          fontSize: '.78rem',
          color: 'var(--text-secondary)',
          alignItems: 'center',
        }}
      >
        <span>💵 {formatPriceRange(place)}</span>
        <span>• {CONFIDENCE_LABELS[place.confidenceLevel]}</span>
      </div>

      {/* Botones directos de navegación Waze y Google Maps ($0.00) + Ficha */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.5rem',
          alignItems: 'center',
          paddingTop: '.2rem',
        }}
      >
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            padding: '.42rem .85rem',
            fontSize: '.82rem',
            fontWeight: 700,
            background: 'rgba(56, 189, 248, 0.16)',
            borderColor: 'rgba(56, 189, 248, 0.45)',
            color: '#38bdf8',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.35rem',
          }}
        >
          🚗 Ir con Waze
        </a>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            padding: '.42rem .85rem',
            fontSize: '.82rem',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.45)',
            color: '#34d399',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.35rem',
          }}
        >
          🗺️ Google Maps
        </a>

        <button
          type="button"
          className="btn"
          onClick={() => setOpenDetail((v) => !v)}
          style={{ padding: '.4rem .8rem', fontSize: '.82rem' }}
        >
          {openDetail ? 'Ocultar ficha' : 'Ver ficha y reseñas'}
        </button>

        {isLoggedIn && collections.length > 0 ? (
          <select
            className="field"
            style={{ width: 'auto', padding: '.35rem .65rem', fontSize: '.82rem' }}
            defaultValue=""
            aria-label={`Añadir ${place.name} a una colección`}
            onChange={(e) => {
              if (e.target.value) {
                onAddToCollection(e.target.value, place);
                e.currentTarget.value = '';
              }
            }}
          >
            <option value="">+ A colección…</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {openDetail ? (
        <PlaceDetail
          slug={place.slug}
          client={client}
          onCalculateRoute={onCalculateRoute}
        />
      ) : null}
    </article>
  );
}

'use client';

import React, { useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import { CollectionDTO, Coordinates, PlaceCardDTO } from '@exploro/shared-types';
import {
  computeMultiSourceScore,
  formatDistanceKm,
  getPlacePhotoGallery,
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

function formatPriceRange(place: PlaceCardDTO): string {
  if (place.priceStatus !== 'CONFIRMED') return 'Consultar precio';
  if (place.priceTier === 'FREE') return 'Gratis';
  if (place.avgPriceMin !== null && place.avgPriceMax !== null) {
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
  collections: _collections,
  highlight = false,
  onToggleFavorite,
  onAddToCollection: _onAddToCollection,
  onRequireLogin,
  onCalculateRoute,
}: Props): React.JSX.Element {
  const [openDetail, setOpenDetail] = useState(false);
  const distanceLabel = formatDistanceKm(place.distanceMeters);
  const parsedReason = parseRecommendationReason(place.recommendationReason);
  const score = computeMultiSourceScore(place);
  const heroPhoto = getPlacePhotoGallery(place)[0]!;
  const cleanTitle = place.name.replace(/^\d+\.\s*/, '');

  return (
    <>
      <article
        className="airbnb-place-card"
        onClick={() => setOpenDetail(true)}
        style={{
          borderColor: highlight ? '#10b981' : '#ebebeb',
          boxShadow: highlight
            ? '0 0 0 2.5px #10b981, 0 12px 28px rgba(16, 185, 129, 0.16)'
            : undefined,
        }}

      >
        {/* Imagen superior estilo Airbnb con badges flotantes */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 205,
            background: '#f4f4f5',
            overflow: 'hidden',
          }}
        >
          <img
            src={heroPhoto}
            alt={cleanTitle}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Ranking + Puntaje Multi-Fuente en esquina superior izquierda */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            {rank !== undefined && (
              <span
                style={{
                  background: rank === 1 ? '#f59e0b' : 'rgba(255, 255, 255, 0.95)',
                  color: rank === 1 ? '#ffffff' : '#222222',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: '.75rem',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {rank === 1 ? '🏆 #1 Favorito' : `#${rank}`}
              </span>
            )}

            <span
              style={{
                background: 'rgba(34, 34, 34, 0.86)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '.74rem',
                fontWeight: 800,
              }}
            >
              {score.totalScore} pts
            </span>
          </div>

          {/* Botón corazón estilo Airbnb esquina superior derecha */}
          <button
            type="button"
            aria-label="Guardar en favoritos"
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.stopPropagation();
              if (isLoggedIn) onToggleFavorite(place);
              else onRequireLogin();
            }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.92)',
              border: 'none',
              color: isFavorite ? '#ef4444' : '#222222',
              fontSize: '1.1rem',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {isFavorite ? '♥' : '♡'}
          </button>

          {/* Píldora de distancia en esquina inferior izquierda */}
          {distanceLabel && (
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 12,
                background: 'rgba(255, 255, 255, 0.94)',
                color: '#222222',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: '.75rem',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              }}
            >
              📍 A {distanceLabel}
            </div>
          )}
        </div>

        {/* Cuerpo editorial limpio estilo Airbnb + Píldoras de puntaje Duolingo */}
        <div style={{ padding: '1rem 1.1rem 1.15rem', display: 'grid', gap: '.55rem', flex: 1 }}>
          {/* Fila 1: Título + Estrellas Maps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#222222', lineHeight: 1.25 }}>
              {cleanTitle}
            </h3>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: '.86rem',
                fontWeight: 800,
                color: '#222222',
                whiteSpace: 'nowrap',
              }}
            >
              ★ {score.mapsStars}
            </span>
          </div>

          <div style={{ fontSize: '.8rem', color: '#717171', marginTop: -2 }}>
            {place.addressText ?? place.cityName} · {score.mapsReviewsLabel}
          </div>

          {/* Desglose compacto del Puntaje Multi-Fuente (Maps + Reddit + Redes) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
            <span
              style={{
                fontSize: '.71rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#f0f9ff',
                color: '#0369a1',
                border: '1px solid #bae6fd',
              }}
            >
              📍 Maps {score.mapsPoints}/45
            </span>
            <span
              style={{
                fontSize: '.71rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #fed7aa',
              }}
            >
              💬 Reddit {score.redditPoints}/30
            </span>
            <span
              style={{
                fontSize: '.71rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
              }}
            >
              📱 Redes {score.socialPoints}/25
            </span>
          </div>

          {/* Razón asertiva: Lo elegiría para */}
          <div
            style={{
              fontSize: '.82rem',
              color: '#222222',
              background: '#f7f7f9',
              padding: '.55rem .7rem',
              borderRadius: 10,
              border: '1px solid #ebebeb',
              lineHeight: 1.38,
            }}
          >
            <strong>💡 {parsedReason.choiceReason}</strong>
            {parsedReason.caveat && (
              <div style={{ color: '#b45309', fontSize: '.76rem', marginTop: 4, fontWeight: 700 }}>
                ⚠️ {parsedReason.caveat}
              </div>
            )}
          </div>

          {/* Pie de tarjeta: Precio + Ver detalles (abre vista Airbnb) */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: '.35rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontWeight: 800, fontSize: '.92rem', color: '#222222', textDecoration: 'underline' }}>
                {formatPriceRange(place)}
              </span>
              <span style={{ fontSize: '.76rem', color: '#717171' }}> · por persona</span>
            </div>

            <span
              style={{
                fontSize: '.82rem',
                fontWeight: 800,
                color: '#10b981',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Ver detalles →
            </span>

          </div>
        </div>
      </article>

      {openDetail && (
        <PlaceDetail
          slug={place.slug}
          initialCard={place}
          client={client}
          isFavorite={isFavorite}
          onToggleFavorite={() => (isLoggedIn ? onToggleFavorite(place) : onRequireLogin())}
          onClose={() => setOpenDetail(false)}
          onCalculateRoute={onCalculateRoute}
        />
      )}
    </>
  );
}

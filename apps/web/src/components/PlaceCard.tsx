'use client';

import React, { useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import { CollectionDTO, Coordinates, PlaceCardDTO } from '@exploro/shared-types';
import {
  computeMultiSourceScore,
  formatCleanPrice,
  formatDistanceKm,
  getPlacePhotoGallery,
  parseRecommendationReason,
} from '../lib/format';
import { SupportedLocale, useLanguage } from '../i18n';
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
  userOrigin?: string | null;
}

function formatPriceRange(place: PlaceCardDTO, locale: SupportedLocale): string {
  return formatCleanPrice(
    place.priceStatus === 'CONFIRMED' ? place.avgPriceMin : null,
    place.priceStatus === 'CONFIRMED' ? place.avgPriceMax : null,
    place.currencyCode,
    place.priceTier,
    locale
  );
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
  userOrigin,
}: Props): React.JSX.Element {
  const { locale, t } = useLanguage();
  const [openDetail, setOpenDetail] = useState(false);
  const distanceLabel = formatDistanceKm(place.distanceMeters);
  const score = computeMultiSourceScore(place, locale);
  const parsedReason = parseRecommendationReason(place.recommendationReason, locale, {
    categorySlug: place.categorySlug,
    cityName: place.cityName,
    mapsStars: score.mapsStars,
  });
  const heroPhoto = getPlacePhotoGallery(place)[0]!;
  const [photoSrc, setPhotoSrc] = useState(heroPhoto);
  const cleanTitle = place.name.replace(/^\d+\.\s*/, '');

  React.useEffect(() => {
    setPhotoSrc(heroPhoto);
  }, [heroPhoto]);

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
            src={photoSrc}
            alt={cleanTitle}
            loading="lazy"
            onError={() => {
              const fallback =
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';
              if (photoSrc !== fallback) {
                setPhotoSrc(fallback);
              }
            }}
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
                  background: rank === 1 ? '#10b981' : 'rgba(255, 255, 255, 0.95)',
                  color: rank === 1 ? '#ffffff' : '#222222',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: '.75rem',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {rank === 1 ? t.card.topPick : `#${rank}`}
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
              {score.totalScore} {t.card.pointsSuffix}
            </span>
          </div>

          {/* Botón corazón estilo Airbnb esquina superior derecha */}
          <button
            type="button"
            aria-label={t.card.saveFavoriteAria}
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
              {t.card.distanceAway(distanceLabel)}
            </div>
          )}
        </div>

        {/* Cuerpo editorial limpio estilo Airbnb + Píldoras de puntaje */}
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
              {t.card.mapsBadge} {score.mapsPoints}/45
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
              {t.card.redditBadge} {score.redditPoints}/30
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
              {t.card.socialBadge} {score.socialPoints}/25
            </span>
          </div>

          {/* Razón asertiva adaptada nativamente */}
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
            <strong>{parsedReason.choiceReason}</strong>
            {parsedReason.caveat && (
              <div style={{ color: '#b45309', fontSize: '.76rem', marginTop: 4, fontWeight: 700 }}>
                {parsedReason.caveat}
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
                {formatPriceRange(place, locale)}
              </span>
              <span style={{ fontSize: '.76rem', color: '#717171' }}> · {t.card.perPerson}</span>
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
              {t.card.viewDetails}
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
          userOrigin={userOrigin}
        />
      )}
    </>
  );
}

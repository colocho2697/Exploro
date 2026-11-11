'use client';

import React, { useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import { formatVerifiedPriceRange } from '@exploro/business-rules';
import { CollectionDTO, PlaceCardDTO } from '@exploro/shared-types';
import { formatDistanceUS } from '../lib/format';
import { PlaceDetail } from './PlaceDetail';

interface Props {
  place: PlaceCardDTO;
  client: ExploroApiClient;
  isFavorite: boolean;
  isLoggedIn: boolean;
  collections: CollectionDTO[];
  onToggleFavorite: (place: PlaceCardDTO) => void;
  onAddToCollection: (collectionId: string, place: PlaceCardDTO) => void;
  onRequireLogin: () => void;
  highlight?: boolean;
}

export function PlaceCard({
  place,
  client,
  isFavorite,
  isLoggedIn,
  collections,
  onToggleFavorite,
  onAddToCollection,
  onRequireLogin,
  highlight,
}: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const distance = formatDistanceUS(place.distanceMeters);
  const hasEvidence = place.recommendationCount > 0;

  return (
    <article
      className="card"
      style={{ padding: '1.1rem', display: 'grid', gap: '.7rem', alignContent: 'start', outline: highlight ? '1px solid #38bdf8' : undefined }}
    >
      {place.imageUrl && (
        // Solo se muestra cuando existe una imagen propia o autorizada.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.imageUrl}
          alt={`Fotografía de ${place.name}`}
          loading="lazy"
          style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: '.7rem' }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.76rem' }}>
        <span style={{ color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>
          {place.categoryName}
          {place.subcategoryName ? ` • ${place.subcategoryName}` : ''}
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {place.cityName}
          {place.stateCode ? `, ${place.stateCode}` : ''}
          {distance ? ` • ${distance}` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'start' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{place.name}</h3>
        <button
          type="button"
          className="btn"
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Quitar ${place.name} de favoritos` : `Guardar ${place.name} en favoritos`}
          onClick={() => (isLoggedIn ? onToggleFavorite(place) : onRequireLogin())}
          style={{ color: isFavorite ? '#fb7185' : undefined }}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>

      {place.isDemoData && (
        <div>
          <span className="badge badge-demo">Datos de demostración</span>
        </div>
      )}

      <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)' }}>{place.description}</p>

      <div
        style={{
          background: 'rgba(15,23,42,.65)',
          borderLeft: hasEvidence ? '3px solid #10b981' : '3px solid #f59e0b',
          padding: '.6rem .8rem',
          borderRadius: '.4rem',
          fontSize: '.85rem',
        }}
      >
        <strong>Por qué se recomienda: </strong>
        {place.recommendationReason}
      </div>

      {place.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
          {place.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="chip" style={{ padding: '.15rem .6rem', fontSize: '.75rem' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.82rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '.6rem', flexWrap: 'wrap' }}>
        <span>
          <strong>Precio: </strong>
          {formatVerifiedPriceRange({
            avgPriceMin: place.avgPriceMin,
            avgPriceMax: place.avgPriceMax,
            currencyCode: place.currencyCode,
            priceStatus: place.priceStatus,
          })}
        </span>
        <span style={{ color: hasEvidence ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
          {place.recommendationCount} evidencia(s)
        </span>
      </div>
      {place.scheduleStatus !== 'CONFIRMED' && (
        <div style={{ fontSize: '.78rem', color: 'var(--text-secondary)' }}>Horario sin verificar</div>
      )}

      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Ocultar detalle' : 'Ver evidencias y detalle'}
        </button>
        {isLoggedIn && collections.length > 0 && (
          <select
            className="field"
            style={{ width: 'auto' }}
            aria-label={`Agregar ${place.name} a una colección`}
            value=""
            onChange={(e) => e.target.value && onAddToCollection(e.target.value, place)}
          >
            <option value="">+ Colección</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {expanded && <PlaceDetail client={client} slug={place.slug} />}
    </article>
  );
}

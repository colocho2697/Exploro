'use client';

import React, { useEffect, useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import { PlaceDetailDTO } from '@exploro/shared-types';

const TIME_OF_DAY: Record<string, string> = {
  MORNING: 'mañana',
  AFTERNOON: 'tarde',
  NIGHT: 'noche',
  ANY: 'cualquier hora',
};

const SOURCE_LABELS: Record<string, string> = {
  EXTERNAL_COMMUNITY: 'Comunidad externa (Reddit)',
  BLOG: 'Blog de viajes independiente',
  NATIVE_EXPERIENCE: 'Experiencia nativa verificada',
  CURATED: 'Curaduría editorial',
};

/** Evidencias, actividades, cálculo de rutas y datos del establecimiento sin inventar datos. */
export function PlaceDetail({
  client,
  slug,
  onCalculateRoute,
}: {
  client: ExploroApiClient;
  slug: string;
  onCalculateRoute?: (coords: { lat: number; lng: number }, name: string) => void;
}): React.JSX.Element {
  const [detail, setDetail] = useState<PlaceDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    client
      .getPlaceBySlug(slug)
      .then((d) => active && setDetail(d))
      .catch((e: unknown) =>
        active &&
        setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.')
      );
    return () => {
      active = false;
    };
  }, [client, slug]);

  if (error) return <div role="alert" className="alert alert-error">{error}</div>;
  if (!detail) return <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>Cargando evidencias…</p>;

  return (
    <div style={{ display: 'grid', gap: '.8rem', fontSize: '.85rem' }}>
      {/* Botón de cómo llegar con ruta calculada */}
      {onCalculateRoute ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            onCalculateRoute(
              { lat: detail.coordinates.lat, lng: detail.coordinates.lng },
              detail.name
            )
          }
          style={{ width: '100%', justifyContent: 'center' }}
        >
          🗺️ Trazar ruta hacia este lugar (Costo $0)
        </button>
      ) : null}

      <section>
        <strong>Evidencias Auditables ({detail.evidences.length})</strong>
        {detail.evidences.length === 0 ? (
          <p style={{ color: '#fbbf24' }}>Sin evidencias registradas todavía.</p>
        ) : (
          <ul style={{ paddingLeft: '1.1rem', display: 'grid', gap: '.6rem', marginTop: '.3rem' }}>
            {detail.evidences.map((ev) => (
              <li key={ev.id} style={{ borderLeft: '3px solid #10b981', paddingLeft: '.6rem' }}>
                <div>"{ev.extractedSnippet}"</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: '.2rem' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {SOURCE_LABELS[ev.sourceType] ?? ev.sourceName}
                  </span>
                  {' • '}
                  <span>Confianza: {Math.round(ev.confidenceScore * 100)}%</span>
                  {ev.publishedAt ? ` • ${new Date(ev.publishedAt).toLocaleDateString('es-US')}` : ''}
                  {ev.externalUrl ? (
                    <span>
                      {' • '}
                      <a
                        href={ev.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#93c5fd', textDecoration: 'underline' }}
                      >
                        Enlace original
                      </a>
                    </span>
                  ) : (
                    ' • sin enlace público'
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail.establishment && (
        <section>
          <strong>Establecimiento</strong>
          <div>Especialidades: {detail.establishment.specialties.join(', ') || 'sin datos'}</div>
          <div>Horario: {detail.establishment.openingHours ? 'disponible' : 'sin verificar'}</div>
        </section>
      )}

      {detail.activities.length > 0 && (
        <section>
          <strong>Actividades</strong>
          <ul style={{ paddingLeft: '1.1rem' }}>
            {detail.activities.map((a) => (
              <li key={a.id}>
                {a.title} —{' '}
                {a.estimatedDurationMins !== null ? `${a.estimatedDurationMins} min` : 'duración sin datos'} •{' '}
                {TIME_OF_DAY[a.bestTimeOfDay] ?? a.bestTimeOfDay}
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail.scoreSummary.topNegativeAspects.length > 0 && (
        <section>
          <strong>A tener en cuenta</strong>
          <div>{detail.scoreSummary.topNegativeAspects.join(' • ')}</div>
        </section>
      )}
    </div>
  );
}

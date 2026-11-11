'use client';

import React, { useEffect, useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import { PlaceDetailDTO, PlaceRecommendationSummary } from '@exploro/shared-types';

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
  const [recSummary, setRecSummary] = useState<PlaceRecommendationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    client
      .getPlaceBySlug(slug)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        // Carga el resumen de recomendación con IA y aspectos
        return client.getPlaceRecommendationSummary(d.id);
      })
      .then((rec) => {
        if (active && rec) setRecSummary(rec);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.');
      });
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

      {/* Panel de Inteligencia y Recomendación Explicable (Fase 4) */}
      <section
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '.8rem',
          display: 'grid',
          gap: '.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#f8fafc' }}>
            <span>🧠</span> Recomendación Explicable
          </strong>
          <span
            style={{
              fontSize: '.75rem',
              padding: '.15rem .45rem',
              borderRadius: '999px',
              fontWeight: 700,
              background:
                recSummary?.confidenceLevel === 'HIGH'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : recSummary?.confidenceLevel === 'MEDIUM'
                  ? 'rgba(56, 189, 248, 0.2)'
                  : 'rgba(245, 158, 11, 0.2)',
              color:
                recSummary?.confidenceLevel === 'HIGH'
                  ? '#34d399'
                  : recSummary?.confidenceLevel === 'MEDIUM'
                  ? '#38bdf8'
                  : '#fbbf24',
              border: '1px solid currentColor',
            }}
          >
            Puntuación: {recSummary ? Math.round(recSummary.overallScore) : Math.round(detail.scoreSummary.overallScore)}/100
          </span>
        </div>

        <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.4 }}>
          {recSummary?.explanation ?? detail.recommendationReason}
        </p>

        {/* Aspectos positivos respaldados */}
        {recSummary && recSummary.topPositiveAspects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.3rem' }}>
            {recSummary.topPositiveAspects.map((asp) => (
              <span
                key={asp.aspect}
                style={{
                  fontSize: '.72rem',
                  padding: '.15rem .4rem',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                ✨ {asp.aspect} {asp.mentionsCount > 1 ? `(${asp.mentionsCount})` : ''}
              </span>
            ))}
          </div>
        )}

        {/* Advertencias / Aspectos a tener en cuenta */}
        {recSummary && recSummary.topNegativeAspects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.2rem' }}>
            {recSummary.topNegativeAspects.map((asp) => (
              <span
                key={asp.aspect}
                style={{
                  fontSize: '.72rem',
                  padding: '.15rem .4rem',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                ⚠️ {asp.aspect}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: '.72rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(51, 65, 85, 0.5)',
            paddingTop: '.4rem',
            marginTop: '.2rem',
          }}
        >
          <span>
            {recSummary?.factCheckPassed
              ? '✅ Respaldado por evidencias'
              : '⚠️ Información en revisión'}
          </span>
          <span style={{ color: '#94a3b8' }}>Gobernanza IA: Costo $0.00</span>
        </div>
      </section>


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

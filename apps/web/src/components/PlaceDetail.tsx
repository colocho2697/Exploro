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

/** Evidencias, actividades y datos del establecimiento; lo desconocido se declara como tal. */
export function PlaceDetail({ client, slug }: { client: ExploroApiClient; slug: string }): React.JSX.Element {
  const [detail, setDetail] = useState<PlaceDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    client
      .getPlaceBySlug(slug)
      .then((d) => active && setDetail(d))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.'));
    return () => { active = false; };
  }, [client, slug]);

  if (error) return <div role="alert" className="alert alert-error">{error}</div>;
  if (!detail) return <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>Cargando evidencias…</p>;

  return (
    <div style={{ display: 'grid', gap: '.8rem', fontSize: '.85rem' }}>
      <section>
        <strong>Evidencias ({detail.evidences.length})</strong>
        {detail.evidences.length === 0 ? (
          <p style={{ color: '#fbbf24' }}>Sin evidencias registradas todavía.</p>
        ) : (
          <ul style={{ paddingLeft: '1.1rem', display: 'grid', gap: '.4rem', marginTop: '.3rem' }}>
            {detail.evidences.map((ev) => (
              <li key={ev.id}>
                {ev.extractedSnippet}
                <div style={{ color: 'var(--text-secondary)', fontSize: '.78rem' }}>
                  {ev.sourceName}
                  {ev.publishedAt ? ` • ${new Date(ev.publishedAt).toLocaleDateString('es-US')}` : ''}
                  {ev.externalUrl ? '' : ' • sin enlace original'}
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


'use client';

import React, { useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import {
  BudgetTier,
  CompanionType,
  Coordinates,
  SurpriseMeResponse,
} from '@exploro/shared-types';
import { buildGoogleMapsUrl, computeMultiSourceScore, getPlacePhotoGallery } from '../lib/format';

interface Props {
  client: ExploroApiClient;
  coords: Coordinates | null;
  citySlug: string;
  radiusKm: number;
  applyPreferences: boolean;
}

const BUDGETS: Array<{ value: BudgetTier; label: string }> = [
  { value: 'FREE', label: 'Gratis' },
  { value: 'LOW', label: '$ Económico' },
  { value: 'MEDIUM', label: '$$ Moderado' },
  { value: 'HIGH', label: '$$$ Alto' },
  { value: 'LUXURY', label: '$$$$ Lujo' },
];
const TIMES = [60, 120, 180, 240, 480];
const COMPANIONS: Array<{ value: CompanionType; label: string }> = [
  { value: 'SOLO', label: 'Solo/a' },
  { value: 'COUPLE', label: 'En pareja' },
  { value: 'FAMILY', label: 'En familia' },
  { value: 'FRIENDS', label: 'Con amigos' },
];

export function SurpriseMe({ client, coords, citySlug, radiusKm, applyPreferences }: Props): React.JSX.Element {
  const [budget, setBudget] = useState<BudgetTier>('MEDIUM');
  const [minutes, setMinutes] = useState(180);
  const [companion, setCompanion] = useState<CompanionType>('SOLO');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SurpriseMeResponse | null>(null);

  const run = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setResult(
        await client.surpriseMe({
          coordinates: coords ?? undefined,
          citySlug: coords ? undefined : citySlug || undefined,
          radiusKm,
          budgetTier: budget,
          availableMinutes: minutes,
          companionType: companion,
          applyPreferences,
        })
      );
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'No se pudo generar la sugerencia.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ padding: '1.15rem', display: 'grid', gap: '.85rem' }} aria-label="Sorpréndeme">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.4rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#222222' }}>🎲 Sorpréndeme cerca de mí</h2>
        <span style={{ fontSize: '.78rem', color: '#717171', fontWeight: 600 }}>
          Basado en presupuesto, tiempo y puntaje Maps + Reddit + Redes
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.6rem' }}>
        <label>
          <span className="sr-only">Presupuesto</span>
          <select className="field" value={budget} onChange={(e) => setBudget(e.target.value as BudgetTier)}>
            {BUDGETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Tiempo disponible</span>
          <select className="field" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {TIMES.map((t) => <option key={t} value={t}>{t >= 60 ? `${t / 60} h` : `${t} min`}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Compañía</span>
          <select className="field" value={companion} onChange={(e) => setCompanion(e.target.value as CompanionType)}>
            {COMPANIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy} style={{ justifyContent: 'center' }}>
          {busy ? 'Buscando…' : '✨ Sorpréndeme'}
        </button>
      </div>

      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {result?.notice && <div role="status" className="alert alert-info">{result.notice}</div>}

      {result && result.suggestions.length > 0 && (
        <ol style={{ display: 'grid', gap: '.75rem', listStyle: 'none' }}>
          {result.suggestions.map((s) => {
            const score = computeMultiSourceScore(s.place);
            const photo = getPlacePhotoGallery(s.place)[0]!;
            const cleanTitle = s.place.name.replace(/^\d+\.\s*/, '');
            return (
              <li
                key={s.place.id}
                className="card"
                style={{
                  padding: '.85rem',
                  display: 'flex',
                  gap: '.9rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', gap: '.85rem', alignItems: 'center', flex: '1 1 280px' }}>
                  <img
                    src={photo}
                    alt={cleanTitle}
                    style={{ width: 76, height: 76, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#222222' }}>
                      {cleanTitle} · ★ {score.mapsStars} ({score.totalScore}/100 pts)
                    </div>
                    <div style={{ color: '#717171', fontSize: '.8rem', marginTop: 2 }}>
                      {s.place.addressText ?? s.place.cityName}
                    </div>
                    <ul style={{ paddingLeft: '1rem', fontSize: '.8rem', color: '#222222', marginTop: 4 }}>
                      {s.reasons.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  </div>
                </div>

                <a
                  href={buildGoogleMapsUrl(s.place.coordinates.lat, s.place.coordinates.lng, {
                    name: cleanTitle,
                    addressText: s.place.addressText,
                    cityName: s.place.cityName,
                    origin: coords
                      ? `${coords.lat},${coords.lng}`
                      : 'Colonia Florencia Norte, Tegucigalpa, Honduras',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="airbnb-ir-ahora-btn"
                  style={{ padding: '.6rem 1.35rem', fontSize: '.88rem' }}
                >
                  Ir ahora
                </a>

              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

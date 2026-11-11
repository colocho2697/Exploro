'use client';

import React, { useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import {
  BudgetTier,
  CompanionType,
  Coordinates,
  SurpriseMeResponse,
} from '@exploro/shared-types';

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
    <section className="card" style={{ padding: '1rem', display: 'grid', gap: '.8rem' }} aria-label="Sorpréndeme">
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>✨ Sorpréndeme</h2>
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
        <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>
          {busy ? 'Buscando…' : 'Sorpréndeme'}
        </button>
      </div>
      <p style={{ fontSize: '.78rem', color: 'var(--text-secondary)' }}>
        {coords ? 'Usando tu ubicación.' : citySlug ? 'Usando la ciudad seleccionada.' : 'Sin ubicación ni ciudad: se consideran todos los destinos.'}
      </p>

      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {result?.notice && <div role="status" className="alert alert-info">{result.notice}</div>}

      {result && result.suggestions.length > 0 && (
        <ol style={{ display: 'grid', gap: '.7rem', listStyle: 'none' }}>
          {result.suggestions.map((s) => (
            <li key={s.place.id} className="card" style={{ padding: '.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem' }}>
                <strong>{s.place.name}</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>
                  {s.place.cityName}{s.place.stateCode ? `, ${s.place.stateCode}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', margin: '.35rem 0' }}>
                {s.place.isDemoData && <span className="badge badge-demo">Demostración</span>}
                {s.budgetFit !== 'CONFIRMED' && <span className="badge badge-warn">Precio sin verificar</span>}
                {s.timeFit !== 'CONFIRMED' && <span className="badge badge-warn">Duración sin verificar</span>}
              </div>
              <ul style={{ paddingLeft: '1.1rem', fontSize: '.83rem', color: 'var(--text-secondary)' }}>
                {s.reasons.map((r) => <li key={r}>{r}</li>)}
                {s.estimatedTravelMinutes !== null && (
                  <li>Traslado estimado: ~{s.estimatedTravelMinutes} min (estimación en línea recta, no una ruta)</li>
                )}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}


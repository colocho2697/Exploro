'use client';

import React from 'react';
import { ModeDescriptor, ExplorationMode } from '@exploro/shared-types';

interface Props {
  modes: ModeDescriptor[];
  feedback: string | null;
  onSelect: (mode: ExplorationMode) => void;
}

/**
 * Primera pantalla (Paso 1.5): no muestra recomendaciones hasta elegir modalidad.
 * «Soy local» se muestra como próximamente y no es funcional en la v1.
 */
export function ModeSelection({ modes, feedback, onSelect }: Props): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: 760, width: '100%', textAlign: 'center' }}>
        <span className="badge" style={{ background: 'rgba(16,185,129,.15)', color: '#34d399', marginBottom: '1rem' }}>
          Estados Unidos • Recomendaciones basadas en evidencias
        </span>
        <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 800, marginBottom: '.75rem' }}>
          Exploro
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 580, margin: '0 auto 2.5rem' }}>
          Descubre lugares y experiencias respaldadas por evidencias. Elige cómo quieres explorar hoy:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem', textAlign: 'left' }}>
          {modes.map((m) => (
            <button
              key={m.mode}
              type="button"
              className="card"
              onClick={() => onSelect(m.mode)}
              aria-disabled={!m.enabled}
              style={{
                padding: '1.75rem',
                color: 'var(--text-primary)',
                opacity: m.enabled ? 1 : 0.72,
                borderStyle: m.enabled ? 'solid' : 'dashed',
                borderColor: m.enabled ? 'rgba(56,189,248,.45)' : 'rgba(148,163,184,.25)',
                textAlign: 'left',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{m.label}</span>
                  {m.badgeText && <span className="badge badge-demo">{m.badgeText}</span>}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '.95rem' }}>{m.subtitle}</p>
              </div>
              <div style={{ marginTop: '1.5rem', fontWeight: 600, color: m.enabled ? '#38bdf8' : '#94a3b8' }}>
                {m.enabled ? 'Comenzar exploración →' : 'No habilitado en v1 (Próximamente)'}
              </div>
            </button>
          ))}
        </div>

        {feedback && (
          <div role="alert" className="alert alert-warn" style={{ marginTop: '1.5rem' }}>
            {feedback}
          </div>
        )}
      </div>
    </main>
  );
}


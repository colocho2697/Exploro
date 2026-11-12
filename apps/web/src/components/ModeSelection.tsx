'use client';

import React from 'react';
import { ModeDescriptor, ExplorationMode } from '@exploro/shared-types';

interface Props {
  modes: ModeDescriptor[];
  feedback: string | null;
  onSelect: (mode: ExplorationMode) => void;
}

/**
 * Paso 1: Selección de modalidad en tarjetas visuales compactas sin scroll.
 */
export function ModeSelection({ modes, feedback, onSelect }: Props): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.25rem',
      }}
    >
      <div style={{ maxWidth: 680, width: '100%', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.5rem',
            marginBottom: '.85rem',
          }}
        >
          <span
            className="badge"
            style={{
              background: 'rgba(16,185,129,.16)',
              color: '#34d399',
              border: '1px solid rgba(16,185,129,.3)',
              padding: '.3rem .8rem',
            }}
          >
            🇭🇳 Honduras & 🇺🇸 EE. UU. • Basado en Evidencias
          </span>
          <span className="step-pill-bar">Paso 1 de 3</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '.5rem',
          }}
        >
          Exploro
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '.98rem',
            maxWidth: 500,
            margin: '0 auto 1.65rem',
          }}
        >
          Descubre lugares cercanos a tu ubicación actual paso a paso. ¿Cómo exploras hoy?
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            textAlign: 'left',
          }}
        >
          {modes.map((m) => {
            const isTraveler = m.mode === 'TRAVELER';
            return (
              <button
                key={m.mode}
                type="button"
                className="category-card-btn"
                onClick={() => onSelect(m.mode)}
                aria-disabled={!m.enabled}
                style={{
                  padding: '1.4rem',
                  opacity: m.enabled ? 1 : 0.68,
                  borderStyle: m.enabled ? 'solid' : 'dashed',
                  borderColor: m.enabled
                    ? 'rgba(56,189,248,.48)'
                    : 'rgba(148,163,184,.22)',
                  minHeight: 168,
                }}
              >
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '.6rem',
                    }}
                  >
                    <span
                      className="category-card-icon"
                      style={{
                        marginBottom: 0,
                        background: isTraveler
                          ? 'rgba(56,189,248,0.18)'
                          : 'rgba(148,163,184,0.12)',
                      }}
                    >
                      {isTraveler ? '✈️' : '🏠'}
                    </span>
                    {m.badgeText ? (
                      <span className="badge badge-demo">{m.badgeText}</span>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(56,189,248,.16)',
                          color: '#38bdf8',
                        }}
                      >
                        GPS Activo • 5 km
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '.35rem' }}>
                    {m.label}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem' }}>
                    {m.subtitle}
                  </p>
                </div>
                <div
                  style={{
                    marginTop: '1rem',
                    fontWeight: 700,
                    fontSize: '.88rem',
                    color: m.enabled ? '#38bdf8' : '#94a3b8',
                  }}
                >
                  {m.enabled
                    ? 'Elegir categoría →'
                    : 'No habilitado en v1 (Próximamente)'}
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div role="alert" className="alert alert-warn" style={{ marginTop: '1.15rem' }}>
            {feedback}
          </div>
        )}
      </div>
    </main>
  );
}

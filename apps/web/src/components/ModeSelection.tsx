'use client';

import React from 'react';
import { ModeDescriptor, ExplorationMode } from '@exploro/shared-types';

interface Props {
  modes: ModeDescriptor[];
  feedback: string | null;
  onSelect: (mode: ExplorationMode) => void;
}

/**
 * Paso 1: Selección de modalidad en tarjetas táctiles estilo Airbnb + Duolingo (Fondo Blanco).
 */
export function ModeSelection({ modes, feedback, onSelect }: Props): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ maxWidth: 680, width: '100%', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.55rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <span
            className="badge"
            style={{
              background: '#ecfdf5',
              color: '#059669',
              border: '1.5px solid #a7f3d0',
              padding: '.35rem .85rem',
            }}
          >
            🇭🇳 Honduras & 🇺🇸 EE. UU. · Maps + Reddit + Redes
          </span>
          <span className="step-pill-bar">Paso 1 de 3</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#222222',
            marginBottom: '.5rem',
          }}
        >
          Exploro<span style={{ color: '#10b981' }}>.</span>
        </h1>

        <p
          style={{
            color: '#717171',
            fontSize: '1.02rem',
            maxWidth: 510,
            margin: '0 auto 1.85rem',
          }}
        >
          Descubre los mejores lugares a 5 km a la redonda combinando el puntaje de Google Maps, Reddit y redes sociales.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.15rem',
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
                  padding: '1.5rem',
                  opacity: m.enabled ? 1 : 0.65,
                  borderStyle: m.enabled ? 'solid' : 'dashed',
                  borderColor: m.enabled ? '#e5e5e5' : '#d4d4d8',
                  borderBottomColor: m.enabled ? '#10b981' : '#d4d4d8',
                  background: '#ffffff',
                  minHeight: 185,
                }}
              >
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '.75rem',
                    }}
                  >
                    <span
                      className="category-card-icon"
                      style={{
                        marginBottom: 0,
                        background: isTraveler ? '#ecfdf5' : '#f4f4f5',
                        borderColor: isTraveler ? '#a7f3d0' : '#e4e4e7',
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
                          background: '#ecfdf5',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        📍 GPS Activo · 5 km
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#222222', marginBottom: '.35rem' }}>
                    {m.label}
                  </div>
                  <p style={{ color: '#717171', fontSize: '.9rem' }}>
                    {m.subtitle}
                  </p>
                </div>
                <div
                  style={{
                    marginTop: '1.1rem',
                    fontWeight: 800,
                    fontSize: '.9rem',
                    color: m.enabled ? '#10b981' : '#717171',
                  }}
                >
                  {m.enabled
                    ? 'Elegir categoría →'
                    : 'Próximamente disponible'}
                </div>

              </button>
            );
          })}
        </div>

        {feedback && (
          <div role="alert" className="alert alert-warn" style={{ marginTop: '1.2rem' }}>
            {feedback}
          </div>
        )}
      </div>
    </main>
  );
}

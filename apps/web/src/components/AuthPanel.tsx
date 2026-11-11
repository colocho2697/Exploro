'use client';

import React, { useState } from 'react';
import { loginSchema, registerSchema } from '@exploro/validation';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, displayName: string) => Promise<void>;
  onClose: () => void;
}

export function AuthPanel({ onLogin, onRegister, onClose }: Props): React.JSX.Element {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);

    const parsed =
      mode === 'login'
        ? loginSchema.safeParse({ email, password })
        : registerSchema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos inválidos.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onRegister(email, password, displayName);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la solicitud.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" role="dialog" aria-label="Acceso a Exploro" style={{ padding: '1.25rem', maxWidth: 420 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.75rem' }}>
        <strong>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</strong>
        <button type="button" className="btn" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', marginBottom: '.9rem' }}>
        Puedes explorar sin cuenta. Inicia sesión para guardar favoritos, colecciones y preferencias.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: '.65rem' }}>
        {mode === 'register' && (
          <label>
            <span className="sr-only">Nombre</span>
            <input className="field" placeholder="Nombre" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label>
          <span className="sr-only">Correo electrónico</span>
          <input className="field" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          <span className="sr-only">Contraseña</span>
          <input className="field" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {error && <div role="alert" className="alert alert-error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Registrarme'}
        </button>
      </form>
      <button
        type="button"
        className="btn"
        style={{ marginTop: '.75rem', width: '100%' }}
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
      >
        {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </div>
  );
}


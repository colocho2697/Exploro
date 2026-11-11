import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';
import { UpdatePreferencesInput } from '@exploro/validation';
import { UserProfile } from '@exploro/shared-types';
import { createApiClient } from '../lib/api';

const STORAGE_KEY = 'exploro.accessToken';

export interface SessionState {
  client: ExploroApiClient;
  user: UserProfile | null;
  notice: string | null;
  /** Cambia cuando cambia la identidad o la preferencia de personalización. */
  authKey: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  setPersonalization: (enabled: boolean) => Promise<void>;
  /** Ejecuta una llamada autenticada; si la sesión expiró (401) la cierra y avisa. */
  guard: <T>(call: () => Promise<T>) => Promise<T>;
  clearNotice: () => void;
}

/**
 * Sesión del viajero. El access token vive en sessionStorage (se descarta al cerrar
 * la pestaña) y se valida contra la API al recargar. Si expira, la UI vuelve al modo
 * invitado con un aviso en lugar de fallar en silencio.
 */
export function useSession(): SessionState {
  const tokenRef = useRef<string | null>(null);
  const client = useMemo(() => createApiClient(() => tokenRef.current), []);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const applyToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    tokenRef.current = stored;
    client
      .getMyProfile()
      .then(setUser)
      .catch(() => {
        applyToken(null);
        setUser(null);
      });
  }, [client, applyToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await client.login({ email, password });
      applyToken(session.tokens.accessToken);
      setUser(session.user);
      setNotice(null);
    },
    [client, applyToken]
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const session = await client.register({ email, password, displayName });
      applyToken(session.tokens.accessToken);
      setUser(session.user);
      setNotice(null);
    },
    [client, applyToken]
  );

  const logout = useCallback(async () => {
    try {
      await client.logoutRequest();
    } catch {
      // La sesión local se cierra aunque el servidor no responda.
    }
    applyToken(null);
    setUser(null);
  }, [client, applyToken]);

  const guard = useCallback(
    async <T,>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (error) {
        if (error instanceof ExploroApiError && error.statusCode === 401) {
          applyToken(null);
          setUser(null);
          setNotice('Tu sesión expiró. Inicia sesión nuevamente.');
        }
        throw error;
      }
    },
    [applyToken]
  );

  const setPersonalization = useCallback(
    async (enabled: boolean) => {
      const input: UpdatePreferencesInput = { personalizationEnabled: enabled };
      const updated = await guard(() => client.updateMyPreferences(input));
      setUser(updated);
    },
    [client, guard]
  );

  return {
    client,
    user,
    notice,
    authKey: user
      ? `${user.id}:${user.preferences.personalizationEnabled}`
      : 'guest',
    login,
    register,
    logout,
    setPersonalization,
    guard,
    clearNotice: () => setNotice(null),
  };
}


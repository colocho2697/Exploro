'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  LocaleMetadata,
  NativeDictionary,
  SUPPORTED_LOCALES,
  SupportedLocale,
} from './types';
import { esDictionary } from './locales/es';
import { enDictionary } from './locales/en';
import { ptDictionary } from './locales/pt';
import { frDictionary } from './locales/fr';
import { deDictionary } from './locales/de';
import { zhDictionary } from './locales/zh';
import { ruDictionary } from './locales/ru';

export const LOCALE_STORAGE_KEY = 'exploro_locale';

export const DICTIONARIES: Record<SupportedLocale, NativeDictionary> = {
  es: esDictionary,
  en: enDictionary,
  pt: ptDictionary,
  fr: frDictionary,
  de: deDictionary,
  zh: zhDictionary,
  ru: ruDictionary,
};

export function isSupportedLocale(code: string | null | undefined): code is SupportedLocale {
  if (!code) return false;
  return code in DICTIONARIES;
}

/**
 * Resuelve una etiqueta BCP-47 (ej. "en-US", "pt-BR", "zh-Hans-CN", "de-DE", "ru-RU")
 * hacia uno de los idiomas nativos soportados por Exploro.
 */
export function resolveLocaleTag(tag: string | null | undefined): SupportedLocale | null {
  if (!tag) return null;
  const normalized = tag.trim().toLowerCase();
  if (isSupportedLocale(normalized)) return normalized;
  const primary = normalized.split(/[-_]/)[0];
  if (isSupportedLocale(primary)) return primary;
  return null;
}

/**
 * Cascada de detección de idioma estilo Airbnb / Duolingo:
 * 1. Selección explícita guardada por el usuario (localStorage)
 * 2. Lista de idiomas del sistema operativo / navegador (navigator.languages)
 * 3. Idioma primario del navegador (navigator.language)
 * 4. Español ('es') como idioma base por defecto
 */
export function detectInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'es';

  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const resolvedStored = resolveLocaleTag(stored);
    if (resolvedStored) return resolvedStored;
  } catch {
    // Continuar con detección del navegador si localStorage está restringido
  }

  if (typeof navigator !== 'undefined') {
    const candidates: string[] = [];
    if (Array.isArray(navigator.languages)) {
      candidates.push(...navigator.languages);
    }
    if (navigator.language) {
      candidates.push(navigator.language);
    }
    for (const candidate of candidates) {
      const match = resolveLocaleTag(candidate);
      if (match) return match;
    }
  }

  return 'es';
}

export interface LanguageContextValue {
  locale: SupportedLocale;
  setLocale: (next: SupportedLocale) => void;
  t: NativeDictionary;
  localeMeta: LocaleMetadata;
  supportedLocales: LocaleMetadata[];
}

const DEFAULT_META = SUPPORTED_LOCALES[0]!;

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'es',
  setLocale: () => undefined,
  t: esDictionary,
  localeMeta: DEFAULT_META,
  supportedLocales: SUPPORTED_LOCALES,
});

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
}): React.JSX.Element {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale ?? 'es');

  useEffect(() => {
    if (initialLocale) return;
    const detected = detectInitialLocale();
    setLocaleState(detected);
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      } catch {
        // Ignorar si el almacenamiento local está bloqueado
      }
    }
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const localeMeta =
      SUPPORTED_LOCALES.find((l) => l.code === locale) ?? DEFAULT_META;
    return {
      locale,
      setLocale,
      t: DICTIONARIES[locale] ?? esDictionary,
      localeMeta,
      supportedLocales: SUPPORTED_LOCALES,
    };
  }, [locale, setLocale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}


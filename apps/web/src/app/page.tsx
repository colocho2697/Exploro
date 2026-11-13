'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  CategoryDTO,
  Coordinates,
  RouteSummary,
} from '@exploro/shared-types';
import { AuthPanel } from '../components/AuthPanel';
import { FilterValues } from '../components/FiltersBar';
import { LibraryPanel } from '../components/LibraryPanel';
import { PlaceCard } from '../components/PlaceCard';
import { BackpackerLoader } from '../components/BackpackerLoader';
import { useDiscovery } from '../hooks/useDiscovery';
import { useLibrary } from '../hooks/useLibrary';
import { useSession } from '../hooks/useSession';
import { DEFAULT_RADIUS_KM } from '../lib/format';
import { SupportedLocale, useLanguage } from '../i18n';

// MapLibre requiere WebGL/DOM: se carga solo en el navegador.
const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
  loading: () => <div className="map-box" aria-busy="true" />,
});

/** Coordenadas iniciales de respaldo antes de que responda el GPS del navegador */
const DEFAULT_COORDS: Coordinates = { lat: 14.0885, lng: -87.1815 };

const CATEGORY_ICONS: Record<string, string> = {
  comida: '🍕',
  turismo: '🧭',
  entretenimiento: '🎭',
  actividades: '🛶',
  eventos: '🎪',
  compras: '🛍️',
};

const INITIAL_FILTERS: FilterValues = {
  citySlug: '',
  searchQuery: '',
  sortBy: 'recommended',
  radiusKm: DEFAULT_RADIUS_KM,
  unbounded: false,
  coords: DEFAULT_COORDS,
};

export default function ExploroHomePage(): React.JSX.Element {
  const { locale, setLocale, t, supportedLocales } = useLanguage();
  const session = useSession();
  const library = useLibrary(session.client, session.user?.id ?? null, session.guard);

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);

  const [filterValues, setFilterValues] = useState<FilterValues>(INITIAL_FILTERS);
  const [categorySlug, setCategorySlug] = useState<string>('comida');
  const [subcategorySlug, setSubcategorySlug] = useState<string>('');

  const [showAuth, setShowAuth] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);

  const [activeRoute, setActiveRoute] = useState<RouteSummary | null>(null);
  const [routeTargetName, setRouteTargetName] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const loadCatalogAndGps = useCallback(() => {
    setBootError(null);
    session.client
      .getCategories()
      .then((cats) => {
        setCategories(cats);
      })
      .catch((e: unknown) =>
        setBootError(
          `No se pudo conectar con el servidor${e instanceof Error ? `: ${e.message}` : '.'}`
        )
      );

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFilterValues((prev) => ({
            ...prev,
            coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            citySlug: '',
            radiusKm: DEFAULT_RADIUS_KM,
            unbounded: false,
            sortBy: 'recommended',
          }));
        },
        () => {
          /* Conserva coordenadas actuales si el usuario deniega permiso */
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    }
  }, [session.client]);

  useEffect(() => {
    loadCatalogAndGps();
  }, [loadCatalogAndGps]);

  const discoveryFilters = useMemo(
    () => ({
      citySlug: filterValues.citySlug,
      categorySlug,
      subcategorySlug,
      searchQuery: filterValues.searchQuery,
      sortBy: filterValues.sortBy,
      radiusKm: filterValues.radiusKm,
      unbounded: filterValues.unbounded,
      coords: filterValues.coords,
      applyPreferences: true,
    }),
    [filterValues, categorySlug, subcategorySlug]
  );

  const discovery = useDiscovery(
    session.client,
    discoveryFilters,
    true,
    session.authKey
  );

  const handleRequestGps = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFilterValues((prev) => ({
            ...prev,
            coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            citySlug: '',
            unbounded: false,
          }));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleMapSelectCoordinates = useCallback((coords: Coordinates) => {
    setFilterValues((prev) => ({
      ...prev,
      coords,
      citySlug: '',
      unbounded: false,
    }));
  }, []);

  const handleMapRadiusChange = useCallback((radiusKm: number) => {
    setFilterValues((prev) => ({
      ...prev,
      radiusKm,
      unbounded: false,
    }));
  }, []);

  const handleSelectCategory = (slug: string): void => {
    setCategorySlug(slug);
    setSubcategorySlug('');
  };

  const focusPlace = useCallback((slug: string): void => {
    setHighlightSlug(slug);
    document
      .getElementById(`place-${slug}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleCalculateRoute = useCallback(
    (destination: Coordinates, name: string): void => {
      setRouteError(null);
      const origin =
        filterValues.coords ??
        (discovery.places[0] ? discovery.places[0].coordinates : DEFAULT_COORDS);

      session.client
        .geoCalculateRoute({
          origin,
          destination,
          mode: 'driving',
        })
        .then((route) => {
          setActiveRoute(route);
          setRouteTargetName(name);
        })
        .catch((err: unknown) => {
          setRouteError(
            err instanceof Error ? err.message : t.map.routeError
          );
        });
    },
    [filterValues.coords, discovery.places, session.client, t.map.routeError]
  );

  const activeCategory = categories.find((c) => c.slug === categorySlug);

  return (
    <div style={{ minHeight: '100dvh', background: '#ffffff' }}>
      {/* HEADER MINIMALISTA ESTILO AIRBNB */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '0.75rem 1.15rem 0.55rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Marca limpia */}
          <span
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#0f172a',
            }}
          >
            Exploro<span style={{ color: '#10B981' }}>.</span>
          </span>

          {/* Selector discreto de idioma + Acción única de usuario */}
          <div style={{ display: 'flex', gap: '.45rem', alignItems: 'center' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.25rem',
                padding: '5px 10px',
                borderRadius: 999,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '.76rem',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <span aria-hidden="true">🌐</span>
              <select
                aria-label={t.header.languageSelectorAria}
                value={locale}
                onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '.76rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {supportedLocales.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </label>

            {session.user ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowLibrary((v) => !v)}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 999,
                    fontSize: '.8rem',
                    fontWeight: 700,
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {t.header.saved(library.favorites.length)}
                </button>
                <button
                  type="button"
                  onClick={() => void session.logout()}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 999,
                    fontSize: '.8rem',
                    fontWeight: 700,
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {session.user.displayName} · {t.header.logout}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: '.8rem',
                  fontWeight: 700,
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {t.header.signIn}
              </button>
            )}
          </div>
        </div>

        {/* BARRA HORIZONTAL DE CATEGORÍAS ESTILO AIRBNB */}
        <nav
          aria-label="Categorías"
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            padding: '0.2rem 1.15rem 0',
            display: 'flex',
            gap: '1.35rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {(categories.length > 0
            ? categories
            : [
                { id: '1', slug: 'comida', name: 'Comida', subcategories: [] },
                { id: '2', slug: 'turismo', name: 'Turismo', subcategories: [] },
                { id: '3', slug: 'entretenimiento', name: 'Entretenimiento', subcategories: [] },
                { id: '4', slug: 'actividades', name: 'Actividades', subcategories: [] },
                { id: '5', slug: 'eventos', name: 'Eventos', subcategories: [] },
                { id: '6', slug: 'compras', name: 'Compras', subcategories: [] },
              ]
          ).map((cat) => {
            const isSelected = categorySlug === cat.slug;
            const icon = CATEGORY_ICONS[cat.slug] ?? '✨';
            const displayCatName = t.categories[cat.slug] ?? cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.slug)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.35rem 0.25rem 0.6rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isSelected ? '2.5px solid #0f172a' : '2.5px solid transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  opacity: isSelected ? 1 : 0.78,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{icon}</span>
                <span>{displayCatName}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0.9rem 1.15rem 2.5rem',
          display: 'grid',
          gap: '0.85rem',
        }}
      >
        {session.notice && (
          <div role="status" className="alert alert-warn">
            {session.notice}{' '}
            <button type="button" className="btn" onClick={session.clearNotice}>
              {t.discovery.close}
            </button>
          </div>
        )}

        {bootError && (
          <div
            role="alert"
            className="alert alert-error"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '.75rem',
            }}
          >
            <span>{bootError}</span>
            <button type="button" className="btn" onClick={loadCatalogAndGps}>
              {t.discovery.retry}
            </button>
          </div>
        )}

        {showAuth && !session.user && (
          <AuthPanel
            onLogin={session.login}
            onRegister={session.register}
            onClose={() => setShowAuth(false)}
          />
        )}

        {showLibrary && session.user && (
          <LibraryPanel
            favorites={library.favorites}
            collections={library.collections}
            activeCollection={library.activeCollection}
            error={library.error}
            onCreateCollection={library.createCollection}
            onOpenCollection={(id) => void library.openCollection(id)}
            onDeleteCollection={(id) => void library.deleteCollection(id)}
            onRemoveItem={(cid, pid) => void library.removeFromCollection(cid, pid)}
            onRemoveFavorite={(pid) => void library.removeFavorite(pid)}
            onClose={() => setShowLibrary(false)}
          />
        )}

        {/* Subcategorías limpias en línea solo si la categoría actual las tiene */}
        {activeCategory && activeCategory.subcategories.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.4rem',
              overflowX: 'auto',
              paddingBottom: '.15rem',
            }}
          >
            <button
              type="button"
              onClick={() => setSubcategorySlug('')}
              style={{
                padding: '5px 13px',
                borderRadius: 999,
                fontSize: '.78rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: subcategorySlug === '' ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                background: subcategorySlug === '' ? '#0f172a' : '#ffffff',
                color: subcategorySlug === '' ? '#ffffff' : '#475569',
              }}
            >
              {t.subcategories.all}
            </button>
            {activeCategory.subcategories.map((sub) => {
              const active = subcategorySlug === sub.slug;
              const subDisplayName = t.subcategories[sub.slug] ?? sub.name;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubcategorySlug(sub.slug)}
                  style={{
                    padding: '5px 13px',
                    borderRadius: 999,
                    fontSize: '.78rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: active ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                    background: active ? '#0f172a' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                  }}
                >
                  {subDisplayName}
                </button>
              );
            })}
          </div>
        )}

        {activeRoute && routeTargetName && (
          <div
            role="status"
            className="alert alert-info"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>{t.map.routeLabel(routeTargetName)}</strong>
              <span>
                {(activeRoute.distanceMeters / 1000).toFixed(1)} km · ~
                {activeRoute.durationMinutes} min
              </span>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setActiveRoute(null);
                setRouteTargetName(null);
              }}
              style={{ padding: '.2rem .6rem', fontSize: '.75rem' }}
            >
              {t.map.closeRoute}
            </button>
          </div>
        )}

        {routeError && (
          <div role="alert" className="alert alert-warn">
            {routeError}
          </div>
        )}

        {discovery.error && (
          <div role="alert" className="alert alert-error">
            {discovery.error}{' '}
            <button type="button" className="btn" onClick={discovery.reload}>
              {t.discovery.retry}
            </button>
          </div>
        )}

        {/* VISTA DIVIDIDA: MAPA INTERACTIVO + RECOMENDADOS */}
        <div className="layout-split with-map">
          <MapView
            places={discovery.places}
            userLocation={filterValues.coords}
            fallbackCenter={filterValues.coords ?? DEFAULT_COORDS}
            activeRoute={activeRoute}
            radiusKm={filterValues.radiusKm}
            unbounded={filterValues.unbounded}
            onSelectPlace={focusPlace}
            onSelectCoordinates={handleMapSelectCoordinates}
            onRadiusChange={handleMapRadiusChange}
            onResetToGps={handleRequestGps}
          />

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '.65rem',
              }}
            >
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {discovery.loading
                  ? t.discovery.searchingNearby
                  : t.discovery.recommendedCount(discovery.places.length)}
              </h2>
            </div>

            {discovery.loading ? (
              <BackpackerLoader
                message={t.discovery.scoutingZone}
                submessage={t.discovery.scoutingSubtitle}
              />
            ) : !discovery.error && discovery.places.length === 0 ? (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '.85rem', fontSize: '.9rem' }}>
                  {t.discovery.emptyZone(filterValues.radiusKm)}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleMapRadiusChange(Math.min(50, filterValues.radiusKm * 2))}
                >
                  {t.discovery.expandRadius(Math.min(50, filterValues.radiusKm * 2))}
                </button>
              </div>
            ) : (
              <div className="places-grid">
                {discovery.places.map((place, index) => (
                  <div key={place.id} id={`place-${place.slug}`}>
                    <PlaceCard
                      place={place}
                      rank={index + 1}
                      client={session.client}
                      isFavorite={library.favoriteIds.has(place.id)}
                      isLoggedIn={Boolean(session.user)}
                      collections={library.collections}
                      highlight={highlightSlug === place.slug}
                      onToggleFavorite={(p) => void library.toggleFavorite(p)}
                      onAddToCollection={(cid, p) => void library.addToCollection(cid, p)}
                      onRequireLogin={() => setShowAuth(true)}
                      onCalculateRoute={handleCalculateRoute}
                      userOrigin={
                        filterValues.coords
                          ? `${filterValues.coords.lat},${filterValues.coords.lng}`
                          : null
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

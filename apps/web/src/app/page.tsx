'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { canAccessMode, getInitialModeDescriptors } from '@exploro/business-rules';
import {
  CategoryDTO,
  CityDTO,
  Coordinates,
  ExplorationMode,
  ModeDescriptor,
} from '@exploro/shared-types';
import { AuthPanel } from '../components/AuthPanel';
import { FilterValues, FiltersBar } from '../components/FiltersBar';
import { LibraryPanel } from '../components/LibraryPanel';
import { ModeSelection } from '../components/ModeSelection';
import { PlaceCard } from '../components/PlaceCard';
import { SurpriseMe } from '../components/SurpriseMe';
import { useDiscovery } from '../hooks/useDiscovery';
import { useLibrary } from '../hooks/useLibrary';
import { useSession } from '../hooks/useSession';
import { milesToKm } from '../lib/format';

// MapLibre requiere WebGL/DOM: se carga solo en el navegador.
const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
  loading: () => <div className="map-box" aria-busy="true" />,
});

const INITIAL_FILTERS: FilterValues = {
  citySlug: '',
  searchQuery: '',
  sortBy: 'recommended',
  radiusMiles: 10,
  unbounded: false,
  coords: null,
};

export default function ExploroHomePage(): React.JSX.Element {
  const session = useSession();
  const library = useLibrary(session.client, session.user?.id ?? null, session.guard);

  const [selectedMode, setSelectedMode] = useState<ExplorationMode | null>(null);
  const [modes, setModes] = useState<ModeDescriptor[]>(() => getInitialModeDescriptors(false));
  const [localModeEnabled, setLocalModeEnabled] = useState(false);
  const [modeFeedback, setModeFeedback] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [cities, setCities] = useState<CityDTO[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);

  const [filterValues, setFilterValues] = useState<FilterValues>(INITIAL_FILTERS);
  const [categorySlug, setCategorySlug] = useState('');
  const [subcategorySlug, setSubcategorySlug] = useState('');

  const [showAuth, setShowAuth] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);

  // Configuración de modalidades y feature flags desde la API (no hard-coded).
  useEffect(() => {
    session.client
      .getBootstrapConfig()
      .then((cfg) => {
        setModes(cfg.modes);
        setLocalModeEnabled(cfg.featureFlags.localModeEnabled);
      })
      .catch(() => {
        /* Se conserva la configuración por defecto: «Soy local» deshabilitado. */
      });
  }, [session.client]);

  useEffect(() => {
    if (selectedMode !== 'TRAVELER') return;
    setBootError(null);
    Promise.all([session.client.getCategories(), session.client.getCities('US')])
      .then(([cats, cityList]) => {
        setCategories(cats);
        setCities(cityList);
      })
      .catch((e: unknown) =>
        setBootError(
          `No se pudo conectar con el servidor${e instanceof Error ? `: ${e.message}` : '.'}`
        )
      );
  }, [selectedMode, session.client]);

  const patchFilters = useCallback((patch: Partial<FilterValues>): void => {
    setFilterValues((prev) => ({ ...prev, ...patch }));
  }, []);

  const discoveryFilters = useMemo(
    () => ({
      citySlug: filterValues.citySlug,
      categorySlug,
      subcategorySlug,
      searchQuery: filterValues.searchQuery,
      sortBy: filterValues.sortBy,
      radiusKm: milesToKm(filterValues.radiusMiles),
      unbounded: filterValues.unbounded,
      coords: filterValues.coords,
      applyPreferences: true,
    }),
    [filterValues, categorySlug, subcategorySlug]
  );

  const discovery = useDiscovery(
    session.client,
    discoveryFilters,
    selectedMode === 'TRAVELER',
    session.authKey
  );

  const handleSelectMode = (mode: ExplorationMode): void => {
    const access = canAccessMode(mode, localModeEnabled);
    if (!access.allowed) {
      setModeFeedback(access.reason ?? 'Modalidad próximamente disponible.');
      return;
    }
    setModeFeedback(null);
    setSelectedMode(mode);
  };

  const mapCenter: Coordinates | null = useMemo(
    () => cities.find((c) => c.slug === filterValues.citySlug)?.center ?? null,
    [cities, filterValues.citySlug]
  );

  const focusPlace = useCallback((slug: string): void => {
    setHighlightSlug(slug);
    document.getElementById(`place-${slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  if (selectedMode === null) {
    return <ModeSelection modes={modes} feedback={modeFeedback} onSelect={handleSelectMode} />;
  }

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const personalizationOn = session.user?.preferences.personalizationEnabled ?? false;

  return (
    <div style={{ minHeight: '100vh', padding: '1.25rem 1.5rem 4rem' }}>
      <header
        style={{
          maxWidth: 1280,
          margin: '0 auto 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Exploro US</h1>
            <span className="badge" style={{ background: 'rgba(56,189,248,.16)', color: '#38bdf8' }}>
              Estoy de viaje
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>
            Explora sin cuenta. Si falta un dato, lo indicamos en lugar de inventarlo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {session.user ? (
            <>
              <button type="button" className="btn" onClick={() => setShowLibrary((v) => !v)}>
                Mis listas ({library.favorites.length})
              </button>
              <span style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>{session.user.displayName}</span>
              <button type="button" className="btn" onClick={() => void session.logout()}>Salir</button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setShowAuth(true)}>
              Iniciar sesión
            </button>
          )}
          <button type="button" className="btn" onClick={() => setSelectedMode(null)}>
            Cambiar modalidad
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        {session.notice && (
          <div role="status" className="alert alert-warn">
            {session.notice}{' '}
            <button type="button" className="btn" onClick={session.clearNotice}>Entendido</button>
          </div>
        )}
        {bootError && <div role="alert" className="alert alert-error">{bootError}</div>}
        {showAuth && !session.user && (
          <AuthPanel onLogin={session.login} onRegister={session.register} onClose={() => setShowAuth(false)} />
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

        <section aria-label="Categorías">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '.7rem' }}>Categorías</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.7rem' }}>
            {categories.map((cat) => {
              const selected = categorySlug === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className="card"
                  aria-pressed={selected}
                  onClick={() => { setCategorySlug(selected ? '' : cat.slug); setSubcategorySlug(''); }}
                  style={{
                    padding: '.9rem',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    borderColor: selected ? '#38bdf8' : undefined,
                    background: selected ? 'rgba(56,189,248,.16)' : undefined,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{cat.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '.78rem' }}>{cat.description}</div>
                </button>
              );
            })}
          </div>
          {activeCategory && activeCategory.subcategories.length > 0 && (
            <div style={{ marginTop: '.8rem', display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              {activeCategory.subcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  className={`chip ${subcategorySlug === sub.slug ? 'chip-active' : ''}`}
                  aria-pressed={subcategorySlug === sub.slug}
                  onClick={() => setSubcategorySlug(subcategorySlug === sub.slug ? '' : sub.slug)}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <FiltersBar
          values={filterValues}
          cities={cities}
          isLoggedIn={Boolean(session.user)}
          personalizationEnabled={personalizationOn}
          onChange={patchFilters}
          onTogglePersonalization={(enabled) => void session.setPersonalization(enabled)}
        />

        <SurpriseMe
          client={session.client}
          coords={filterValues.coords}
          citySlug={filterValues.citySlug}
          radiusKm={filterValues.unbounded ? 500 : milesToKm(filterValues.radiusMiles)}
          applyPreferences
        />

        <section aria-label="Resultados" aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.8rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {discovery.loading ? 'Buscando…' : `${discovery.total} lugar(es)`}
            </h2>
            {discovery.personalizationApplied && (
              <span className="badge" style={{ background: 'rgba(16,185,129,.15)', color: '#34d399' }}>
                Personalizado según tus preferencias
              </span>
            )}
          </div>

          {discovery.error && (
            <div role="alert" className="alert alert-error" style={{ marginBottom: '.8rem' }}>
              {discovery.error}{' '}
              <button type="button" className="btn" onClick={discovery.reload}>Reintentar</button>
            </div>
          )}

          <div className="layout-split with-map">
            <div>
              {!discovery.loading && !discovery.error && discovery.places.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>
                  No hay lugares para estos filtros. Prueba ampliando el radio, quitando filtros o eligiendo otra ciudad.
                </p>
              ) : (
                <div className="places-grid">
                  {discovery.places.map((place) => (
                    <div key={place.id} id={`place-${place.slug}`}>
                      <PlaceCard
                        place={place}
                        client={session.client}
                        isFavorite={library.favoriteIds.has(place.id)}
                        isLoggedIn={Boolean(session.user)}
                        collections={library.collections}
                        highlight={highlightSlug === place.slug}
                        onToggleFavorite={(p) => void library.toggleFavorite(p)}
                        onAddToCollection={(cid, p) => void library.addToCollection(cid, p)}
                        onRequireLogin={() => setShowAuth(true)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <MapView
              places={discovery.places}
              userLocation={filterValues.coords}
              fallbackCenter={mapCenter}
              onSelectPlace={focusPlace}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

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
  RouteSummary,
} from '@exploro/shared-types';
import { AuthPanel } from '../components/AuthPanel';
import { FilterValues, FiltersBar } from '../components/FiltersBar';
import { LibraryPanel } from '../components/LibraryPanel';
import { ModeSelection } from '../components/ModeSelection';
import { PlaceCard } from '../components/PlaceCard';
import { SurpriseMe } from '../components/SurpriseMe';
import { TripPlannerPanel } from '../components/TripPlannerPanel';
import { AdminControlPanel } from '../components/AdminControlPanel';
import { useDiscovery } from '../hooks/useDiscovery';
import { useLibrary } from '../hooks/useLibrary';
import { useSession } from '../hooks/useSession';
import { DEFAULT_RADIUS_KM } from '../lib/format';

// MapLibre requiere WebGL/DOM: se carga solo en el navegador.
const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
  loading: () => <div className="map-box" aria-busy="true" />,
});

/** Coordenadas por defecto en Honduras: Colonia Florencia Norte, Tegucigalpa. */
const DEFAULT_HONDURAS_COORDS: Coordinates = { lat: 14.0885, lng: -87.1815 };

const QUICK_CRAVING_PICKS = [
  {
    craving: '🏆 Mejor experiencia general',
    placeLabel: 'El Morito',
    slug: 'el-morito-la-hacienda-tegucigalpa',
  },
  {
    craving: '🍕 Pizza y pasta',
    placeLabel: 'Portobello',
    slug: 'restaurante-portobello-tegucigalpa',
  },
  {
    craving: '💰 Relación cantidad-precio',
    placeLabel: 'La Pana',
    slug: 'la-pana-tegucigalpa',
  },
  {
    craving: '🍔 Hamburguesas',
    placeLabel: 'Matambritas',
    slug: 'matambritas-gourmet-center-tegucigalpa',
  },
  {
    craving: '🍗 Alitas (Reddit)',
    placeLabel: 'Tatos Wings',
    slug: 'tatos-wings-tegucigalpa',
  },
  {
    craving: '🌮 Algo económico',
    placeLabel: 'Tacos Tado',
    slug: 'tacos-tado-tegucigalpa',
  },
  {
    craving: '🍣 Sushi y japonés',
    placeLabel: 'Usami',
    slug: 'usami-sushi-tegucigalpa',
  },
  {
    craving: '☕ Desayuno o brunch',
    placeLabel: 'Alto Grano',
    slug: 'alto-grano-cafe-tegucigalpa',
  },
] as const;

const CATEGORY_VISUALS: Record<
  string,
  { emoji: string; accent: string; bg: string; shortDesc: string }
> = {
  comida: {
    emoji: '🍕',
    accent: '#FF385C',
    bg: '#fff1f2',
    shortDesc: 'Mariscos, pizzerías, hamburguesas, sushi, cafés y alitas (Top verificados)',
  },
  turismo: {
    emoji: '🧭',
    accent: '#1CB0F6',
    bg: '#f0f9ff',
    shortDesc: 'Miradores, naturaleza, museos y sitios mayas',
  },
  entretenimiento: {
    emoji: '🎭',
    accent: '#9333ea',
    bg: '#faf5ff',
    shortDesc: 'Teatro, cines VIP, música en vivo y vida nocturna',
  },
  actividades: {
    emoji: '🛶',
    accent: '#58CC02',
    bg: '#f0fdf4',
    shortDesc: 'Senderismo en pinares, caminatas ecológicas y aire libre',
  },
  eventos: {
    emoji: '🎪',
    accent: '#FF9600',
    bg: '#fff7ed',
    shortDesc: 'Ferias gastronómicas, conciertos y agenda cultural',
  },
  compras: {
    emoji: '🛍️',
    accent: '#e11d48',
    bg: '#fff1f2',
    shortDesc: 'Centros comerciales, artesanías lencas y café de especialidad',
  },
};

const SUBCATEGORY_EMOJIS: Record<string, string> = {
  miradores: '🌄',
  monumentos: '🏛️',
  naturaleza: '🌲',
  museos: '🖼️',
  cultura: '🎨',
  'pueblos-y-ciudades': '🏘️',
  'lugares-emblematicos': '📍',
};

type WizardStep = 'CATEGORY' | 'SUBCATEGORY' | 'MAP';

const INITIAL_FILTERS: FilterValues = {
  citySlug: '',
  searchQuery: '',
  sortBy: 'recommended',
  radiusKm: DEFAULT_RADIUS_KM, // 5 km a la redonda por defecto
  unbounded: false,
  coords: DEFAULT_HONDURAS_COORDS,
};

export default function ExploroHomePage(): React.JSX.Element {
  const session = useSession();
  const library = useLibrary(session.client, session.user?.id ?? null, session.guard);

  const [selectedMode, setSelectedMode] = useState<ExplorationMode | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>('CATEGORY');
  const [modes, setModes] = useState<ModeDescriptor[]>(() => getInitialModeDescriptors(false));
  const [localModeEnabled, setLocalModeEnabled] = useState(false);
  const [modeFeedback, setModeFeedback] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [cities, setCities] = useState<CityDTO[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>('Col. Florencia Norte, Tegucigalpa (5 km)');

  const [filterValues, setFilterValues] = useState<FilterValues>(INITIAL_FILTERS);
  const [categorySlug, setCategorySlug] = useState('');
  const [subcategorySlug, setSubcategorySlug] = useState('');

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);

  const [activeRoute, setActiveRoute] = useState<RouteSummary | null>(null);
  const [routeTargetName, setRouteTargetName] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Configuración de modalidades y feature flags desde la API
  useEffect(() => {
    session.client
      .getBootstrapConfig()
      .then((cfg) => {
        setModes(cfg.modes);
        setLocalModeEnabled(cfg.featureFlags.localModeEnabled);
      })
      .catch(() => {
        /* Se conserva la configuración por defecto */
      });
  }, [session.client]);

  // Carga de categorías y ciudades (Honduras + EE. UU.) y detección automática de ubicación GPS
  const loadCatalogAndGps = useCallback(() => {
    setBootError(null);
    Promise.all([session.client.getCategories(), session.client.getCities('ALL')])
      .then(([cats, cityList]) => {
        setCategories(cats);
        setCities(cityList);
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
            radiusKm: DEFAULT_RADIUS_KM,
            unbounded: false,
            sortBy: 'recommended',
          }));
          setGpsStatus('Ubicación GPS activa (5 km)');
        },
        () => {
          setGpsStatus('Col. Florencia Norte, Tegucigalpa (5 km)');
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      setGpsStatus('Col. Florencia Norte, Tegucigalpa (5 km)');
    }
  }, [session.client]);

  useEffect(() => {
    if (selectedMode !== 'TRAVELER') return;
    loadCatalogAndGps();
  }, [selectedMode, loadCatalogAndGps]);

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
      radiusKm: filterValues.radiusKm,
      unbounded: filterValues.unbounded,
      coords: filterValues.coords,
      applyPreferences: true,
    }),
    [filterValues, categorySlug, subcategorySlug]
  );

  // Solo consulta lugares cuando el usuario ya eligió categoría y llegó al paso del Mapa
  const discovery = useDiscovery(
    session.client,
    discoveryFilters,
    selectedMode === 'TRAVELER' && wizardStep === 'MAP',
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
    setWizardStep('CATEGORY');
  };

  const handleSelectCategoryCard = (cat: CategoryDTO): void => {
    setCategorySlug(cat.slug);
    setSubcategorySlug('');
    // Garantizar que al entrar al mapa siempre inicie con Recomendados y radio de 5 km a la redonda
    setFilterValues((prev) => ({
      ...prev,
      sortBy: 'recommended',
      radiusKm: DEFAULT_RADIUS_KM,
      unbounded: false,
      searchQuery: '',
    }));
    setShowFiltersPanel(false);

    if (cat.subcategories && cat.subcategories.length > 0) {
      setWizardStep('SUBCATEGORY');
    } else {
      setWizardStep('MAP');
    }
  };

  const handleSelectSubcategoryCard = (subSlug: string): void => {
    setSubcategorySlug(subSlug);
    setWizardStep('MAP');
  };

  const mapCenter: Coordinates | null = useMemo(
    () =>
      filterValues.coords ??
      cities.find((c) => c.slug === filterValues.citySlug)?.center ??
      DEFAULT_HONDURAS_COORDS,
    [cities, filterValues.citySlug, filterValues.coords]
  );

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
        mapCenter ??
        (discovery.places[0] ? discovery.places[0].coordinates : DEFAULT_HONDURAS_COORDS);

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
            err instanceof Error ? err.message : 'No se pudo calcular la ruta.'
          );
        });
    },
    [filterValues.coords, mapCenter, discovery.places, session.client]
  );

  // PASO 1: Selección de modalidad
  if (selectedMode === null) {
    return <ModeSelection modes={modes} feedback={modeFeedback} onSelect={handleSelectMode} />;
  }

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const activeSubcategory = activeCategory?.subcategories.find(
    (s) => s.slug === subcategorySlug
  );
  const personalizationOn = session.user?.preferences.personalizationEnabled ?? false;
  const activeVisual = CATEGORY_VISUALS[categorySlug] ?? {
    emoji: '✨',
    accent: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    shortDesc: '',
  };

  const isNearTegucigalpa =
    filterValues.citySlug === 'tegucigalpa' ||
    (filterValues.coords !== null &&
      Math.abs(filterValues.coords.lat - DEFAULT_HONDURAS_COORDS.lat) < 0.08 &&
      Math.abs(filterValues.coords.lng - DEFAULT_HONDURAS_COORDS.lng) < 0.08);

  return (
    <div style={{ minHeight: '100dvh', padding: '0.9rem 1.15rem 2.5rem' }}>
      {/* Barra superior compacta */}
      <header
        style={{
          maxWidth: 1240,
          margin: '0 auto 0.9rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.65rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#222222' }}>
            Exploro<span style={{ color: '#FF385C' }}>.</span>
          </span>
          <span
            className="badge"
            style={{ background: '#fff1f2', color: '#FF385C', border: '1px solid #ffe4e6' }}
          >
            ✈️ Viajero
          </span>
          <span
            className="badge"
            style={{ background: '#ecfdf5', color: '#15803d', border: '1px solid #bbf7d0' }}
          >
            📍 {gpsStatus}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {session.user ? (
            <>
              <button
                type="button"
                className="btn"
                onClick={() => setShowLibrary((v) => !v)}
              >
                ❤️ Mis listas ({library.favorites.length})
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void session.logout()}
              >
                Salir ({session.user.displayName})
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAuth(true)}
            >
              Iniciar sesión
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => setShowTripPlanner(true)}
            style={{ borderColor: 'rgba(56,189,248,0.45)', color: '#38bdf8' }}
          >
            🗺️ Itinerarios
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setShowAdmin(true)}
            style={{ borderColor: 'rgba(244,63,94,0.45)', color: '#fb7185' }}
          >
            🛡️ Admin
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSelectedMode(null);
              setWizardStep('CATEGORY');
            }}
          >
            Modalidad
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: '1rem' }}>
        {session.notice && (
          <div role="status" className="alert alert-warn">
            {session.notice}{' '}
            <button type="button" className="btn" onClick={session.clearNotice}>
              Entendido
            </button>
          </div>
        )}

        {bootError && (
          <div
            role="alert"
            className="alert alert-error"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}
          >
            <span>{bootError}</span>
            <button type="button" className="btn" onClick={loadCatalogAndGps}>
              Reintentar
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

        {showTripPlanner && (
          <TripPlannerPanel
            client={session.client}
            isLoggedIn={Boolean(session.user)}
            onClose={() => setShowTripPlanner(false)}
            onRequireAuth={() => {
              setShowTripPlanner(false);
              setShowAuth(true);
            }}
          />
        )}

        {showAdmin && (
          <AdminControlPanel
            client={session.client}
            isLoggedIn={Boolean(session.user)}
            userRole={session.user?.role}
            onClose={() => setShowAdmin(false)}
            onRequireAuth={() => {
              setShowAdmin(false);
              setShowAuth(true);
            }}
          />
        )}

        {/* ===================================================================
            PASO 2A: SELECCIÓN DE CATEGORÍA EN CARDS (SIN SCROLL NI FILTROS)
           =================================================================== */}
        {wizardStep === 'CATEGORY' && (
          <section
            aria-label="Selecciona una categoría"
            style={{
              maxWidth: 880,
              margin: '0.5rem auto 0',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.5rem',
                  marginBottom: '.55rem',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <span className="step-pill-bar">Paso 2 de 3 • Elige una categoría</span>
                <span
                  className="badge"
                  style={{
                    background: 'rgba(56, 189, 248, 0.14)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  ⭐ Recomendados por defecto • Radio 5 km a la redonda
                </span>
              </div>
              <h2 style={{ fontSize: 'clamp(1.45rem, 3.5vw, 2rem)', fontWeight: 800 }}>
                ¿Qué te apetece descubrir cerca de ti?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', marginTop: '.25rem' }}>
                Toca una tarjeta para ver en el mapa los mejores lugares verificados dentro de 5 km a la redonda.
              </p>
            </div>

            <div className="category-step-grid">
              {categories.map((cat) => {
                const vis = CATEGORY_VISUALS[cat.slug] ?? {
                  emoji: '✨',
                  accent: '#38bdf8',
                  bg: 'rgba(56, 189, 248, 0.16)',
                  shortDesc: cat.description,
                };
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className="category-card-btn"
                    onClick={() => handleSelectCategoryCard(cat)}
                  >
                    <div style={{ width: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          className="category-card-icon"
                          style={{
                            background: vis.bg,
                            borderColor: vis.accent,
                          }}
                        >
                          {vis.emoji}
                        </span>
                        <span
                          style={{
                            fontSize: '.74rem',
                            color: vis.accent,
                            fontWeight: 700,
                          }}
                        >
                          Explorar →
                        </span>
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '.25rem' }}>
                        {cat.name}
                      </div>
                      <div
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '.8rem',
                          lineHeight: 1.35,
                        }}
                      >
                        {vis.shortDesc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ===================================================================
            PASO 2B: SUBCATEGORÍAS EN CARDS (SOLO CUANDO LA CATEGORÍA TIENE SUBS)
           =================================================================== */}
        {wizardStep === 'SUBCATEGORY' && activeCategory && (
          <section
            aria-label="Selecciona el tipo de experiencia"
            style={{
              maxWidth: 880,
              margin: '0.5rem auto 0',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '.5rem',
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setWizardStep('CATEGORY')}
              >
                ← Volver a categorías
              </button>
              <span className="step-pill-bar">
                Paso 2 de 3 • {activeVisual.emoji} {activeCategory.name}
              </span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.15rem' }}>
              <h2 style={{ fontSize: 'clamp(1.35rem, 3vw, 1.85rem)', fontWeight: 800 }}>
                ¿Qué tipo de {activeCategory.name.toLowerCase()} buscas hoy?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem', marginTop: '.2rem' }}>
                Te mostraremos los recomendados en el mapa dentro de un radio de 5 km a la redonda.
              </p>
            </div>

            <div className="category-step-grid">
              <button
                type="button"
                className="category-card-btn"
                onClick={() => handleSelectSubcategoryCard('')}
                style={{
                  borderColor: '#FF385C',
                  background: '#fff1f2',
                }}
              >
                <div>
                  <span className="category-card-icon">✨</span>
                  <div style={{ fontSize: '1.08rem', fontWeight: 800 }}>
                    Ver todo {activeCategory.name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '.78rem' }}>
                    Todos los lugares recomendados a menos de 5 km
                  </div>
                </div>
              </button>

              {activeCategory.subcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  className="category-card-btn"
                  onClick={() => handleSelectSubcategoryCard(sub.slug)}
                >
                  <div>
                    <span className="category-card-icon">
                      {SUBCATEGORY_EMOJIS[sub.slug] ?? '📍'}
                    </span>
                    <div style={{ fontSize: '1.08rem', fontWeight: 800 }}>
                      {sub.name}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '.78rem' }}>
                      Ver en el mapa (hasta 5 km) →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===================================================================
            PASO 3: VISTA DE MAPA Y RECOMENDADOS (RADIO 5 KM POR DEFECTO)
            Aquí y solo aquí se habilita aplicar otros filtros o «Sorpréndeme»
           =================================================================== */}
        {wizardStep === 'MAP' && (
          <section aria-label="Mapa y lugares recomendados" style={{ display: 'grid', gap: '.9rem' }}>
            {/* Barra de control del Paso 3 */}
            <div
              className="card"
              style={{
                padding: '.75rem 1rem',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '.65rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setWizardStep('CATEGORY');
                    setShowFiltersPanel(false);
                  }}
                >
                  ← Categorías
                </button>

                <span
                  className="chip chip-active"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}
                >
                  <span>{activeVisual.emoji}</span>
                  <span>{activeCategory?.name ?? 'Categoría'}</span>
                  {activeSubcategory ? <span>• {activeSubcategory.name}</span> : null}
                </span>

                <span className="chip">
                  {filterValues.unbounded
                    ? '🌎 Sin límite de radio'
                    : `📍 Radio ${filterValues.radiusKm} km a la redonda`}
                </span>

                <span className="chip">
                  {filterValues.sortBy === 'recommended'
                    ? '⭐ Recomendados'
                    : filterValues.sortBy === 'distance'
                      ? '📏 Más cercanos'
                      : '🔤 Nombre A–Z'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${showFiltersPanel ? 'btn-primary' : ''}`}
                  onClick={() => setShowFiltersPanel((v) => !v)}
                >
                  🎛️ {showFiltersPanel ? 'Ocultar filtros' : 'Aplicar filtros'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowSurpriseModal((v) => !v)}
                  style={{ borderColor: 'rgba(16, 185, 129, 0.45)', color: '#34d399' }}
                >
                  🎲 Sorpréndeme
                </button>
              </div>
            </div>

            {/* Accesos rápidos de ubicación en el mapa (Honduras y EE. UU.) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '.45rem',
                overflowX: 'auto',
                paddingBottom: '.2rem',
              }}
            >
              <span style={{ fontSize: '.76rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Punto de referencia (5 km):
              </span>
              {[
                { label: '🇭🇳 Col. Florencia Norte (Tegucigalpa)', slug: 'tegucigalpa', coords: { lat: 14.0885, lng: -87.1815 } },
                { label: '🇭🇳 San Pedro Sula', slug: 'san-pedro-sula', coords: { lat: 15.5042, lng: -88.025 } },
                { label: '🇭🇳 Roatán', slug: 'roatan', coords: { lat: 16.2753, lng: -86.5986 } },
                { label: '🇭🇳 Copán Ruinas', slug: 'copan-ruinas', coords: { lat: 14.84, lng: -89.1419 } },
                { label: '🇺🇸 New York', slug: 'new-york', coords: { lat: 40.7128, lng: -74.006 } },
                { label: '🇺🇸 Miami', slug: 'miami', coords: { lat: 25.7617, lng: -80.1918 } },
                { label: '🇺🇸 Austin', slug: 'austin', coords: { lat: 30.2672, lng: -97.7431 } },
              ].map((hub) => {
                const isCurrent =
                  filterValues.citySlug === hub.slug ||
                  (!filterValues.citySlug &&
                    filterValues.coords &&
                    Math.abs(filterValues.coords.lat - hub.coords.lat) < 0.04);
                return (
                  <button
                    key={hub.slug}
                    type="button"
                    className={`chip ${isCurrent ? 'chip-active' : ''}`}
                    style={{ whiteSpace: 'nowrap', fontSize: '.76rem', padding: '.28rem .7rem' }}
                    onClick={() => {
                      setFilterValues((prev) => ({
                        ...prev,
                        citySlug: '',
                        coords: hub.coords,
                        radiusKm: DEFAULT_RADIUS_KM,
                        unbounded: false,
                      }));
                      setGpsStatus(`${hub.label} (5 km)`);
                    }}
                  >
                    {hub.label}
                  </button>
                );
              })}
            </div>

            {/* Selección rápida según lo que tengas ganas de comer (Tegucigalpa - Florencia Norte) */}
            {categorySlug === 'comida' && isNearTegucigalpa && (
              <div
                className="card"
                style={{
                  padding: '1rem 1.15rem',
                  background: '#ffffff',
                  borderColor: '#ebebeb',
                  display: 'grid',
                  gap: '.65rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.4rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '.94rem', color: '#222222' }}>
                    🎯 Selección rápida según lo que tengas ganas de comer (Radio 5 km · Col. Florencia Norte)
                  </div>
                  <span style={{ fontSize: '.76rem', color: '#717171', fontWeight: 600 }}>
                    Puntaje combinado: Google Maps (45%) + Reddit r/Honduras (30%) + Redes Sociales y Qué Plan Tegus (25%)
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                    gap: '.5rem',
                  }}
                >
                  {QUICK_CRAVING_PICKS.map((pick) => {
                    const active = highlightSlug === pick.slug;
                    return (
                      <button
                        key={pick.slug}
                        type="button"
                        onClick={() => focusPlace(pick.slug)}
                        style={{
                          textAlign: 'left',
                          padding: '.55rem .75rem',
                          borderRadius: 12,
                          background: active ? '#fff1f2' : '#f7f7f9',
                          border: active
                            ? '2px solid #FF385C'
                            : '1.5px solid #e5e5e5',
                          borderBottomWidth: 3,
                          color: '#222222',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: '.72rem', color: '#717171', fontWeight: 600 }}>
                          {pick.craving}
                        </div>
                        <div style={{ fontSize: '.86rem', fontWeight: 800, color: '#FF385C' }}>
                          → {pick.placeLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Panel de filtros (solo visible cuando el usuario lo abre en el Paso 3) */}
            {showFiltersPanel && (
              <FiltersBar
                values={filterValues}
                cities={cities}
                isLoggedIn={Boolean(session.user)}
                personalizationEnabled={personalizationOn}
                client={session.client}
                onChange={patchFilters}
                onTogglePersonalization={(enabled) => void session.setPersonalization(enabled)}
                onClose={() => setShowFiltersPanel(false)}
              />
            )}

            {/* Panel Sorpréndeme bajo demanda */}
            {showSurpriseModal && (
              <SurpriseMe
                client={session.client}
                coords={filterValues.coords}
                citySlug={filterValues.citySlug}
                radiusKm={filterValues.unbounded ? 500 : filterValues.radiusKm}
                applyPreferences
              />
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
                  <strong>🚗 Ruta a {routeTargetName}: </strong>
                  <span>
                    {(activeRoute.distanceMeters / 1000).toFixed(1)} km • ~
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
                  Cerrar ruta
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
                  Reintentar
                </button>
              </div>
            )}

            {/* Mapa primero + Tarjetas de resultados */}
            <div className="layout-split with-map">
              <MapView
                places={discovery.places}
                userLocation={filterValues.coords}
                fallbackCenter={mapCenter}
                activeRoute={activeRoute}
                onSelectPlace={focusPlace}
              />

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '.75rem',
                    flexWrap: 'wrap',
                    gap: '.5rem',
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                      {discovery.loading
                        ? 'Buscando en el mapa…'
                        : `${discovery.total} lugar(es) recomendado(s) en ${filterValues.unbounded ? 'todo el catálogo' : `${filterValues.radiusKm} km a la redonda`}`}
                    </h2>
                    <div style={{ fontSize: '.76rem', color: 'var(--text-secondary)' }}>
                      Ordenados por cercanía, reputación, sabor y recomendaciones reales • Usa 🚗 Waze o 🗺️ Google Maps para ir directo.
                    </div>
                  </div>
                  {discovery.personalizationApplied && (
                    <span
                      className="badge"
                      style={{ background: 'rgba(16,185,129,.15)', color: '#34d399' }}
                    >
                      Personalizado con tus gustos
                    </span>
                  )}
                </div>

                {!discovery.loading && !discovery.error && discovery.places.length === 0 ? (
                  <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '.85rem' }}>
                      No encontramos lugares de esta categoría a menos de {filterValues.radiusKm} km de este punto.
                    </p>
                    <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          patchFilters({
                            coords: DEFAULT_HONDURAS_COORDS,
                            citySlug: '',
                            radiusKm: DEFAULT_RADIUS_KM,
                            unbounded: false,
                          })
                        }
                      >
                        🇭🇳 Ver cerca de Col. Florencia Norte (5 km)
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => patchFilters({ unbounded: true })}
                      >
                        🌎 Ver sin límite de distancia
                      </button>
                    </div>
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
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

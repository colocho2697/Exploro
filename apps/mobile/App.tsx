import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { ExploroApiClient } from '@exploro/api-client';
import {
  CategoryDTO,
  CollectionDTO,
  Coordinates,
  FavoriteItemDTO,
  PlaceCardDTO,
  PlaceSortBy,
  RouteSummary,
  UserProfile,
} from '@exploro/shared-types';
import { AuthPanel } from './src/components/AuthPanel';
import { BackpackerLoader } from './src/components/BackpackerLoader';
import { LibraryPanel } from './src/components/LibraryPanel';
import { MapView } from './src/components/MapView';
import { PlaceCard } from './src/components/PlaceCard';
import { DEFAULT_RADIUS_KM } from './src/format';
import {
  LanguageProvider,
  SupportedLocale,
  useLanguage,
} from './src/i18n';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.61.21:4000/api/v1';

/** Coordenadas iniciales de respaldo antes de que responda el GPS del dispositivo */
const DEFAULT_COORDS: Coordinates = { lat: 14.0885, lng: -87.1815 };

const CATEGORY_ICONS: Record<string, string> = {
  comida: '🍕',
  turismo: '🧭',
  entretenimiento: '🎭',
  actividades: '🛶',
  eventos: '🎪',
  compras: '🛍️',
};

const SUBCATEGORY_ICONS: Record<string, string> = {
  miradores: '🌄',
  monumentos: '🏛️',
  naturaleza: '🌲',
  museos: '🖼️',
  cultura: '🎨',
  'pueblos-y-ciudades': '🏘️',
  'lugares-emblematicos': '📍',
  restaurantes: '🍽️',
  cafeterias: '☕',
  'comida-callejera': '🌮',
  'bares-y-cocteles': '🍸',
  postres: '🍰',
  'teatro-y-shows': '🎭',
  cines: '🎬',
  'musica-en-vivo': '🎸',
  'vida-nocturna': '🌙',
  senderismo: '🥾',
  'deportes-acuaticos': '🏄',
  parques: '🌳',
  ferias: '🎪',
  conciertos: '🎟️',
  'centros-comerciales': '🏬',
  artesanias: '🏺',
  mercados: '🧺',
};

interface FilterValues {
  citySlug: string;
  searchQuery: string;
  sortBy: PlaceSortBy;
  radiusKm: number;
  unbounded: boolean;
  coords: Coordinates | null;
}

const INITIAL_FILTERS: FilterValues = {
  citySlug: '',
  searchQuery: '',
  sortBy: 'recommended',
  radiusKm: DEFAULT_RADIUS_KM,
  unbounded: false,
  coords: DEFAULT_COORDS,
};

function ExploroMobileHome(): React.JSX.Element {
  const { locale, setLocale, localeMeta, t, supportedLocales } = useLanguage();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const client = useMemo(
    () =>
      new ExploroApiClient({
        baseUrl: API_URL,
        getAccessToken: () => token,
      }),
    [token]
  );

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);

  const [filterValues, setFilterValues] = useState<FilterValues>(INITIAL_FILTERS);
  const [categorySlug, setCategorySlug] = useState<string>('comida');
  const [subcategorySlug, setSubcategorySlug] = useState<string>('');

  const [places, setPlaces] = useState<PlaceCardDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [showAuth, setShowAuth] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<FavoriteItemDTO[]>([]);
  const [collections, setCollections] = useState<CollectionDTO[]>([]);
  const [activeCollection, setActiveCollection] = useState<CollectionDTO | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [activeRoute, setActiveRoute] = useState<RouteSummary | null>(null);
  const [routeTargetName, setRouteTargetName] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.placeId)),
    [favorites]
  );

  const requestDeviceGps = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setFilterValues((prev) => ({
        ...prev,
        coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        citySlug: '',
        unbounded: false,
      }));
    } catch {
      /* Conserva coordenadas actuales si el usuario deniega o falla el GPS */
    }
  }, []);

  const loadCatalogAndGps = useCallback(() => {
    setBootError(null);
    client
      .getCategories()
      .then((cats) => {
        setCategories(cats);
      })
      .catch((e: unknown) =>
        setBootError(
          `${t.discovery.connectionError}${e instanceof Error ? `: ${e.message}` : ''}`
        )
      );

    void requestDeviceGps();
  }, [client, requestDeviceGps, t.discovery.connectionError]);

  useEffect(() => {
    loadCatalogAndGps();
  }, [loadCatalogAndGps]);

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    setDiscoveryError(null);
    try {
      const res = await client.discoverPlaces({
        citySlug: filterValues.citySlug || undefined,
        categorySlug: categorySlug || undefined,
        subcategorySlug: subcategorySlug || undefined,
        searchQuery: filterValues.searchQuery || undefined,
        sortBy: filterValues.sortBy,
        lat: filterValues.coords?.lat,
        lng: filterValues.coords?.lng,
        radiusKm: filterValues.unbounded ? undefined : filterValues.radiusKm,
        applyPreferences: Boolean(user),
        page: 1,
        limit: 20,
      });
      setPlaces(res.data ?? []);
    } catch (e: unknown) {
      setDiscoveryError(
        e instanceof Error ? e.message : t.discovery.connectionError
      );
    } finally {
      setLoading(false);
    }
  }, [
    client,
    filterValues.citySlug,
    filterValues.searchQuery,
    filterValues.sortBy,
    filterValues.coords,
    filterValues.unbounded,
    filterValues.radiusKm,
    categorySlug,
    subcategorySlug,
    user,
    t.discovery.connectionError,
  ]);

  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  const refreshLibrary = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setCollections([]);
      setActiveCollection(null);
      return;
    }
    try {
      const [favs, cols] = await Promise.all([
        client.listFavorites(),
        client.listCollections(),
      ]);
      setFavorites(favs);
      setCollections(cols);
    } catch (e: unknown) {
      setLibraryError(e instanceof Error ? e.message : 'Error');
    }
  }, [client, user]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  const handleLogin = async (email: string, password: string): Promise<void> => {
    const session = await client.login({ email, password });
    setToken(session.tokens.accessToken);
    setUser(session.user);
  };

  const handleRegister = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<void> => {
    const session = await client.register({ email, password, displayName });
    setToken(session.tokens.accessToken);
    setUser(session.user);
  };

  const handleLogout = (): void => {
    setToken(null);
    setUser(null);
    setShowLibrary(false);
  };

  const handleToggleFavorite = async (place: PlaceCardDTO): Promise<void> => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    try {
      if (favoriteIds.has(place.id)) {
        await client.removeFavorite(place.id);
      } else {
        await client.addFavorite(place.id);
      }
      await refreshLibrary();
    } catch (e: unknown) {
      setLibraryError(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleCreateCollection = async (name: string): Promise<void> => {
    await client.createCollection({ name, isPublic: false });
    await refreshLibrary();
  };

  const handleOpenCollection = async (id: string | null): Promise<void> => {
    if (!id) {
      setActiveCollection(null);
      return;
    }
    const detail = await client.getCollection(id);
    setActiveCollection(detail);
  };

  const handleDeleteCollection = async (id: string): Promise<void> => {
    await client.deleteCollection(id);
    if (activeCollection?.id === id) setActiveCollection(null);
    await refreshLibrary();
  };

  const handleRemoveFromCollection = async (
    collectionId: string,
    placeId: string
  ): Promise<void> => {
    await client.removeCollectionItem(collectionId, placeId);
    if (activeCollection?.id === collectionId) {
      const updated = await client.getCollection(collectionId);
      setActiveCollection(updated);
    }
    await refreshLibrary();
  };

  const handleAddToCollection = async (
    collectionId: string,
    place: PlaceCardDTO
  ): Promise<void> => {
    await client.addCollectionItem(collectionId, place.id);
    await refreshLibrary();
  };

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
  }, []);

  const handleCalculateRoute = useCallback(
    (destination: Coordinates, name: string): void => {
      setRouteError(null);
      const origin =
        filterValues.coords ??
        (places[0] ? places[0].coordinates : DEFAULT_COORDS);

      client
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
    [filterValues.coords, places, client, t.map.routeError]
  );

  const activeCategory = categories.find((c) => c.slug === categorySlug);

  const categoryList =
    categories.length > 0
      ? categories
      : [
          { id: '1', slug: 'comida', name: 'Comida', subcategories: [] },
          { id: '2', slug: 'turismo', name: 'Turismo', subcategories: [] },
          { id: '3', slug: 'entretenimiento', name: 'Entretenimiento', subcategories: [] },
          { id: '4', slug: 'actividades', name: 'Actividades', subcategories: [] },
          { id: '5', slug: 'eventos', name: 'Eventos', subcategories: [] },
          { id: '6', slug: 'compras', name: 'Compras', subcategories: [] },
        ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER MINIMALISTA ESTILO AIRBNB */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {/* Marca limpia */}
          <Text style={styles.brandTitle}>
            Exploro<Text style={styles.brandDot}>.</Text>
          </Text>

          {/* Selector discreto de idioma + Acción única de usuario */}
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setShowLanguageModal(true)}
              accessibilityLabel={t.header.languageSelectorAria}
              style={styles.langPill}
            >
              <Text style={styles.langPillText}>
                🌐 {localeMeta.flag} {localeMeta.shortLabel} ▾
              </Text>
            </Pressable>

            {user ? (
              <>
                <Pressable
                  onPress={() => setShowLibrary((v) => !v)}
                  style={styles.savedPill}
                >
                  <Text style={styles.savedPillText}>
                    {t.header.saved(favorites.length)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleLogout()}
                  style={styles.logoutPill}
                >
                  <Text style={styles.logoutPillText}>
                    {user.displayName} · {t.header.logout}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => setShowAuth((v) => !v)}
                style={styles.signInPill}
              >
                <Text style={styles.signInPillText}>{t.header.signIn}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* BARRA HORIZONTAL DE CATEGORÍAS ESTILO AIRBNB */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesNav}
        >
          {categoryList.map((cat) => {
            const isSelected = categorySlug === cat.slug;
            const icon = CATEGORY_ICONS[cat.slug] ?? '✨';
            const displayCatName = t.categories[cat.slug] ?? cat.name;
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleSelectCategory(cat.slug)}
                style={[
                  styles.categoryTabBtn,
                  isSelected
                    ? styles.categoryTabBtnActive
                    : styles.categoryTabBtnInactive,
                ]}
              >
                <Text style={styles.categoryTabIcon}>{icon}</Text>
                <Text
                  style={[
                    styles.categoryTabLabel,
                    isSelected
                      ? styles.categoryTabLabelActive
                      : styles.categoryTabLabelInactive,
                  ]}
                >
                  {displayCatName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {Boolean(notice) && (
          <View style={styles.warnAlert}>
            <Text style={styles.warnAlertText}>{notice}</Text>
            <Pressable onPress={() => setNotice(null)} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>{t.discovery.close}</Text>
            </Pressable>
          </View>
        )}

        {Boolean(bootError) && (
          <View style={styles.errorAlert}>
            <Text style={[styles.errorAlertText, { flex: 1 }]}>{bootError}</Text>
            <Pressable onPress={loadCatalogAndGps} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>{t.discovery.retry}</Text>
            </Pressable>
          </View>
        )}

        {showAuth && !user && (
          <AuthPanel
            onLogin={handleLogin}
            onRegister={handleRegister}
            onClose={() => setShowAuth(false)}
          />
        )}

        {showLibrary && user && (
          <LibraryPanel
            favorites={favorites}
            collections={collections}
            activeCollection={activeCollection}
            error={libraryError}
            onCreateCollection={handleCreateCollection}
            onOpenCollection={(id) => void handleOpenCollection(id)}
            onDeleteCollection={(id) => void handleDeleteCollection(id)}
            onRemoveItem={(cid, pid) => void handleRemoveFromCollection(cid, pid)}
            onRemoveFavorite={(pid) => {
              const found = favorites.find((f) => f.placeId === pid);
              if (found) void handleToggleFavorite(found.place);
            }}
            onClose={() => setShowLibrary(false)}
          />
        )}

        {/* Subcategorías agrupadas */}
        {activeCategory && activeCategory.subcategories.length > 0 && (
          <View style={styles.subcategoriesBox}>
            <Pressable
              onPress={() => setSubcategorySlug('')}
              style={[
                styles.subPill,
                subcategorySlug === ''
                  ? styles.subPillActive
                  : styles.subPillInactive,
              ]}
            >
              <Text style={styles.subPillIcon}>✨</Text>
              <Text
                style={[
                  styles.subPillText,
                  subcategorySlug === ''
                    ? styles.subPillTextActive
                    : styles.subPillTextInactive,
                ]}
              >
                {t.subcategories.all}
              </Text>
            </Pressable>

            {activeCategory.subcategories.map((sub) => {
              const active = subcategorySlug === sub.slug;
              const subDisplayName = t.subcategories[sub.slug] ?? sub.name;
              const icon = SUBCATEGORY_ICONS[sub.slug] ?? '📍';
              return (
                <Pressable
                  key={sub.id}
                  onPress={() => setSubcategorySlug(active ? '' : sub.slug)}
                  style={[
                    styles.subPill,
                    active ? styles.subPillActive : styles.subPillInactive,
                  ]}
                >
                  <Text style={styles.subPillIcon}>{icon}</Text>
                  <Text
                    style={[
                      styles.subPillText,
                      active
                        ? styles.subPillTextActive
                        : styles.subPillTextInactive,
                    ]}
                  >
                    {subDisplayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {activeRoute && routeTargetName && (
          <View style={styles.infoAlert}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoAlertText}>
                <Text style={{ fontWeight: '800' }}>
                  {t.map.routeLabel(routeTargetName)}
                </Text>
                {(activeRoute.distanceMeters / 1000).toFixed(1)} km · ~
                {activeRoute.durationMinutes} min
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setActiveRoute(null);
                setRouteTargetName(null);
              }}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>{t.map.closeRoute}</Text>
            </Pressable>
          </View>
        )}

        {Boolean(routeError) && (
          <View style={styles.warnAlert}>
            <Text style={styles.warnAlertText}>{routeError}</Text>
          </View>
        )}

        {Boolean(discoveryError) && (
          <View style={styles.errorAlert}>
            <Text style={[styles.errorAlertText, { flex: 1 }]}>
              {discoveryError}
            </Text>
            <Pressable onPress={() => void loadPlaces()} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>{t.discovery.retry}</Text>
            </Pressable>
          </View>
        )}

        {/* MAPA INTERACTIVO + RECOMENDADOS */}
        <MapView
          places={places}
          userLocation={filterValues.coords}
          fallbackCenter={filterValues.coords ?? DEFAULT_COORDS}
          activeRoute={activeRoute}
          radiusKm={filterValues.radiusKm}
          unbounded={filterValues.unbounded}
          onSelectPlace={focusPlace}
          onSelectCoordinates={handleMapSelectCoordinates}
          onRadiusChange={handleMapRadiusChange}
          onResetToGps={() => void requestDeviceGps()}
        />

        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>
              {loading
                ? t.discovery.searchingNearby
                : t.discovery.recommendedCount(places.length)}
            </Text>
          </View>

          {loading ? (
            <BackpackerLoader
              message={t.discovery.scoutingZone}
              submessage={t.discovery.scoutingSubtitle}
            />
          ) : !discoveryError && places.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                {t.discovery.emptyZone(filterValues.radiusKm)}
              </Text>
              <Pressable
                onPress={() =>
                  handleMapRadiusChange(Math.min(50, filterValues.radiusKm * 2))
                }
                style={styles.expandRadiusBtn}
              >
                <Text style={styles.expandRadiusBtnText}>
                  {t.discovery.expandRadius(
                    Math.min(50, filterValues.radiusKm * 2)
                  )}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.placesGrid}>
              {places.map((place, index) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  rank={index + 1}
                  client={client}
                  isFavorite={favoriteIds.has(place.id)}
                  isLoggedIn={Boolean(user)}
                  collections={collections}
                  highlight={highlightSlug === place.slug}
                  onToggleFavorite={(p) => void handleToggleFavorite(p)}
                  onAddToCollection={(cid, p) =>
                    void handleAddToCollection(cid, p)
                  }
                  onRequireLogin={() => setShowAuth(true)}
                  onCalculateRoute={handleCalculateRoute}
                  userOrigin={
                    filterValues.coords
                      ? `${filterValues.coords.lat},${filterValues.coords.lng}`
                      : null
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL SELECTOR DE IDIOMA (7 IDIOMAS IGUAL QUE EN LA WEB) */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          style={styles.langModalBackdrop}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.langModalCard}>
            <Text style={styles.langModalTitle}>
              🌐 {t.header.languageSelectorAria}
            </Text>
            {supportedLocales.map((l) => {
              const active = l.code === locale;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => {
                    setLocale(l.code as SupportedLocale);
                    setShowLanguageModal(false);
                  }}
                  style={[
                    styles.langOptionBtn,
                    active && styles.langOptionBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.langOptionText,
                      active && styles.langOptionTextActive,
                    ]}
                  >
                    {l.flag} {l.label}
                  </Text>
                  {active && <Text style={styles.langCheck}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

export default function App(): React.JSX.Element {
  return (
    <LanguageProvider>
      <ExploroMobileHome />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTopRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#0f172a',
  },
  brandDot: {
    color: '#10B981',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  langPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  savedPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  savedPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  logoutPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoutPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  signInPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  signInPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  categoriesNav: {
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTabBtn: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 5,
    paddingHorizontal: 4,
    paddingBottom: 9,
    borderBottomWidth: 2.5,
  },
  categoryTabBtnActive: {
    borderBottomColor: '#0f172a',
    opacity: 1,
  },
  categoryTabBtnInactive: {
    borderBottomColor: 'transparent',
    opacity: 0.78,
  },
  categoryTabIcon: {
    fontSize: 20,
  },
  categoryTabLabel: {
    fontSize: 12.8,
  },
  categoryTabLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  categoryTabLabelInactive: {
    color: '#64748b',
    fontWeight: '600',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },
  subcategoriesBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  subPill: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  subPillActive: {
    borderWidth: 1.5,
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  subPillInactive: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  subPillIcon: {
    fontSize: 12.5,
  },
  subPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  subPillTextActive: {
    color: '#ffffff',
  },
  subPillTextInactive: {
    color: '#334155',
  },
  warnAlert: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warnAlertText: {
    color: '#b45309',
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
  },
  errorAlert: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorAlertText: {
    color: '#be123c',
    fontSize: 13.5,
    fontWeight: '600',
  },
  infoAlert: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoAlertText: {
    color: '#0369a1',
    fontSize: 13.5,
    fontWeight: '600',
  },
  smallBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderBottomWidth: 3,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  recommendationsSection: {
    gap: 10,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  emptyCardText: {
    color: '#475569',
    fontSize: 14.5,
    textAlign: 'center',
  },
  expandRadiusBtn: {
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderBottomWidth: 3.5,
    borderBottomColor: '#047857',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  expandRadiusBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  placesGrid: {
    gap: 18,
  },
  langModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  langModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 5,
  },
  langModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  langOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  langOptionBtnActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#10b981',
  },
  langOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  langOptionTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  langCheck: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 15,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ExploroApiClient } from '@exploro/api-client';
import {
  canAccessMode,
  formatVerifiedPriceRange,
  getInitialModeDescriptors,
} from '@exploro/business-rules';
import {
  AutocompleteSuggestion,
  BudgetTier,
  CategoryDTO,
  CompanionType,
  ExplorationMode,
  PlaceCardDTO,
  PlaceDetailDTO,
  PlaceRecommendationSummary,
  PlaceSortBy,
  RouteSummary,
  SurpriseSuggestionDTO,
} from '@exploro/shared-types';
import { formatDistanceUS, US_CITIES } from './src/format';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function App(): React.JSX.Element {
  /**
   * Paso 1.5 y Parte V Sección 6:
   * Primera pantalla con «Estoy de viaje» y «Soy local (próximamente)».
   * Prohibido mostrar recomendaciones antes de que el usuario elija su modalidad.
   */
  const [selectedMode, setSelectedMode] = useState<ExplorationMode | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  // Navegación principal y vistas
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites'>('explore');
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('');
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<PlaceSortBy>('recommended');
  const [unbounded, setUnbounded] = useState<boolean>(true);

  // Autocomplete
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<
    AutocompleteSuggestion[]
  >([]);

  // Datos
  const [places, setPlaces] = useState<PlaceCardDTO[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Detalle de lugar y ruta
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [placeDetail, setPlaceDetail] = useState<PlaceDetailDTO | null>(null);
  const [recSummary, setRecSummary] = useState<PlaceRecommendationSummary | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [routeInfo, setRouteInfo] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);

  // Modal Sorpréndeme
  const [surpriseModalVisible, setSurpriseModalVisible] = useState<boolean>(false);
  const [surpriseBudget, setSurpriseBudget] = useState<BudgetTier>('MEDIUM');
  const [surpriseMinutes, setSurpriseMinutes] = useState<number>(120);
  const [surpriseCompanion, setSurpriseCompanion] = useState<CompanionType>('SOLO');
  const [surpriseSuggestions, setSurpriseSuggestions] = useState<SurpriseSuggestionDTO[]>([]);
  const [surpriseLoading, setSurpriseLoading] = useState<boolean>(false);
  const [surpriseError, setSurpriseError] = useState<string | null>(null);

  const modes = useMemo(() => getInitialModeDescriptors(false), []);
  const client = useMemo(() => new ExploroApiClient({ baseUrl: API_URL }), []);

  const handleModePress = (mode: ExplorationMode): void => {
    const access = canAccessMode(mode, false);
    if (!access.allowed) {
      setLocalNotice(
        access.reason ?? 'El modo local estará disponible próximamente.'
      );
      return;
    }
    setLocalNotice(null);
    setSelectedMode(mode);
  };

  // Carga inicial de categorías
  useEffect(() => {
    if (selectedMode !== 'TRAVELER') return;
    void (async () => {
      try {
        const cats = await client.getCategories();
        setCategories(cats);
      } catch {
        // En caso de caída temporal del backend
      }
    })();
  }, [selectedMode, client]);

  // Autocomplete en búsqueda
  useEffect(() => {
    if (selectedMode !== 'TRAVELER' || searchQuery.trim().length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      client
        .geoAutocomplete({
          q: searchQuery,
          citySlug: selectedCitySlug || undefined,
          limit: 4,
        })
        .then((res) => setAutocompleteSuggestions(res))
        .catch(() => setAutocompleteSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCitySlug, selectedMode, client]);

  // Consulta de lugares según filtros y orden
  useEffect(() => {
    if (selectedMode !== 'TRAVELER') return;
    setLoading(true);
    setErrorNotice(null);

    // Encuentra coordenadas de la ciudad si está seleccionada
    const cityData = US_CITIES.find((c) => c.slug === selectedCitySlug);
    const lat = cityData && 'lat' in cityData ? cityData.lat : undefined;
    const lng = cityData && 'lng' in cityData ? cityData.lng : undefined;

    void (async () => {
      try {
        const discovered = await client.discoverPlaces({
          categorySlug: selectedCategorySlug || undefined,
          citySlug: selectedCitySlug || undefined,
          searchQuery: searchQuery.trim() || undefined,
          sortBy,
          lat,
          lng,
          unbounded,
        });
        setPlaces(discovered.data);
      } catch {
        setErrorNotice('No fue posible cargar el catálogo. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedMode, selectedCategorySlug, selectedCitySlug, searchQuery, sortBy, unbounded, client]);

  // Abrir detalle de un lugar
  const handleOpenDetail = async (idOrSlug: string): Promise<void> => {
    setSelectedPlaceId(idOrSlug);
    setLoadingDetail(true);
    setRouteInfo(null);
    setRecSummary(null);
    try {
      const detail = await client.getPlaceBySlug(idOrSlug);
      setPlaceDetail(detail);
      client
        .getPlaceRecommendationSummary(detail.id)
        .then((s) => setRecSummary(s))
        .catch(() => {});
    } catch {
      setErrorNotice('No fue posible obtener los detalles del lugar.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = (): void => {
    setSelectedPlaceId(null);
    setPlaceDetail(null);
    setRouteInfo(null);
    setRecSummary(null);
  };

  // Calcular ruta sin costo ($0.00)
  const handleCalculateRoute = async (mode: 'driving' | 'walking'): Promise<void> => {
    if (!placeDetail) return;
    setRouteLoading(true);
    try {
      // Usa coordenadas de ciudad seleccionada o Nueva York como referencia
      const cityData = US_CITIES.find((c) => c.slug === selectedCitySlug);
      const origin =
        cityData && 'lat' in cityData
          ? { lat: cityData.lat, lng: cityData.lng }
          : { lat: 40.7128, lng: -74.006 };

      const route = await client.geoCalculateRoute({
        origin,
        destination: {
          lat: placeDetail.coordinates.lat,
          lng: placeDetail.coordinates.lng,
        },
        mode,
      });
      setRouteInfo(route);
    } catch {
      // En caso de error
    } finally {
      setRouteLoading(false);
    }
  };

  // Toggle de favoritos
  const toggleFavorite = (id: string): void => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Ejecución de Sorpréndeme
  const handleSurpriseMe = async (): Promise<void> => {
    setSurpriseLoading(true);
    setSurpriseError(null);
    setSurpriseSuggestions([]);

    const cityData = US_CITIES.find((c) => c.slug === selectedCitySlug);
    const coords =
      cityData && 'lat' in cityData && 'lng' in cityData
        ? { lat: cityData.lat, lng: cityData.lng }
        : undefined;

    try {
      const res = await client.surpriseMe({
        budgetTier: surpriseBudget,
        availableMinutes: surpriseMinutes,
        companionType: surpriseCompanion,
        citySlug: coords ? undefined : selectedCitySlug || undefined,
        coordinates: coords,
        applyPreferences: true,
      });
      setSurpriseSuggestions(res.suggestions);
      if (res.suggestions.length === 0) {
        setSurpriseError('No se encontraron sugerencias que cumplan estos criterios.');
      }
    } catch {
      setSurpriseError('Ocurrió un error al generar la experiencia.');
    } finally {
      setSurpriseLoading(false);
    }
  };

  // Filtrado de lugares para la pestaña favoritos
  const displayedPlaces = useMemo(() => {
    if (activeTab === 'favorites') {
      return places.filter((p) => favoriteIds.has(p.id));
    }
    return places;
  }, [places, favoriteIds, activeTab]);

  // Pantalla 1: Selección obligatoria de Modo de Exploración
  if (selectedMode === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.heroBox}>
          <Text style={styles.badge}>EE. UU. • Evidencias Verificadas</Text>
          <Text style={styles.title}>Exploro</Text>
          <Text style={styles.subtitle}>
            Descubre lugares y experiencias reales sin datos inventados. Elige
            tu modalidad para comenzar:
          </Text>

          {modes.map((m) => (
            <Pressable
              key={m.mode}
              onPress={() => handleModePress(m.mode)}
              style={[
                styles.modeCard,
                !m.enabled && styles.modeCardDisabled,
              ]}
            >
              <View style={styles.modeHeader}>
                <Text style={styles.modeTitle}>{m.label}</Text>
                {m.badgeText ? (
                  <Text style={styles.comingSoonBadge}>{m.badgeText}</Text>
                ) : null}
              </View>
              <Text style={styles.modeDesc}>{m.subtitle}</Text>
            </Pressable>
          ))}

          {localNotice ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{localNotice}</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  // Pantalla 2: Exploración Principal (Estoy de viaje)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Barra superior */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.headerTitle}>Exploro US</Text>
            <Text style={styles.headerSub}>Modalidad: Estoy de viaje</Text>
          </View>
          <Pressable
            onPress={() => setSelectedMode(null)}
            style={styles.switchBtn}
          >
            <Text style={styles.switchBtnText}>Cambiar modo</Text>
          </Pressable>
        </View>

        {/* Pestañas: Catálogo vs Favoritos + Botón Sorpréndeme */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('explore')}
            style={[styles.tabItem, activeTab === 'explore' && styles.tabItemActive]}
          >
            <Text
              style={[
                styles.tabItemText,
                activeTab === 'explore' && styles.tabItemTextActive,
              ]}
            >
              Explorar ({places.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('favorites')}
            style={[styles.tabItem, activeTab === 'favorites' && styles.tabItemActive]}
          >
            <Text
              style={[
                styles.tabItemText,
                activeTab === 'favorites' && styles.tabItemTextActive,
              ]}
            >
              Favoritos ({favoriteIds.size})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSurpriseModalVisible(true)}
            style={styles.surpriseButton}
          >
            <Text style={styles.surpriseButtonText}>✨ Sorpréndeme</Text>
          </Pressable>
        </View>

        {/* Barra de Búsqueda con Autocomplete */}
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Buscar lugares, museos, comida..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Sugerencias de Autocomplete */}
        {autocompleteSuggestions.length > 0 ? (
          <View style={styles.suggestionsContainer}>
            {autocompleteSuggestions.map((sug) => (
              <Pressable
                key={sug.id}
                onPress={() => {
                  if (sug.type === 'city') {
                    const matched = US_CITIES.find(
                      (c) => c.value.toLowerCase() === sug.city?.toLowerCase()
                    );
                    setSelectedCitySlug(matched?.slug ?? '');
                    setSearchQuery('');
                  } else {
                    setSearchQuery(sug.title);
                  }
                  setAutocompleteSuggestions([]);
                }}
                style={styles.suggestionItem}
              >
                <View>
                  <Text style={styles.suggestionTitle}>{sug.title}</Text>
                  <Text style={styles.suggestionSub}>{sug.subtitle}</Text>
                </View>
                <Text style={styles.suggestionBadge}>
                  {sug.type === 'city' ? 'Ciudad' : 'Lugar'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Filtro de Ciudades de EE. UU. */}
        <Text style={styles.filterLabel}>Ciudad (EE. UU.):</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {US_CITIES.map((c) => {
            const active = selectedCitySlug === c.slug;
            return (
              <Pressable
                key={c.slug}
                onPress={() => setSelectedCitySlug(c.slug)}
                style={[styles.cityChip, active && styles.cityChipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filtro de Categorías */}
        <Text style={styles.filterLabel}>Categoría:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          <Pressable
            onPress={() => setSelectedCategorySlug('')}
            style={[styles.categoryChip, selectedCategorySlug === '' && styles.categoryChipActive]}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategorySlug === '' && styles.chipTextActive,
              ]}
            >
              Todas
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const active = selectedCategorySlug === cat.slug;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategorySlug(active ? '' : cat.slug)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Filtro de Ordenamiento y Radio */}
        <View style={styles.sortRow}>
          <View style={styles.sortChips}>
            {(
              [
                ['recommended', 'Recomendados'],
                ['distance', 'Distancia'],
                ['name', 'Nombre'],
              ] as const
            ).map(([key, label]) => {
              const active = sortBy === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSortBy(key)}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                >
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setUnbounded((prev) => !prev)}
            style={[styles.unboundedChip, unbounded && styles.unboundedChipActive]}
          >
            <Text style={styles.unboundedChipText}>
              {unbounded ? '🌐 Todo EE. UU.' : '📍 Radio acotado'}
            </Text>
          </Pressable>
        </View>

        {/* Mensaje de error si la conexión falló */}
        {errorNotice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{errorNotice}</Text>
          </View>
        ) : null}

        {/* Lista de lugares */}
        <Text style={styles.sectionTitle}>
          {activeTab === 'explore'
            ? 'Recomendaciones respaldadas por evidencias'
            : 'Mis lugares guardados'}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginVertical: 32 }} />
        ) : displayedPlaces.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              {activeTab === 'explore'
                ? 'No se encontraron lugares con estos filtros.'
                : 'Aún no has guardado ningún lugar favorito.'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'explore'
                ? 'Prueba cambiando la ciudad o limpiando la búsqueda.'
                : 'Toca el ícono de corazón en cualquier tarjeta para guardarlo.'}
            </Text>
          </View>
        ) : (
          displayedPlaces.map((place) => {
            const isFav = favoriteIds.has(place.id);
            const distFormatted = formatDistanceUS(place.distanceMeters);

            return (
              <Pressable
                key={place.id}
                onPress={() => void handleOpenDetail(place.slug || place.id)}
                style={styles.placeCard}
              >
                <View style={styles.placeHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.placeMeta}>
                        {place.categoryName} • {place.cityName}
                        {place.stateCode ? `, ${place.stateCode}` : ''}
                      </Text>
                      {place.isDemoData ? (
                        <View style={styles.demoBadge}>
                          <Text style={styles.demoBadgeText}>DEMO</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.placeName}>{place.name}</Text>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(place.id);
                    }}
                    style={[styles.favBtn, isFav && styles.favBtnActive]}
                  >
                    <Text style={styles.favBtnText}>{isFav ? '❤️' : '🤍'}</Text>
                  </Pressable>
                </View>

                <Text style={styles.placeReason} numberOfLines={3}>
                  {place.recommendationReason}
                </Text>

                <View style={styles.placeFooter}>
                  <View>
                    <Text style={styles.placePrice}>
                      {formatVerifiedPriceRange({
                        avgPriceMin: place.avgPriceMin,
                        avgPriceMax: place.avgPriceMax,
                        currencyCode: place.currencyCode,
                        priceStatus: place.priceStatus,
                      })}
                      {place.priceStatus !== 'CONFIRMED' ? (
                        <Text style={styles.unverifiedNote}> (sin verificar)</Text>
                      ) : null}
                    </Text>
                    {distFormatted ? (
                      <Text style={styles.placeDistance}>📍 {distFormatted}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.placeEvidenceCount}>
                    {place.recommendationCount} evidencia(s)
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* MODAL: Sorpréndeme */}
      <Modal
        visible={surpriseModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSurpriseModalVisible(false)}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.headerTitle}>✨ Sorpréndeme</Text>
                <Text style={styles.headerSub}>Descubrimiento aleatorio verificado</Text>
              </View>
              <Pressable
                onPress={() => setSurpriseModalVisible(false)}
                style={styles.switchBtn}
              >
                <Text style={styles.switchBtnText}>Cerrar</Text>
              </Pressable>
            </View>

            {/* Presupuesto */}
            <Text style={styles.modalFieldLabel}>Presupuesto máximo:</Text>
            <View style={styles.budgetRow}>
              {(
                [
                  ['FREE', 'Gratis'],
                  ['LOW', '$ Económico'],
                  ['MEDIUM', '$$ Moderado'],
                  ['HIGH', '$$$ Alto'],
                  ['LUXURY', '$$$$ Lujo'],
                ] as const
              ).map(([tier, label]) => (
                <Pressable
                  key={tier}
                  onPress={() => setSurpriseBudget(tier)}
                  style={[
                    styles.budgetOption,
                    surpriseBudget === tier && styles.budgetOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.budgetOptionText,
                      surpriseBudget === tier && styles.budgetOptionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Tiempo Disponible */}
            <Text style={styles.modalFieldLabel}>Tiempo disponible:</Text>
            <View style={styles.budgetRow}>
              {[
                { label: '1 hora', mins: 60 },
                { label: '2 horas', mins: 120 },
                { label: '4 horas', mins: 240 },
                { label: 'Todo el día', mins: 480 },
              ].map((t) => (
                <Pressable
                  key={t.mins}
                  onPress={() => setSurpriseMinutes(t.mins)}
                  style={[
                    styles.budgetOption,
                    surpriseMinutes === t.mins && styles.budgetOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.budgetOptionText,
                      surpriseMinutes === t.mins && styles.budgetOptionTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Acompañante */}
            <Text style={styles.modalFieldLabel}>Compañía:</Text>
            <View style={styles.budgetRow}>
              {(
                [
                  ['SOLO', 'Solo'],
                  ['COUPLE', 'Pareja'],
                  ['FRIENDS', 'Amigos'],
                  ['FAMILY', 'Familia'],
                ] as const
              ).map(([val, label]) => (
                <Pressable
                  key={val}
                  onPress={() => setSurpriseCompanion(val)}
                  style={[
                    styles.budgetOption,
                    surpriseCompanion === val && styles.budgetOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.budgetOptionText,
                      surpriseCompanion === val && styles.budgetOptionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Botón de Generar Sorpresa */}
            <Pressable
              onPress={() => void handleSurpriseMe()}
              disabled={surpriseLoading}
              style={styles.generateButton}
            >
              {surpriseLoading ? (
                <ActivityIndicator color="#0b1120" />
              ) : (
                <Text style={styles.generateButtonText}>🎲 Generar Sorpresa</Text>
              )}
            </Pressable>

            {surpriseError ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{surpriseError}</Text>
              </View>
            ) : null}

            {/* Resultados de Sorpréndeme */}
            {surpriseSuggestions.map((sug) => (
              <View key={sug.place.id} style={styles.surpriseCard}>
                <View style={styles.placeHeader}>
                  <Text style={styles.placeName}>{sug.place.name}</Text>
                  {sug.place.isDemoData ? (
                    <View style={styles.demoBadge}>
                      <Text style={styles.demoBadgeText}>DEMO</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.placeMeta}>
                  {sug.place.categoryName} • {sug.place.cityName}
                </Text>
                <Text style={styles.placeReason}>{sug.place.recommendationReason}</Text>

                <View style={styles.fitTagsRow}>
                  <View
                    style={[
                      styles.fitTag,
                      sug.budgetFit === 'CONFIRMED' ? styles.fitTagOk : styles.fitTagWarn,
                    ]}
                  >
                    <Text style={styles.fitTagText}>
                      {sug.budgetFit === 'CONFIRMED'
                        ? '✓ Presupuesto verificado'
                        : '⚠️ Presupuesto no confirmado'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.fitTag,
                      sug.timeFit === 'CONFIRMED' ? styles.fitTagOk : styles.fitTagWarn,
                    ]}
                  >
                    <Text style={styles.fitTagText}>
                      {sug.timeFit === 'CONFIRMED'
                        ? '✓ Tiempo verificado'
                        : '⚠️ Duración estimada'}
                    </Text>
                  </View>
                  {sug.estimatedTravelMinutes !== null ? (
                    <View style={styles.fitTag}>
                      <Text style={styles.fitTagText}>
                        🚗 ~{sug.estimatedTravelMinutes} min traslado
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL: Detalle de Lugar y Cálculo de Ruta */}
      <Modal
        visible={selectedPlaceId !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={handleCloseDetail}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.topBar}>
              <Text style={styles.headerTitle}>Detalle del Lugar</Text>
              <Pressable onPress={handleCloseDetail} style={styles.switchBtn}>
                <Text style={styles.switchBtnText}>✕ Cerrar</Text>
              </Pressable>
            </View>

            {loadingDetail || !placeDetail ? (
              <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
            ) : (
              <View>
                <View style={styles.badgeRow}>
                  <Text style={styles.placeMeta}>
                    {placeDetail.categoryName} • {placeDetail.cityName}
                    {placeDetail.stateCode ? `, ${placeDetail.stateCode}` : ''}
                  </Text>
                  {placeDetail.isDemoData ? (
                    <View style={styles.demoBadge}>
                      <Text style={styles.demoBadgeText}>DEMO</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.detailTitle}>{placeDetail.name}</Text>
                {placeDetail.addressText ? (
                  <Text style={styles.detailAddress}>{placeDetail.addressText}</Text>
                ) : null}

                {/* BOTÓN: Calcular Ruta (Fase 3) */}
                <View style={styles.routeButtonsRow}>
                  <Pressable
                    disabled={routeLoading}
                    onPress={() => void handleCalculateRoute('driving')}
                    style={styles.routeBtn}
                  >
                    <Text style={styles.routeBtnText}>🚗 Cómo llegar (Auto)</Text>
                  </Pressable>
                  <Pressable
                    disabled={routeLoading}
                    onPress={() => void handleCalculateRoute('walking')}
                    style={styles.routeBtn}
                  >
                    <Text style={styles.routeBtnText}>🚶 A pie</Text>
                  </Pressable>
                </View>

                {routeLoading ? (
                  <ActivityIndicator color="#38bdf8" style={{ marginVertical: 12 }} />
                ) : null}

                {routeInfo ? (
                  <View style={styles.routeResultCard}>
                    <Text style={styles.routeResultTitle}>
                      📍 Trayecto calculado ({routeInfo.mode === 'driving' ? 'Auto' : 'A pie'}):
                    </Text>
                    <Text style={styles.routeResultMeta}>
                      Distancia: {routeInfo.distanceMiles} mi • Tiempo estimado: ~{routeInfo.durationMinutes} min
                    </Text>
                    <View style={styles.stepsList}>
                      {routeInfo.steps.map((st, i) => (
                        <Text key={i} style={styles.stepItem}>
                          {i + 1}. {st.instruction} (~{Math.round(st.distanceMeters)} m)
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Recomendación Explicable y Aspectos Verificados (Fase 4) */}
                <View style={styles.aiCard}>
                  <View style={styles.aiCardHeader}>
                    <Text style={styles.aiCardTitle}>🧠 Recomendación Explicable</Text>
                    <Text style={styles.aiScoreBadge}>
                      {recSummary ? `${Math.round(recSummary.overallScore)}/100` : `${Math.round(placeDetail.scoreSummary.overallScore)}/100`}
                    </Text>
                  </View>
                  <Text style={styles.aiExplanationText}>
                    {recSummary?.explanation || placeDetail.recommendationReason}
                  </Text>

                  {/* Chips de Aspectos Positivos */}
                  {recSummary && recSummary.topPositiveAspects.length > 0 ? (
                    <View style={styles.aspectsRow}>
                      {recSummary.topPositiveAspects.map((asp) => (
                        <View key={asp.aspect} style={styles.positiveAspectChip}>
                          <Text style={styles.positiveAspectText}>
                            ✨ {asp.aspect} {asp.mentionsCount > 1 ? `(${asp.mentionsCount})` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Chips de Advertencias */}
                  {recSummary && recSummary.topNegativeAspects.length > 0 ? (
                    <View style={styles.aspectsRow}>
                      {recSummary.topNegativeAspects.map((asp) => (
                        <View key={asp.aspect} style={styles.negativeAspectChip}>
                          <Text style={styles.negativeAspectText}>⚠️ {asp.aspect}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.aiCardFooter}>
                    <Text style={styles.aiAuditText}>
                      {recSummary?.factCheckPassed
                        ? '✅ Respaldado por evidencias'
                        : '⚠️ Información en verificación'}
                    </Text>
                    <Text style={styles.aiCostText}>Costo IA: $0.00</Text>
                  </View>
                </View>

                {/* Actividades disponibles */}
                {placeDetail.activities.length > 0 ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Actividades disponibles ({placeDetail.activities.length})
                    </Text>
                    {placeDetail.activities.map((act) => (
                      <View key={act.id} style={styles.activityItem}>
                        <Text style={styles.activityTitle}>{act.title}</Text>
                        <Text style={styles.activityDesc}>{act.description}</Text>
                        <Text style={styles.activityMeta}>
                          {act.estimatedDurationMins !== null
                            ? `Duración estimada: ${act.estimatedDurationMins} min`
                            : 'Duración sin datos'}
                          {act.estimatedCost !== null
                            ? ` • Costo: ~$${act.estimatedCost}`
                            : ' • Costo no especificado'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Evidencias registradas auditables */}
                {placeDetail.evidences.length > 0 ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Evidencias auditables ({placeDetail.evidences.length})
                    </Text>
                    {placeDetail.evidences.map((ev) => (
                      <View key={ev.id} style={styles.evidenceItem}>
                        <Text style={styles.evidenceSnippet}>"{ev.extractedSnippet}"</Text>
                        <Text style={styles.evidenceMeta}>
                          {ev.sourceName} • Confianza: {Math.round(ev.confidenceScore * 100)}%
                          {ev.publishedAt ? ` • ${new Date(ev.publishedAt).toLocaleDateString()}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  heroBox: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8fafc',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  modeCard: {
    backgroundColor: '#131c31',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  modeCardDisabled: {
    borderColor: '#334155',
    opacity: 0.72,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  comingSoonBadge: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modeDesc: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  noticeBox: {
    marginVertical: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#451a03',
  },
  noticeText: {
    color: '#fde68a',
    fontSize: 13,
  },
  scrollContent: {
    padding: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    color: '#38bdf8',
    fontSize: 13,
  },
  switchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  tabItemActive: {
    backgroundColor: '#0284c7',
  },
  tabItemText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  tabItemTextActive: {
    color: '#f8fafc',
  },
  surpriseButton: {
    marginLeft: 'auto',
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  surpriseButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131c31',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: '#f8fafc',
    fontSize: 14,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionsContainer: {
    backgroundColor: '#131c31',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  suggestionTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  suggestionBadge: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  horizontalScroll: {
    marginBottom: 14,
  },
  cityChip: {
    backgroundColor: '#131c31',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cityChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a1',
  },
  categoryChip: {
    backgroundColor: '#131c31',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  categoryChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#1e3a8a',
  },
  chipText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChips: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#131c31',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sortChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c4a6e',
  },
  sortChipText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  sortChipTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  unboundedChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#131c31',
    borderWidth: 1,
    borderColor: '#334155',
  },
  unboundedChipActive: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b',
  },
  unboundedChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#131c31',
    borderRadius: 12,
    marginVertical: 16,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  placeCard: {
    backgroundColor: '#131c31',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  placeMeta: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  demoBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  demoBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
  },
  placeName: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  favBtn: {
    padding: 6,
  },
  favBtnActive: {
    transform: [{ scale: 1.1 }],
  },
  favBtnText: {
    fontSize: 18,
  },
  placeReason: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  placeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  placePrice: {
    color: '#94a3b8',
    fontSize: 12,
  },
  unverifiedNote: {
    color: '#f59e0b',
    fontSize: 11,
    fontStyle: 'italic',
  },
  placeDistance: {
    color: '#60a5fa',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  placeEvidenceCount: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal styles
  modalFieldLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  budgetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  budgetOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#131c31',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  budgetOptionActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#a78bfa',
  },
  budgetOptionText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  budgetOptionTextActive: {
    color: '#ffffff',
  },
  generateButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 16,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  surpriseCard: {
    backgroundColor: '#131c31',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  fitTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  fitTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  fitTagOk: {
    backgroundColor: '#064e3b',
  },
  fitTagWarn: {
    backgroundColor: '#78350f',
  },
  fitTagText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
  detailTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  detailAddress: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  routeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  routeBtn: {
    flex: 1,
    backgroundColor: '#0369a1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  routeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  routeResultCard: {
    backgroundColor: '#0c4a6e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  routeResultTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  routeResultMeta: {
    color: '#7dd3fc',
    fontSize: 12,
    marginBottom: 8,
  },
  stepsList: {
    gap: 4,
  },
  stepItem: {
    color: '#e2e8f0',
    fontSize: 11,
  },
  detailSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  detailSectionTitle: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  activityItem: {
    backgroundColor: '#131c31',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  activityDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 4,
  },
  activityMeta: {
    color: '#94a3b8',
    fontSize: 11,
  },
  evidenceItem: {
    backgroundColor: '#131c31',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#34d399',
  },
  evidenceSnippet: {
    color: '#f8fafc',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  evidenceMeta: {
    color: '#64748b',
    fontSize: 11,
  },
  aiCard: {
    backgroundColor: '#131c31',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: 14,
    marginTop: 14,
    gap: 8,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiCardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  aiScoreBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  aiExplanationText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  aspectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  positiveAspectChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  positiveAspectText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '600',
  },
  negativeAspectChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  negativeAspectText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '600',
  },
  aiCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 6,
    marginTop: 4,
  },
  aiAuditText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  aiCostText: {
    color: '#64748b',
    fontSize: 11,
  },
});

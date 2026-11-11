import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ActivityAlternativeOptionDTO,
  ActivityLogDTO,
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
  TripDTO,
  TripItemDTO,
  TripReorganizationImpactDTO,
  UserReviewDTO,
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
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites' | 'trips'>('explore');
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('');
  const [selectedCitySlug, setSelectedCitySlug] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<PlaceSortBy>('recommended');
  const [unbounded, setUnbounded] = useState<boolean>(true);

  // Fase 6: Planificador de Viajes (Oculto bajo Feature Flag)
  const [internalOverride, setInternalOverride] = useState<boolean>(true);
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripDTO | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [tripsLoading, setTripsLoading] = useState<boolean>(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [altsItem, setAltsItem] = useState<TripItemDTO | null>(null);
  const [altsData, setAltsData] = useState<{
    verySimilar: ActivityAlternativeOptionDTO[];
    relatedExperiences: ActivityAlternativeOptionDTO[];
    requiresAdjustments: ActivityAlternativeOptionDTO[];
  } | null>(null);
  const [altsLoading, setAltsLoading] = useState<boolean>(false);
  const [modifyingItem, setModifyingItem] = useState<TripItemDTO | null>(null);
  const [newStartTime, setNewStartTime] = useState<string>('11:00');
  const [newDuration, setNewDuration] = useState<number>(60);
  const [reorgPreview, setReorgPreview] = useState<TripReorganizationImpactDTO | null>(null);

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

  // Fase 5: Experiencias Propias y Verificación
  const [activeActivity, setActiveActivity] = useState<ActivityLogDTO | null>(null);
  const [placeReviews, setPlaceReviews] = useState<UserReviewDTO[]>([]);
  const [experienceNotice, setExperienceNotice] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackRecommended, setFeedbackRecommended] = useState<string>('');
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);

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
    setActiveActivity(null);
    setPlaceReviews([]);
    setExperienceNotice(null);
    try {
      const detail = await client.getPlaceBySlug(idOrSlug);
      setPlaceDetail(detail);
      client
        .getPlaceRecommendationSummary(detail.id)
        .then((s) => setRecSummary(s))
        .catch(() => {});
      client
        .getPlaceReviews(detail.id)
        .then((r) => setPlaceReviews(r))
        .catch(() => {});
      client
        .getActiveActivity()
        .then((act) => {
          if (act && act.placeId === detail.id) setActiveActivity(act);
        })
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
    setActiveActivity(null);
    setPlaceReviews([]);
    setExperienceNotice(null);
    setShowFeedbackModal(false);
  };

  // Fase 5: Acciones de Experiencias Propias y Verificación
  const handleStartActivity = async (): Promise<void> => {
    if (!placeDetail) return;
    try {
      setExperienceNotice(null);
      const act = await client.startActivity({
        placeId: placeDetail.id,
        activityTitle: placeDetail.activities[0]?.title ?? `Visita a ${placeDetail.name}`,
      });
      setActiveActivity(act);
      setExperienceNotice('¡Actividad iniciada! La presencia física no se asume por el simple inicio.');
    } catch {
      setExperienceNotice('No fue posible iniciar actividad (inicia sesión para registrarla).');
    }
  };

  const handleVerifyProximity = async (): Promise<void> => {
    if (!activeActivity || !placeDetail) return;
    try {
      // Simula verificación GPS cercana (< 50 metros)
      const res = await client.verifyActivityVisit(activeActivity.id, {
        latitude: placeDetail.coordinates.lat + 0.0001,
        longitude: placeDetail.coordinates.lng + 0.0001,
      });
      setExperienceNotice(res.message);
      if (res.isVerified) {
        setActiveActivity((prev) =>
          prev ? { ...prev, isVerifiedVisit: true, verificationMethod: 'GPS_PROXIMITY' } : null
        );
      }
    } catch {
      setExperienceNotice('Error al verificar proximidad con el lugar.');
    }
  };

  const handleCompleteExperience = async (): Promise<void> => {
    if (!activeActivity || !placeDetail) return;
    setFeedbackSubmitting(true);
    try {
      const isFood = placeDetail.categorySlug === 'comida';
      const rev = await client.completeActivityWithReview(activeActivity.id, {
        reviewType: isFood ? 'RESTAURANT' : 'TOURISM',
        restaurantReview: isFood
          ? {
              tasteQuality: feedbackRating,
              recommendedDish: feedbackRecommended || undefined,
              wouldReturn: true,
              comment: feedbackComment || undefined,
            }
          : undefined,
        tourismReview: !isFood
          ? {
              worthIt: true,
              recommendedItem: feedbackRecommended || undefined,
              comment: feedbackComment || undefined,
            }
          : undefined,
        wouldReturnOrRecommend: true,
        generalComment: feedbackComment || undefined,
      });

      setActiveActivity(null);
      setShowFeedbackModal(false);
      setExperienceNotice('¡Experiencia registrada! Tu opinión fortalece el ranking determinista.');
      setPlaceReviews((prev) => [rev, ...prev]);

      client
        .getPlaceRecommendationSummary(placeDetail.id)
        .then((s) => setRecSummary(s))
        .catch(() => {});
    } catch {
      setExperienceNotice('Error al enviar opinión.');
    } finally {
      setFeedbackSubmitting(false);
    }
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

  const tripClient = useMemo(
    () =>
      new ExploroApiClient({
        baseUrl: API_URL,
        defaultHeaders: internalOverride
          ? { 'x-exploro-internal': 'true' }
          : undefined,
      }),
    [internalOverride]
  );

  const handleLoadTripsMobile = useCallback(async () => {
    setTripsLoading(true);
    setTripsError(null);
    try {
      const list = await tripClient.listTrips();
      setTrips(list);
      if (list.length > 0 && !selectedTrip) {
        setSelectedTrip(list[0]);
      }
    } catch (err: unknown) {
      setTripsError(
        err instanceof Error ? err.message : 'Error al cargar viajes'
      );
    } finally {
      setTripsLoading(false);
    }
  }, [tripClient, selectedTrip]);

  const handleGenerateAssistedMobile = async () => {
    setTripsLoading(true);
    setTripsError(null);
    try {
      const plan = await tripClient.generateAssistedPlan({
        citySlug: 'new-york',
        title: 'Nueva York en 1 Día (Asistido)',
        startDate: '2026-11-20',
        endDate: '2026-11-20',
        budgetTier: 'MEDIUM',
        travelStyles: ['CULTURAL'],
        flexibilityMinutes: 15,
      });
      setSelectedTrip(plan);
      setTrips((prev) => [plan, ...prev]);
    } catch (err: unknown) {
      setTripsError(
        err instanceof Error ? err.message : 'Error al generar itinerario'
      );
    } finally {
      setTripsLoading(false);
    }
  };

  const handleOpenAlternativesMobile = async (item: TripItemDTO) => {
    if (!selectedTrip) return;
    setAltsItem(item);
    setAltsLoading(true);
    setAltsData(null);
    try {
      const res = await tripClient.getActivityAlternatives(
        selectedTrip.id,
        item.id,
        15
      );
      setAltsData(res);
    } catch (err: unknown) {
      setTripsError(
        err instanceof Error ? err.message : 'Error al obtener alternativas'
      );
    } finally {
      setAltsLoading(false);
    }
  };

  const handlePreviewReorgMobile = async () => {
    if (!selectedTrip || !modifyingItem) return;
    try {
      const preview = await tripClient.previewReorganization(
        selectedTrip.id,
        modifyingItem.id,
        {
          newStartTime,
          newDurationMinutes: newDuration,
        }
      );
      setReorgPreview(preview);
    } catch (err: unknown) {
      setTripsError(
        err instanceof Error ? err.message : 'Error al previsualizar cambios'
      );
    }
  };

  const handleApplyReorgMobile = async () => {
    if (!selectedTrip || !modifyingItem || !reorgPreview) return;
    try {
      await tripClient.updateTripItem(selectedTrip.id, modifyingItem.id, {
        startTime: newStartTime,
        durationMinutes: newDuration,
      });
      if (reorgPreview.shiftedItems.length > 0) {
        await tripClient.applyReorganization(selectedTrip.id, {
          affectedItemIds: reorgPreview.shiftedItems.map((s) => s.itemId),
          shiftMinutes: reorgPreview.shiftedItems[0].shiftMinutes,
        });
      }
      const updated = await tripClient.getTripById(selectedTrip.id);
      setSelectedTrip(updated);
      setModifyingItem(null);
      setReorgPreview(null);
    } catch (err: unknown) {
      setTripsError(
        err instanceof Error ? err.message : 'Error al aplicar reorganización'
      );
    }
  };

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

        {/* Pestañas: Catálogo vs Favoritos vs Viajes + Botón Sorpréndeme */}
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
              Explorar
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
            onPress={() => {
              setActiveTab('trips');
              void handleLoadTripsMobile();
            }}
            style={[styles.tabItem, activeTab === 'trips' && styles.tabItemActive]}
          >
            <Text
              style={[
                styles.tabItemText,
                activeTab === 'trips' && styles.tabItemTextActive,
              ]}
            >
              🗺️ Viajes
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

        {/* Lista de lugares o Vista de Viajes */}
        {activeTab === 'trips' ? (
          <View style={{ marginTop: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={[styles.badge, { backgroundColor: '#0284c7' }]}>
                🧪 Modo Interno Activo
              </Text>
              <Pressable
                onPress={() => setInternalOverride((v) => !v)}
                style={[
                  styles.switchBtn,
                  { borderColor: internalOverride ? '#10b981' : '#ef4444' },
                ]}
              >
                <Text
                  style={{
                    color: internalOverride ? '#10b981' : '#ef4444',
                    fontSize: 11,
                  }}
                >
                  {internalOverride ? 'x-exploro-internal: ON' : 'x-exploro-internal: OFF'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleGenerateAssistedMobile}
              style={[
                styles.surpriseButton,
                { marginBottom: 16, alignItems: 'center' },
              ]}
            >
              <Text style={styles.surpriseButtonText}>
                ✨ Generar Itinerario Asistido (NY)
              </Text>
            </Pressable>

            {tripsLoading ? (
              <ActivityIndicator
                size="large"
                color="#38bdf8"
                style={{ marginVertical: 32 }}
              />
            ) : tripsError ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>{tripsError}</Text>
              </View>
            ) : selectedTrip ? (
              <View>
                <Text style={styles.sectionTitle}>
                  Mis Itinerarios ({trips.length})
                </Text>
                <View style={[styles.placeCard, { marginBottom: 16 }]}>
                  <Text style={styles.placeName}>{selectedTrip.title}</Text>
                  <Text style={styles.placeMeta}>
                    📅 {selectedTrip.startDate} • 💰 Presupuesto:{' '}
                    {selectedTrip.budgetTier} • ⏱️ Flexibilidad: ±
                    {selectedTrip.flexibilityMinutes}m
                  </Text>
                </View>

                {/* Días */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {selectedTrip.days?.map((d) => (
                    <Pressable
                      key={d.id}
                      onPress={() => setSelectedDayNumber(d.dayNumber)}
                      style={[
                        styles.categoryChip,
                        selectedDayNumber === d.dayNumber && styles.categoryChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedDayNumber === d.dayNumber && styles.chipTextActive,
                        ]}
                      >
                        Día {d.dayNumber}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Items del día */}
                {selectedTrip.days
                  ?.find((d) => d.dayNumber === selectedDayNumber)
                  ?.items?.map((it, idx) => (
                    <View
                      key={it.id}
                      style={[styles.placeCard, { padding: 12, marginBottom: 10 }]}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: '#0f172a',
                              padding: 6,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                color: '#38bdf8',
                                fontWeight: '700',
                                fontSize: 13,
                              }}
                            >
                              {it.startTime ?? '10:00'}
                            </Text>
                          </View>
                          <View>
                            <Text
                              style={{
                                color: '#f8fafc',
                                fontWeight: '700',
                                fontSize: 14,
                              }}
                            >
                              {it.customTitle ?? it.placeName ?? 'Actividad'}
                            </Text>
                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                              {it.durationMinutes} min{' '}
                              {idx > 0 && it.transitDistanceMetersFromPrev > 0
                                ? `• Traslado: ${(
                                    it.transitDistanceMetersFromPrev / 1000
                                  ).toFixed(1)} km (~${it.transitMinutesFromPrev}m)`
                                : ''}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <Pressable
                          onPress={() => void handleOpenAlternativesMobile(it)}
                          style={[styles.switchBtn, { backgroundColor: '#1e293b' }]}
                        >
                          <Text style={{ color: '#38bdf8', fontSize: 11 }}>
                            🔄 Alternativas (3 Niveles)
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setModifyingItem(it);
                            setNewStartTime(it.startTime?.slice(0, 5) ?? '10:00');
                            setNewDuration(it.durationMinutes);
                            setReorgPreview(null);
                          }}
                          style={[styles.switchBtn, { backgroundColor: '#1e293b' }]}
                        >
                          <Text style={{ color: '#cbd5e1', fontSize: 11 }}>
                            ⏱️ Ajustar Horario
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No hay itinerarios registrados</Text>
                <Text style={styles.emptySub}>
                  Genera uno asistido para comenzar.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
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
          </>
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

      {/* MODAL: Alternativas en 3 Niveles (Fase 6) */}
      <Modal
        visible={altsItem !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAltsItem(null)}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.topBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>🔄 Alternativas</Text>
                <Text style={styles.headerSub}>
                  Para: {altsItem?.customTitle ?? altsItem?.placeName ?? 'Actividad'}
                </Text>
              </View>
              <Pressable
                onPress={() => setAltsItem(null)}
                style={styles.switchBtn}
              >
                <Text style={styles.switchBtnText}>Cerrar</Text>
              </Pressable>
            </View>

            {altsLoading ? (
              <ActivityIndicator
                size="large"
                color="#38bdf8"
                style={{ marginVertical: 32 }}
              />
            ) : altsData ? (
              <View style={{ gap: 16 }}>
                {/* Nivel 1 */}
                <View>
                  <Text style={[styles.sectionTitle, { color: '#10b981' }]}>
                    🟢 Nivel 1: Muy Similares ({altsData.verySimilar.length})
                  </Text>
                  <Text style={[styles.placeMeta, { marginBottom: 8 }]}>
                    Misma categoría, cercanía geográfica (&lt; 2.5 km) y duración equivalente.
                  </Text>
                  {altsData.verySimilar.map((alt) => (
                    <View
                      key={alt.placeId}
                      style={[
                        styles.placeCard,
                        { borderColor: '#10b981', borderWidth: 1, padding: 12, marginBottom: 8 },
                      ]}
                    >
                      <Text style={styles.placeName}>{alt.placeName}</Text>
                      <Text style={styles.placeMeta}>
                        📍 {(alt.distanceMetersFromOriginal / 1000).toFixed(1)} km • ⏱️ {alt.estimatedDurationMins}m • 💰 ${alt.estimatedCost}
                      </Text>
                      <Text style={[styles.placeReason, { color: '#10b981', marginTop: 4 }]}>
                        {alt.explanation}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Nivel 2 */}
                <View>
                  <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>
                    🟡 Nivel 2: Experiencias Relacionadas ({altsData.relatedExperiences.length})
                  </Text>
                  <Text style={[styles.placeMeta, { marginBottom: 8 }]}>
                    Experiencias complementarias en la misma zona (&lt; 6 km).
                  </Text>
                  {altsData.relatedExperiences.map((alt) => (
                    <View
                      key={alt.placeId}
                      style={[
                        styles.placeCard,
                        { borderColor: '#f59e0b', borderWidth: 1, padding: 12, marginBottom: 8 },
                      ]}
                    >
                      <Text style={styles.placeName}>{alt.placeName}</Text>
                      <Text style={styles.placeMeta}>
                        📍 {(alt.distanceMetersFromOriginal / 1000).toFixed(1)} km • ⏱️ {alt.estimatedDurationMins}m
                      </Text>
                      <Text style={[styles.placeReason, { color: '#f59e0b', marginTop: 4 }]}>
                        {alt.explanation}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Nivel 3 */}
                <View>
                  <Text style={[styles.sectionTitle, { color: '#f97316' }]}>
                    🟠 Nivel 3: Requiere Ajustes ({altsData.requiresAdjustments.length})
                  </Text>
                  <Text style={[styles.placeMeta, { marginBottom: 8 }]}>
                    Opciones que implican mayor tiempo de viaje o reprogramación.
                  </Text>
                  {altsData.requiresAdjustments.slice(0, 3).map((alt) => (
                    <View
                      key={alt.placeId}
                      style={[
                        styles.placeCard,
                        { borderColor: '#f97316', borderWidth: 1, padding: 12, marginBottom: 8 },
                      ]}
                    >
                      <Text style={styles.placeName}>{alt.placeName}</Text>
                      <Text style={styles.placeMeta}>
                        📍 {(alt.distanceMetersFromOriginal / 1000).toFixed(1)} km
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* MODAL: Ajustar Horario y Reorganización Inteligente (Fase 6) */}
      <Modal
        visible={modifyingItem !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModifyingItem(null)}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.topBar}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>⏱️ Ajustar Horario</Text>
                <Text style={styles.headerSub}>
                  {modifyingItem?.customTitle ?? modifyingItem?.placeName}
                </Text>
              </View>
              <Pressable
                onPress={() => setModifyingItem(null)}
                style={styles.switchBtn}
              >
                <Text style={styles.switchBtnText}>Cancelar</Text>
              </Pressable>
            </View>

            <View style={[styles.placeCard, { padding: 16, gap: 12 }]}>
              <Text style={{ color: '#cbd5e1', fontSize: 13 }}>Nueva Hora de Inicio (HH:MM):</Text>
              <TextInput
                value={newStartTime}
                onChangeText={setNewStartTime}
                style={[styles.searchInput, { paddingHorizontal: 12 }]}
                placeholder="11:00"
                placeholderTextColor="#64748b"
              />

              <Text style={{ color: '#cbd5e1', fontSize: 13 }}>Duración (minutos):</Text>
              <TextInput
                value={String(newDuration)}
                onChangeText={(v) => setNewDuration(Number(v) || 60)}
                keyboardType="numeric"
                style={[styles.searchInput, { paddingHorizontal: 12 }]}
                placeholder="60"
                placeholderTextColor="#64748b"
              />

              <Pressable
                onPress={handlePreviewReorgMobile}
                style={[styles.surpriseButton, { alignItems: 'center', marginTop: 8 }]}
              >
                <Text style={styles.surpriseButtonText}>
                  🔍 Calcular Impacto en Actividades Posteriores
                </Text>
              </Pressable>

              {reorgPreview && (
                <View
                  style={{
                    backgroundColor: '#0f172a',
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: reorgPreview.scheduleOverflowsDay ? '#ef4444' : '#38bdf8',
                    marginTop: 8,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 13 }}>
                    {reorgPreview.requiresApproval
                      ? '⚠️ Impacto detectado en el itinerario'
                      : '✅ Horarios compatibles'}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                    {reorgPreview.reason}
                  </Text>
                  {reorgPreview.scheduleOverflowsDay && (
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>
                      {reorgPreview.recommendationMessage}
                    </Text>
                  )}
                  {reorgPreview.shiftedItems.map((sh) => (
                    <Text key={sh.itemId} style={{ color: '#38bdf8', fontSize: 12 }}>
                      • {sh.placeName}: {sh.originalStartTime} ➔ {sh.proposedStartTime} (+{sh.shiftMinutes}m)
                    </Text>
                  ))}

                  <Pressable
                    onPress={handleApplyReorgMobile}
                    style={[styles.surpriseButton, { backgroundColor: '#10b981', marginTop: 12, alignItems: 'center' }]}
                  >
                    <Text style={styles.surpriseButtonText}>
                      ✅ Confirmar y Aplicar Cambios
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
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

                {/* FASE 5: Experiencia Propia y Verificación de Visita */}
                <View style={styles.experienceCard}>
                  <View style={styles.experienceCardHeader}>
                    <Text style={styles.experienceCardTitle}>🚀 Experiencia Propia</Text>
                    {activeActivity?.isVerifiedVisit ? (
                      <View style={styles.verifiedVisitBadge}>
                        <Text style={styles.verifiedVisitBadgeText}>✓ Visita Verificada</Text>
                      </View>
                    ) : null}
                  </View>

                  {!activeActivity ? (
                    <Pressable
                      onPress={() => void handleStartActivity()}
                      style={styles.startActivityBtn}
                    >
                      <Text style={styles.startActivityBtnText}>
                        ▶ Comenzar actividad en este lugar
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.activeActivityBox}>
                      <Text style={styles.activeActivityTitle}>
                        📍 En curso: {activeActivity.activityTitle}
                      </Text>
                      <Text style={styles.activeActivitySub}>
                        Estado: {activeActivity.isVerifiedVisit ? 'Verificada con GPS' : 'Sin verificar presencia'}
                      </Text>

                      <View style={styles.activityActionsRow}>
                        {!activeActivity.isVerifiedVisit ? (
                          <Pressable
                            onPress={() => void handleVerifyProximity()}
                            style={styles.verifyGpsBtn}
                          >
                            <Text style={styles.verifyGpsBtnText}>📍 Verificar visita (GPS)</Text>
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => setShowFeedbackModal(true)}
                          style={styles.finishExperienceBtn}
                        >
                          <Text style={styles.finishExperienceBtnText}>✅ Finalizar y Calificar</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {experienceNotice ? (
                    <Text style={styles.experienceNoticeText}>{experienceNotice}</Text>
                  ) : null}
                </View>

                {/* FASE 5: Modal de Reseña Corta Adaptada */}
                {showFeedbackModal ? (
                  <View style={styles.feedbackFormBox}>
                    <Text style={styles.feedbackTitle}>
                      {placeDetail.categorySlug === 'comida'
                        ? '🍽️ Reseña rápida de Restaurante'
                        : '🌄 Reseña rápida de Turismo'}
                    </Text>
                    <Text style={styles.feedbackSubtitle}>
                      Sin formularios largos: comparte lo esencial para enriquecer el ranking.
                    </Text>

                    <Text style={styles.feedbackLabel}>Calificación general:</Text>
                    <View style={styles.aspectsRow}>
                      {[1, 2, 3, 4, 5].map((val) => (
                        <Pressable
                          key={val}
                          onPress={() => setFeedbackRating(val)}
                          style={[
                            styles.positiveAspectChip,
                            feedbackRating === val && { backgroundColor: '#38bdf8' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.positiveAspectText,
                              feedbackRating === val && { color: '#0b1120', fontWeight: '700' },
                            ]}
                          >
                            ⭐ {val}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.feedbackLabel}>
                      {placeDetail.categorySlug === 'comida' ? 'Plato recomendado:' : 'Consejo clave para otros:'}
                    </Text>
                    <TextInput
                      style={styles.feedbackInput}
                      placeholder={
                        placeDetail.categorySlug === 'comida'
                          ? 'Ej. Burrata Pizza Slice'
                          : 'Ej. Llevar abrigo para el atardecer'
                      }
                      placeholderTextColor="#64748b"
                      value={feedbackRecommended}
                      onChangeText={setFeedbackRecommended}
                    />

                    <Text style={styles.feedbackLabel}>Comentario breve:</Text>
                    <TextInput
                      style={[styles.feedbackInput, { height: 60 }]}
                      placeholder="¿Qué tal la experiencia?"
                      placeholderTextColor="#64748b"
                      multiline
                      value={feedbackComment}
                      onChangeText={setFeedbackComment}
                    />

                    <View style={styles.feedbackActionsRow}>
                      <Pressable
                        onPress={() => setShowFeedbackModal(false)}
                        style={styles.feedbackCancelBtn}
                      >
                        <Text style={styles.feedbackCancelText}>Cancelar</Text>
                      </Pressable>
                      <Pressable
                        disabled={feedbackSubmitting}
                        onPress={() => void handleCompleteExperience()}
                        style={styles.feedbackSubmitBtn}
                      >
                        <Text style={styles.feedbackSubmitText}>
                          {feedbackSubmitting ? 'Enviando…' : 'Publicar'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {/* FASE 5: Opiniones de la Comunidad Exploro */}
                {placeReviews.length > 0 ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Opiniones de la Comunidad ({placeReviews.length})
                    </Text>
                    {placeReviews.map((rev) => (
                      <View key={rev.id} style={styles.communityReviewItem}>
                        <View style={styles.reviewHeaderRow}>
                          <Text style={styles.reviewAuthor}>{rev.userName || 'Viajero Exploro'}</Text>
                          <View
                            style={
                              rev.isVerifiedVisit
                                ? styles.reviewVerifiedChip
                                : styles.reviewNativeChip
                            }
                          >
                            <Text style={styles.reviewChipText}>
                              {rev.isVerifiedVisit ? '✓ Visita Verificada' : 'Opinión Nativa'}
                            </Text>
                          </View>
                        </View>
                        {rev.recommendedItem ? (
                          <Text style={styles.reviewRecommendedText}>
                            ✨ Recomendado: {rev.recommendedItem}
                          </Text>
                        ) : null}
                        {rev.comment ? (
                          <Text style={styles.reviewCommentText}>"{rev.comment}"</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

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
  // FASE 5: Estilos de Experiencias Propias
  experienceCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
    padding: 14,
    marginTop: 14,
    gap: 8,
  },
  experienceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  experienceCardTitle: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  verifiedVisitBadge: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  verifiedVisitBadgeText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  startActivityBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  startActivityBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  activeActivityBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  activeActivityTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  activeActivitySub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  activityActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  verifyGpsBtn: {
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  verifyGpsBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  finishExperienceBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  finishExperienceBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  experienceNoticeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontStyle: 'italic',
  },
  feedbackFormBox: {
    backgroundColor: '#131c31',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    padding: 12,
    marginTop: 10,
    gap: 6,
  },
  feedbackTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
  },
  feedbackLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  feedbackInput: {
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    color: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  feedbackActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  feedbackCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  feedbackCancelText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  feedbackSubmitBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  feedbackSubmitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  communityReviewItem: {
    backgroundColor: '#131c31',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 4,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewVerifiedChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reviewNativeChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reviewChipText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '600',
  },
  reviewRecommendedText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  reviewCommentText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontStyle: 'italic',
  },
});

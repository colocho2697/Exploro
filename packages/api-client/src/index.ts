import {
  ActivityAlternativeOptionDTO,
  ActivityLogDTO,
  AdminFeatureFlagDTO,
  AdminStatsDTO,
  AdminUserDTO,
  AiFinOpsMetrics,
  AiModelConfigDTO,
  ApiResponse,
  AppBootstrapConfig,
  AuditLogDTO,
  AuthSessionResponse,
  AutocompleteSuggestion,
  CategoryDTO,
  CityDTO,
  CollectionDTO,
  ContentReportDTO,
  DestinationDTO,
  DuplicateCandidateDTO,
  EvidenceSummaryDTO,
  FavoriteItemDTO,
  GeoAddress,
  HealthStatusResponse,
  PlaceCardDTO,
  PlaceDetailDTO,
  PlaceRecommendationSummary,
  ProcessingErrorDTO,
  RecalculateAspectsResponse,
  RouteSummary,
  SourceDTO,
  SourceSyncResult,
  SurpriseMeResponse,
  TripDTO,
  TripItemDTO,
  TripReorganizationImpactDTO,
  UserProfile,
  UserReviewDTO,
  VerifyVisitResponse,
} from '@exploro/shared-types';
import {
  AdminUpdatePlaceInput,
  ApplyReorganizationInput,
  AssistedPlanRequestInput,
  CompleteActivityReviewInput,
  CreateCollectionInput,
  CreateEvidenceInput,
  CreateReportInput,
  CreateSourceInput,
  CreateTripInput,
  CreateTripItemInput,
  DetectDuplicatesQueryInput,
  DiscoverPlacesQueryInput,
  GeoAutocompleteQueryInput,
  GeoRouteInput,
  LoginInput,
  ModerateContentInput,
  RegisterInput,
  ReorderTripItemsInput,
  ResolveReportInput,
  StartActivityInput,
  SurpriseMeRequestInput,
  UpdateFeatureFlagInput,
  UpdatePreferencesInput,
  UpdateTripInput,
  UpdateTripItemInput,
  UpdateUserRoleInput,
  VerifyVisitInput,
} from '@exploro/validation';

export interface ExploroApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export class ExploroApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, statusCode: number, errorCode = 'API_ERROR') {
    super(message);
    this.name = 'ExploroApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class ExploroApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: () => string | null | Promise<string | null>;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders?: Record<string, string>;

  constructor(options: ExploroApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.getAccessToken = options.getAccessToken;
    const customFetch = options.fetchImpl;
    this.fetchImpl = customFetch
      ? (input: RequestInfo | URL, init?: RequestInit) => customFetch(input, init)
      : (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init);
    this.defaultHeaders = options.defaultHeaders;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(this.defaultHeaders ?? {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    };

    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const payload = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !payload.success) {
      throw new ExploroApiError(
        payload?.error?.message ?? `HTTP Error ${response.status}`,
        response.status,
        payload?.error?.code ?? 'HTTP_ERROR'
      );
    }

    return payload;
  }

  public async getHealth(): Promise<HealthStatusResponse> {
    const res = await this.request<HealthStatusResponse>('/health');
    return res.data;
  }

  public async getBootstrapConfig(): Promise<AppBootstrapConfig> {
    const res = await this.request<AppBootstrapConfig>('/config/bootstrap');
    return res.data;
  }

  public async getCategories(): Promise<CategoryDTO[]> {
    const res = await this.request<CategoryDTO[]>('/categories');
    return res.data;
  }

  public async getCities(countryIso = 'US'): Promise<CityDTO[]> {
    const res = await this.request<CityDTO[]>(
      `/destinations/cities?country=${encodeURIComponent(countryIso)}`
    );
    return res.data;
  }

  public async getDestinations(citySlug?: string): Promise<DestinationDTO[]> {
    const query = citySlug ? `?citySlug=${encodeURIComponent(citySlug)}` : '';
    const res = await this.request<DestinationDTO[]>(`/destinations${query}`);
    return res.data;
  }

  public async discoverPlaces(
    params: Partial<DiscoverPlacesQueryInput> = {}
  ): Promise<ApiResponse<PlaceCardDTO[]>> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return this.request<PlaceCardDTO[]>(
      `/discover/places${qs ? `?${qs}` : ''}`
    );
  }

  public async getPlaceBySlug(slugOrId: string): Promise<PlaceDetailDTO> {
    const res = await this.request<PlaceDetailDTO>(
      `/places/${encodeURIComponent(slugOrId)}`
    );
    return res.data;
  }

  public async register(input: RegisterInput): Promise<AuthSessionResponse> {
    const res = await this.request<AuthSessionResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  public async login(input: LoginInput): Promise<AuthSessionResponse> {
    const res = await this.request<AuthSessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  public async logoutRequest(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  public async getMyProfile(): Promise<UserProfile> {
    const res = await this.request<UserProfile>('/users/me');
    return res.data;
  }

  public async surpriseMe(
    input: Partial<SurpriseMeRequestInput> = {}
  ): Promise<SurpriseMeResponse> {
    const res = await this.request<SurpriseMeResponse>('/discover/surprise-me', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  public async listFavorites(): Promise<FavoriteItemDTO[]> {
    return (await this.request<FavoriteItemDTO[]>('/favorites')).data;
  }

  public async addFavorite(placeId: string): Promise<void> {
    await this.request(`/favorites/${encodeURIComponent(placeId)}`, {
      method: 'POST',
    });
  }

  public async removeFavorite(placeId: string): Promise<void> {
    await this.request(`/favorites/${encodeURIComponent(placeId)}`, {
      method: 'DELETE',
    });
  }

  public async listCollections(): Promise<CollectionDTO[]> {
    return (await this.request<CollectionDTO[]>('/collections')).data;
  }

  public async createCollection(
    input: Partial<CreateCollectionInput> & { name: string }
  ): Promise<CollectionDTO> {
    return (
      await this.request<CollectionDTO>('/collections', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data;
  }

  public async getCollection(id: string): Promise<CollectionDTO> {
    return (
      await this.request<CollectionDTO>(`/collections/${encodeURIComponent(id)}`)
    ).data;
  }

  public async deleteCollection(id: string): Promise<void> {
    await this.request(`/collections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  public async addCollectionItem(
    collectionId: string,
    placeId: string
  ): Promise<CollectionDTO> {
    return (
      await this.request<CollectionDTO>(
        `/collections/${encodeURIComponent(collectionId)}/items`,
        { method: 'POST', body: JSON.stringify({ placeId }) }
      )
    ).data;
  }

  public async removeCollectionItem(
    collectionId: string,
    placeId: string
  ): Promise<CollectionDTO> {
    return (
      await this.request<CollectionDTO>(
        `/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(placeId)}`,
        { method: 'DELETE' }
      )
    ).data;
  }

  public async updateMyPreferences(
    input: UpdatePreferencesInput
  ): Promise<UserProfile> {
    const res = await this.request<UserProfile>('/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  // -------------------------------------------------------------------------
  // FASE 3: Servicios Geográficos, Fuentes y Evidencias
  // -------------------------------------------------------------------------

  public async geoAutocomplete(
    params: GeoAutocompleteQueryInput
  ): Promise<AutocompleteSuggestion[]> {
    const sp = new URLSearchParams();
    sp.set('q', params.q);
    if (params.citySlug) sp.set('citySlug', params.citySlug);
    if (params.lat !== undefined) sp.set('lat', String(params.lat));
    if (params.lng !== undefined) sp.set('lng', String(params.lng));
    if (params.limit !== undefined) sp.set('limit', String(params.limit));

    const res = await this.request<AutocompleteSuggestion[]>(
      `/geo/autocomplete?${sp.toString()}`
    );
    return res.data;
  }

  public async geoReverse(lat: number, lng: number): Promise<GeoAddress> {
    const res = await this.request<GeoAddress>(
      `/geo/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    );
    return res.data;
  }

  public async geoCalculateRoute(input: GeoRouteInput): Promise<RouteSummary> {
    const res = await this.request<RouteSummary>('/geo/route', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  public async listSources(): Promise<SourceDTO[]> {
    const res = await this.request<SourceDTO[]>('/sources');
    return res.data;
  }

  public async createSource(input: CreateSourceInput): Promise<SourceDTO> {
    const res = await this.request<SourceDTO>('/sources', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  public async syncSource(sourceId: string): Promise<SourceSyncResult> {
    const res = await this.request<SourceSyncResult>(
      `/sources/${encodeURIComponent(sourceId)}/sync`,
      { method: 'POST' }
    );
    return res.data;
  }

  public async listPlaceEvidences(
    placeId: string
  ): Promise<EvidenceSummaryDTO[]> {
    const res = await this.request<EvidenceSummaryDTO[]>(
      `/places/${encodeURIComponent(placeId)}/evidences`
    );
    return res.data;
  }

  public async createEvidence(
    input: CreateEvidenceInput
  ): Promise<EvidenceSummaryDTO> {
    const res = await this.request<EvidenceSummaryDTO>('/evidences', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  }

  public async detectDuplicates(
    params: Partial<DetectDuplicatesQueryInput> = {}
  ): Promise<DuplicateCandidateDTO[]> {
    const sp = new URLSearchParams();
    if (params.placeId) sp.set('placeId', params.placeId);
    if (params.radiusMeters) sp.set('radiusMeters', String(params.radiusMeters));
    if (params.similarityThreshold)
      sp.set('similarityThreshold', String(params.similarityThreshold));

    const qs = sp.toString();
    const res = await this.request<DuplicateCandidateDTO[]>(
      `/normalization/duplicates${qs ? `?${qs}` : ''}`
    );
    return res.data;
  }

  // -------------------------------------------------------------------------
  // FASE 4: Motor de Inteligencia, Recomendaciones y Métricas
  // -------------------------------------------------------------------------

  public async getPlaceRecommendationSummary(
    placeId: string
  ): Promise<PlaceRecommendationSummary> {
    const res = await this.request<PlaceRecommendationSummary>(
      `/places/${encodeURIComponent(placeId)}/recommendation-summary`
    );
    return res.data;
  }

  public async recalculatePlaceAspects(
    placeId: string,
    forceRefresh = false
  ): Promise<RecalculateAspectsResponse> {
    const res = await this.request<RecalculateAspectsResponse>(
      `/places/${encodeURIComponent(placeId)}/recalculate-aspects`,
      {
        method: 'POST',
        body: JSON.stringify({ forceRefresh }),
      }
    );
    return res.data;
  }

  public async getAiMetrics(): Promise<AiFinOpsMetrics> {
    const res = await this.request<AiFinOpsMetrics>('/ai/metrics');
    return res.data;
  }

  // -------------------------------------------------------------------------
  // FASE 5: Experiencias Propias, Verificación y Opiniones Adaptadas
  // -------------------------------------------------------------------------

  public async startActivity(data: StartActivityInput): Promise<ActivityLogDTO> {
    const res = await this.request<ActivityLogDTO>('/experiences/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async getActiveActivity(): Promise<ActivityLogDTO | null> {
    const res = await this.request<ActivityLogDTO | null>('/experiences/active');
    return res.data;
  }

  public async verifyActivityVisit(
    activityId: string,
    data: VerifyVisitInput
  ): Promise<VerifyVisitResponse> {
    const res = await this.request<VerifyVisitResponse>(
      `/experiences/${encodeURIComponent(activityId)}/verify-visit`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async completeActivityWithReview(
    activityId: string,
    data: CompleteActivityReviewInput
  ): Promise<UserReviewDTO> {
    const res = await this.request<UserReviewDTO>(
      `/experiences/${encodeURIComponent(activityId)}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async getPlaceReviews(
    placeId: string,
    limit = 20
  ): Promise<UserReviewDTO[]> {
    const res = await this.request<UserReviewDTO[]>(
      `/places/${encodeURIComponent(placeId)}/reviews?limit=${limit}`
    );
    return res.data;
  }

  // -------------------------------------------------------------------------
  // FASE 6: Planificador de Viajes (Oculto bajo Feature Flag)
  // -------------------------------------------------------------------------

  public async createTrip(data: CreateTripInput): Promise<TripDTO> {
    const res = await this.request<TripDTO>('/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async listTrips(): Promise<TripDTO[]> {
    const res = await this.request<TripDTO[]>('/trips');
    return res.data;
  }

  public async getTripById(id: string): Promise<TripDTO> {
    const res = await this.request<TripDTO>(`/trips/${encodeURIComponent(id)}`);
    return res.data;
  }

  public async updateTrip(
    id: string,
    data: UpdateTripInput
  ): Promise<TripDTO> {
    const res = await this.request<TripDTO>(`/trips/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async deleteTrip(
    id: string
  ): Promise<{ success: boolean; id: string }> {
    const res = await this.request<{ success: boolean; id: string }>(
      `/trips/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  }

  public async createTripItem(
    tripId: string,
    dayId: string,
    data: CreateTripItemInput
  ): Promise<TripItemDTO> {
    const res = await this.request<TripItemDTO>(
      `/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/items`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async updateTripItem(
    tripId: string,
    itemId: string,
    data: UpdateTripItemInput
  ): Promise<TripItemDTO> {
    const res = await this.request<TripItemDTO>(
      `/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async deleteTripItem(
    tripId: string,
    itemId: string
  ): Promise<{ success: boolean; id: string }> {
    const res = await this.request<{ success: boolean; id: string }>(
      `/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  }

  public async reorderTripItems(
    tripId: string,
    dayId: string,
    data: ReorderTripItemsInput
  ): Promise<TripItemDTO[]> {
    const res = await this.request<TripItemDTO[]>(
      `/trips/${encodeURIComponent(tripId)}/days/${encodeURIComponent(dayId)}/reorder`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async generateAssistedPlan(
    data: AssistedPlanRequestInput
  ): Promise<TripDTO> {
    const res = await this.request<TripDTO>('/trips/assisted-plan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async getActivityAlternatives(
    tripId: string,
    itemId: string,
    flexibilityMinutes?: number
  ): Promise<{
    verySimilar: ActivityAlternativeOptionDTO[];
    relatedExperiences: ActivityAlternativeOptionDTO[];
    requiresAdjustments: ActivityAlternativeOptionDTO[];
  }> {
    const qs = flexibilityMinutes !== undefined ? `?flexibilityMinutes=${flexibilityMinutes}` : '';
    const res = await this.request<{
      verySimilar: ActivityAlternativeOptionDTO[];
      relatedExperiences: ActivityAlternativeOptionDTO[];
      requiresAdjustments: ActivityAlternativeOptionDTO[];
    }>(
      `/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}/alternatives${qs}`
    );
    return res.data;
  }

  public async previewReorganization(
    tripId: string,
    itemId: string,
    data: { newStartTime: string; newDurationMinutes: number }
  ): Promise<TripReorganizationImpactDTO> {
    const res = await this.request<TripReorganizationImpactDTO>(
      `/trips/${encodeURIComponent(tripId)}/items/${encodeURIComponent(itemId)}/reorganize-preview`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async applyReorganization(
    tripId: string,
    data: ApplyReorganizationInput
  ): Promise<{ success: boolean; updatedCount: number }> {
    const res = await this.request<{ success: boolean; updatedCount: number }>(
      `/trips/${encodeURIComponent(tripId)}/apply-reorganization`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  // -------------------------------------------------------------------------
  // FASE 7: Administración, Control y Auditoría Inmutable
  // -------------------------------------------------------------------------

  public async getAdminStats(): Promise<AdminStatsDTO> {
    const res = await this.request<AdminStatsDTO>('/admin/stats');
    return res.data;
  }

  public async listAuditLogs(query?: {
    entityType?: string;
    actorUserId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogDTO[]> {
    const params = new URLSearchParams();
    if (query?.entityType) params.set('entityType', query.entityType);
    if (query?.actorUserId) params.set('actorUserId', query.actorUserId);
    if (query?.limit !== undefined) params.set('limit', String(query.limit));
    if (query?.offset !== undefined) params.set('offset', String(query.offset));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<AuditLogDTO[]>(`/admin/audit-logs${qs}`);
    return res.data;
  }

  public async listAdminUsers(): Promise<AdminUserDTO[]> {
    const res = await this.request<AdminUserDTO[]>('/admin/users');
    return res.data;
  }

  public async updateUserRole(
    userId: string,
    data: UpdateUserRoleInput
  ): Promise<AdminUserDTO> {
    const res = await this.request<AdminUserDTO>(
      `/admin/users/${encodeURIComponent(userId)}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async adminUpdatePlace(
    placeId: string,
    data: AdminUpdatePlaceInput
  ): Promise<PlaceDetailDTO> {
    const res = await this.request<PlaceDetailDTO>(
      `/admin/places/${encodeURIComponent(placeId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async moderateReview(
    reviewId: string,
    data: ModerateContentInput
  ): Promise<{ success: boolean; id: string; status: string }> {
    const res = await this.request<{ success: boolean; id: string; status: string }>(
      `/admin/moderation/review/${encodeURIComponent(reviewId)}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async moderateEvidence(
    evidenceId: string,
    data: ModerateContentInput
  ): Promise<{ success: boolean; id: string; status: string }> {
    const res = await this.request<{ success: boolean; id: string; status: string }>(
      `/admin/moderation/evidence/${encodeURIComponent(evidenceId)}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async listAdminFeatureFlags(): Promise<AdminFeatureFlagDTO[]> {
    const res = await this.request<AdminFeatureFlagDTO[]>('/admin/feature-flags');
    return res.data;
  }

  public async updateAdminFeatureFlag(
    key: string,
    data: UpdateFeatureFlagInput
  ): Promise<AdminFeatureFlagDTO> {
    const res = await this.request<AdminFeatureFlagDTO>(
      `/admin/feature-flags/${encodeURIComponent(key)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async createContentReport(
    data: CreateReportInput
  ): Promise<ContentReportDTO> {
    const res = await this.request<ContentReportDTO>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  public async listContentReports(query?: {
    status?: string;
  }): Promise<ContentReportDTO[]> {
    const qs = query?.status ? `?status=${encodeURIComponent(query.status)}` : '';
    const res = await this.request<ContentReportDTO[]>(`/admin/reports${qs}`);
    return res.data;
  }

  public async resolveContentReport(
    reportId: string,
    data: ResolveReportInput
  ): Promise<ContentReportDTO> {
    const res = await this.request<ContentReportDTO>(
      `/admin/reports/${encodeURIComponent(reportId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }

  public async listProcessingErrors(): Promise<ProcessingErrorDTO[]> {
    const res = await this.request<ProcessingErrorDTO[]>('/admin/errors');
    return res.data;
  }

  public async resolveProcessingError(
    errorId: string
  ): Promise<{ success: boolean; id: string }> {
    const res = await this.request<{ success: boolean; id: string }>(
      `/admin/errors/${encodeURIComponent(errorId)}/resolve`,
      {
        method: 'PATCH',
      }
    );
    return res.data;
  }

  public async listAiModelsConfig(): Promise<AiModelConfigDTO[]> {
    const res = await this.request<AiModelConfigDTO[]>('/admin/ai-models');
    return res.data;
  }

  public async updateAiModelConfig(
    taskType: string,
    data: { modelName: string; maxTokens?: number; temperature?: number; isActive?: boolean }
  ): Promise<AiModelConfigDTO> {
    const res = await this.request<AiModelConfigDTO>(
      `/admin/ai-models/${encodeURIComponent(taskType)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  }
}




import {
  ActivityLogDTO,
  AiFinOpsMetrics,
  ApiResponse,
  AppBootstrapConfig,
  AuthSessionResponse,
  AutocompleteSuggestion,
  CategoryDTO,
  CityDTO,
  CollectionDTO,
  DestinationDTO,
  DuplicateCandidateDTO,
  EvidenceSummaryDTO,
  FavoriteItemDTO,
  GeoAddress,
  HealthStatusResponse,
  PlaceCardDTO,
  PlaceDetailDTO,
  PlaceRecommendationSummary,
  RecalculateAspectsResponse,
  RouteSummary,
  SourceDTO,
  SourceSyncResult,
  SurpriseMeResponse,
  UserProfile,
  UserReviewDTO,
  VerifyVisitResponse,
} from '@exploro/shared-types';
import {
  CompleteActivityReviewInput,
  CreateCollectionInput,
  CreateEvidenceInput,
  CreateSourceInput,
  DetectDuplicatesQueryInput,
  DiscoverPlacesQueryInput,
  GeoAutocompleteQueryInput,
  GeoRouteInput,
  LoginInput,
  RegisterInput,
  StartActivityInput,
  SurpriseMeRequestInput,
  UpdatePreferencesInput,
  VerifyVisitInput,
} from '@exploro/validation';

export interface ExploroApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
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

  constructor(options: ExploroApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.getAccessToken = options.getAccessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
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
}



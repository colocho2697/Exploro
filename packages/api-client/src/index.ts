import {
  ApiResponse,
  AppBootstrapConfig,
  AuthSessionResponse,
  CategoryDTO,
  CityDTO,
  CollectionDTO,
  DestinationDTO,
  FavoriteItemDTO,
  HealthStatusResponse,
  PlaceCardDTO,
  PlaceDetailDTO,
  SurpriseMeResponse,
  UserProfile,
} from '@exploro/shared-types';
import {
  CreateCollectionInput,
  DiscoverPlacesQueryInput,
  LoginInput,
  RegisterInput,
  SurpriseMeRequestInput,
  UpdatePreferencesInput,
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
}


/**
 * @exploro/shared-types
 * Modelos, tipos de dominio, enums y contratos de API compartidos entre
 * móvil (React Native + Expo), web (Next.js), admin y backend (NestJS).
 */

export type UserRole = 'TRAVELER' | 'MODERATOR' | 'ADMIN';

/**
 * Modalidad de uso en la pantalla inicial.
 * En la primera versión, únicamente 'TRAVELER' está habilitado funcionalmente;
 * 'LOCAL' se presenta visualmente como «Soy local (próximamente)».
 */
export type ExplorationMode = 'TRAVELER' | 'LOCAL';

export type BudgetTier = 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'LUXURY' | 'UNKNOWN';

export type CompanionType = 'SOLO' | 'COUPLE' | 'FAMILY' | 'FRIENDS';

export type TravelStyle =
  | 'FAMILIAR'
  | 'AVENTURERO'
  | 'NATURALEZA'
  | 'ROMANTICO'
  | 'INDIVIDUAL'
  | 'DESCANSO_Y_LUJO'
  | 'GASTRONOMICO'
  | 'CULTURAL';

export type CategorySlug =
  | 'comida'
  | 'turismo'
  | 'entretenimiento'
  | 'actividades'
  | 'eventos'
  | 'compras';

export type TourismSubcategorySlug =
  | 'miradores'
  | 'monumentos'
  | 'naturaleza'
  | 'museos'
  | 'cultura'
  | 'pueblos-y-ciudades'
  | 'lugares-emblematicos';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'COMMUNITY_VERIFIED'
  | 'VERIFIED'
  | 'DISPUTED';

/**
 * Principio #1 y #2: Nunca mostrar datos inventados.
 * Si falta información verificada, se indica explícitamente su estado.
 */
export type DataAvailabilityStatus =
  | 'CONFIRMED'
  | 'UNVERIFIED'
  | 'INSUFFICIENT_DATA';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * recommended: puntaje de evidencias (+ personalización si está activa).
 * distance: distancia real calculada por PostGIS (requiere coordenadas).
 * name: orden alfabético.
 */
export type PlaceSortBy = 'recommended' | 'distance' | 'name';

export type SourceType =
  | 'EXTERNAL_COMMUNITY'
  | 'BLOG'
  | 'NATIVE_EXPERIENCE'
  | 'CURATED';

export type EvidenceType = 'OPINION' | 'GUIDE' | 'REVIEW' | 'MENTION';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ModeDescriptor {
  mode: ExplorationMode;
  label: string;
  subtitle: string;
  enabled: boolean;
  badgeText?: string;
}

export interface AppBootstrapConfig {
  appName: string;
  version: string;
  defaultCountryIso: string;
  defaultCurrency: string;
  modes: ModeDescriptor[];
  featureFlags: {
    localModeEnabled: boolean;
    tripPlannerEnabled: boolean;
  };
  geoProvider: {
    provider: 'osm_free' | 'google_maps';
    mapStyleUrl: string;
    costPolicy: 'ZERO_COST';
  };
}

export interface UserPreferences {
  id: string;
  userId: string;
  personalizationEnabled: boolean;
  preferredMode: ExplorationMode;
  budgetTier: BudgetTier;
  favoriteCategories: CategorySlug[];
  travelStyles: TravelStyle[];
  companionDefault: CompanionType;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  preferences: UserPreferences;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AuthSessionResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface CountryDTO {
  id: string;
  isoCode: string;
  name: string;
  currencyCode: string;
}

export interface CityDTO {
  id: string;
  countryId: string;
  countryIsoCode: string;
  name: string;
  stateCode?: string;
  slug: string;
  center: Coordinates;
}

export interface DestinationDTO {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  description: string;
  center: Coordinates;
  isFeatured: boolean;
}

export interface SubcategoryDTO {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CategoryDTO {
  id: string;
  slug: CategorySlug | string;
  name: string;
  description: string;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
  subcategories: SubcategoryDTO[];
}

export interface EvidenceSummaryDTO {
  id: string;
  sourceCode: string;
  sourceName: string;
  sourceType: SourceType;
  externalUrl: string | null;
  extractedSnippet: string;
  evidenceType: EvidenceType;
  confidenceScore: number;
  publishedAt: string | null;
  capturedAt: string;
}

export interface PlaceScoreSummary {
  overallScore: number;
  confidenceLevel: ConfidenceLevel;
  totalIndependentEvidences: number;
  totalNativeReviews: number;
  sourceDiversityCount: number;
  aiExplanationEs: string | null;
  explanationStatus: DataAvailabilityStatus;
  topPositiveAspects: string[];
  topNegativeAspects: string[];
}

/**
 * Tarjeta de recomendación (Paso 2.4):
 * Nunca inventa datos; indica explícitamente cuando el precio o la razón tienen datos limitados.
 */
export interface PlaceCardDTO {
  id: string;
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  subcategorySlug: string | null;
  subcategoryName: string | null;
  cityName: string;
  stateCode: string | null;
  addressText: string | null;
  coordinates: Coordinates;
  distanceMeters: number | null;
  imageUrl: string | null;
  priceTier: BudgetTier;
  avgPriceMin: number | null;
  avgPriceMax: number | null;
  currencyCode: string;
  priceStatus: DataAvailabilityStatus;
  scheduleStatus: DataAvailabilityStatus;
  verificationStatus: VerificationStatus;
  recommendationReason: string;
  recommendationCount: number;
  confidenceLevel: ConfidenceLevel;
  tags: string[];
  /** true cuando el registro es de demostración y no proviene de evidencia real. */
  isDemoData: boolean;
}

export interface SurpriseSuggestionDTO {
  place: PlaceCardDTO;
  matchScore: number;
  /** CONFIRMED solo si el precio del lugar está verificado dentro del presupuesto. */
  budgetFit: DataAvailabilityStatus;
  /** CONFIRMED solo si existe una duración conocida de la actividad. */
  timeFit: DataAvailabilityStatus;
  estimatedTravelMinutes: number | null;
  reasons: string[];
}

export interface SurpriseMeResponse {
  suggestions: SurpriseSuggestionDTO[];
  personalizationApplied: boolean;
  notice: string | null;
}

export interface EstablishmentDetailsDTO {
  openingHours: Record<string, string> | null;
  phone: string | null;
  websiteUrl: string | null;
  specialties: string[];
  acceptsReservations: boolean | null;
}

export interface ActivityDetailsDTO {
  id: string;
  title: string;
  description: string;
  estimatedDurationMins: number | null;
  estimatedCost: number | null;
  accessibilityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  bestTimeOfDay: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ANY';
}

export interface PlaceDetailDTO extends PlaceCardDTO {
  establishment: EstablishmentDetailsDTO | null;
  activities: ActivityDetailsDTO[];
  scoreSummary: PlaceScoreSummary;
  evidences: EvidenceSummaryDTO[];
}

export interface FavoriteItemDTO {
  id: string;
  placeId: string;
  createdAt: string;
  place: PlaceCardDTO;
}

export interface CollectionDTO {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
  places?: PlaceCardDTO[];
}

export interface HealthStatusResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  services: {
    api: 'up';
    databasePostgis: 'up' | 'down';
    redis: 'up' | 'down';
    aiEngine: 'up' | 'down';
  };
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  personalizationApplied?: boolean;
  sortApplied?: PlaceSortBy;
  evidenceCoverage?: ConfidenceLevel;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// FASE 3: Contratos Geográficos (Mapas, Autocomplete, Rutas sin costo)
// ---------------------------------------------------------------------------

export interface AutocompleteSuggestion {
  id: string;
  title: string;
  subtitle: string;
  placeId?: string;
  city?: string;
  coordinates: Coordinates;
  type: 'place' | 'city' | 'address';
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteSummary {
  distanceMeters: number;
  distanceMiles: number;
  durationMinutes: number;
  mode: 'driving' | 'walking';
  geometryGeoJSON?: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
  steps: RouteStep[];
}

export interface GeoAddress {
  formatted: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

// ---------------------------------------------------------------------------
// FASE 3: Sistema de Fuentes, Evidencias y Deduplicación
// ---------------------------------------------------------------------------

export type SourceSyncStatus = 'SUCCESS' | 'RATE_LIMITED' | 'ERROR' | 'IDLE';

export interface SourceDTO {
  id: string;
  code: string;
  name: string;
  sourceType: SourceType;
  baseTrustWeight: number;
  isActive: boolean;
  feedUrl?: string | null;
  lastSyncedAt?: string | null;
  totalEvidencesCount?: number;
  createdAt: string;
}

export interface SourceSyncResult {
  sourceId: string;
  sourceCode: string;
  status: SourceSyncStatus;
  itemsFetched: number;
  evidencesIngested: number;
  duplicatesSkipped: number;
  message?: string;
}

export interface CreateSourceDTO {
  code: string;
  name: string;
  sourceType: SourceType;
  baseTrustWeight?: number;
  feedUrl?: string;
}

export interface CreateEvidenceDTO {
  placeId: string;
  sourceCode: string;
  externalUrl?: string | null;
  extractedSnippet: string;
  evidenceType?: EvidenceType;
  sentimentScore?: number;
  confidenceScore?: number;
  publishedAt?: string | null;
}

export interface DuplicateCandidateDTO {
  placeA: {
    id: string;
    name: string;
    slug: string;
    cityName: string;
    coordinates: Coordinates;
  };
  placeB: {
    id: string;
    name: string;
    slug: string;
    cityName: string;
    coordinates: Coordinates;
  };
  nameSimilarity: number;
  distanceMeters: number;
  action: 'AUTO_MERGE' | 'MANUAL_REVIEW' | 'DISTINCT';
  reason: string;
}

// ---------------------------------------------------------------------------
// FASE 4: Motor de Inteligencia y Recomendaciones
// ---------------------------------------------------------------------------

export type AspectPolarity = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface ExtractedAspectItem {
  aspect: string;
  category: string;
  polarity: AspectPolarity;
  mentionsCount: number;
  sampleQuotes: string[];
  confidence: number;
}

export interface ExtractAspectsRequest {
  categorySlug: string;
  snippets: string[];
}

export interface ExtractAspectsResponse {
  positiveAspects: ExtractedAspectItem[];
  negativeAspects: ExtractedAspectItem[];
  detectedPrices: string[];
  recommendedActivities: string[];
  tokensProcessed: number;
  costUsd: number;
}

export interface PlaceRecommendationSummary {
  placeId: string;
  overallScore: number;
  confidenceLevel: ConfidenceLevel;
  explanation: string;
  explanationStatus: DataAvailabilityStatus;
  topPositiveAspects: ExtractedAspectItem[];
  topNegativeAspects: ExtractedAspectItem[];
  sourceDiversityCount: number;
  independentCount: number;
  agreementRatio: number;
  factCheckPassed: boolean;
  costUsd: number;
  calculatedAt: string;
}

export interface RecalculateAspectsResponse {
  placeId: string;
  updatedScore: number;
  explanationStatus: DataAvailabilityStatus;
  positiveAspectsCount: number;
  negativeAspectsCount: number;
  evidencesProcessed: number;
}

export interface AiFinOpsMetrics {
  totalRequests: number;
  aspectsExtracted: number;
  explanationsGenerated: number;
  hallucinationsBlocked: number;
  totalCostUsd: number;
  averageLatencyMs: number;
  costPolicy: 'ZERO_COST_USD_0';
}




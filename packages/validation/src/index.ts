import { z } from 'zod';

export const explorationModeSchema = z.enum(['TRAVELER', 'LOCAL']);

export const budgetTierSchema = z.enum([
  'FREE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'LUXURY',
  'UNKNOWN',
]);

export const companionTypeSchema = z.enum([
  'SOLO',
  'COUPLE',
  'FAMILY',
  'FRIENDS',
]);

export const travelStyleSchema = z.enum([
  'FAMILIAR',
  'AVENTURERO',
  'NATURALEZA',
  'ROMANTICO',
  'INDIVIDUAL',
  'DESCANSO_Y_LUJO',
  'GASTRONOMICO',
  'CULTURAL',
]);

export const categorySlugSchema = z.enum([
  'comida',
  'turismo',
  'entretenimiento',
  'actividades',
  'eventos',
  'compras',
]);

export const coordinatesSchema = z.object({
  lat: z.number().min(-90, 'Latitud mínima -90').max(90, 'Latitud máxima 90'),
  lng: z
    .number()
    .min(-180, 'Longitud mínima -180')
    .max(180, 'Longitud máxima 180'),
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede superar 128 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
    .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  displayName: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre no puede superar 80 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(16, 'Token de refresco inválido'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(16, 'Token de recuperación inválido'),
  newPassword: registerSchema.shape.password,
});

export const updatePreferencesSchema = z.object({
  personalizationEnabled: z.boolean().optional(),
  budgetTier: budgetTierSchema.optional(),
  favoriteCategories: z.array(categorySlugSchema).optional(),
  travelStyles: z.array(travelStyleSchema).optional(),
  companionDefault: companionTypeSchema.optional(),
});

/**
 * Booleanos provenientes de query strings.
 * `z.coerce.boolean()` convierte "false" en true (cualquier cadena no vacía),
 * por lo que se interpreta explícitamente "true"/"false"/"1"/"0".
 */
const queryBoolean = (defaultValue: boolean) =>
  z
    .preprocess((value) => {
      if (value === 'true' || value === '1' || value === true) return true;
      if (value === 'false' || value === '0' || value === false) return false;
      return value;
    }, z.boolean())
    .default(defaultValue);

export const placeSortBySchema = z.enum(['recommended', 'distance', 'name']);

export const discoverPlacesQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.5).max(500).default(15),
  unbounded: queryBoolean(false),
  citySlug: z.string().trim().min(1).optional(),
  destinationSlug: z.string().trim().min(1).optional(),
  categorySlug: z.string().trim().min(1).optional(),
  subcategorySlug: z.string().trim().min(1).optional(),
  priceTier: budgetTierSchema.optional(),
  applyPreferences: queryBoolean(true),
  sortBy: placeSortBySchema.default('recommended'),
  searchQuery: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const surpriseMeRequestSchema = z.object({
  coordinates: coordinatesSchema.optional(),
  citySlug: z.string().trim().min(1).optional(),
  radiusKm: z.number().min(0.5).max(500).default(25),
  budgetTier: budgetTierSchema.default('MEDIUM'),
  availableMinutes: z.number().int().min(30).max(1440).default(180),
  companionType: companionTypeSchema.default('SOLO'),
  applyPreferences: z.boolean().default(true),
  seed: z.number().int().optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const addCollectionItemSchema = z.object({
  placeId: z.string().uuid('Identificador de lugar inválido'),
});

export const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre de la colección es muy corto')
    .max(80, 'El nombre de la colección es muy largo'),
  description: z.string().trim().max(300).optional(),
  isPublic: z.boolean().default(false),
});

export const sourceTypeSchema = z.enum([
  'EXTERNAL_COMMUNITY',
  'BLOG',
  'NATIVE_EXPERIENCE',
  'CURATED',
]);

export const evidenceTypeSchema = z.enum([
  'OPINION',
  'GUIDE',
  'REVIEW',
  'MENTION',
]);

export const routeModeSchema = z.enum(['driving', 'walking']);

export const geoAutocompleteQuerySchema = z.object({
  q: z.string().trim().min(1, 'El término de búsqueda es requerido').max(100),
  citySlug: z.string().trim().min(1).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const geoReverseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const geoRouteSchema = z.object({
  origin: coordinatesSchema,
  destination: coordinatesSchema,
  mode: routeModeSchema.default('driving'),
});

export const createSourceSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[A-Z0-9_]+$/, 'El código debe contener solo mayúsculas, números y guiones bajos'),
  name: z.string().trim().min(2).max(120),
  sourceType: sourceTypeSchema,
  baseTrustWeight: z.number().min(0.05).max(1.0).default(0.8),
  feedUrl: z.string().trim().url().optional().or(z.literal('')),
});

export const createEvidenceSchema = z.object({
  placeId: z.string().uuid('Identificador de lugar inválido'),
  sourceCode: z.string().trim().min(2).max(60),
  externalUrl: z.string().trim().url('URL externa inválida').nullable().optional(),
  extractedSnippet: z
    .string()
    .trim()
    .min(5, 'El fragmento de evidencia debe tener al menos 5 caracteres')
    .max(2000, 'El fragmento no puede superar 2000 caracteres'),
  evidenceType: evidenceTypeSchema.default('OPINION'),
  sentimentScore: z.number().min(0).max(1).default(0.5),
  confidenceScore: z.number().min(0).max(1).default(0.8),
  publishedAt: z.string().datetime().nullable().optional(),
});

export const detectDuplicatesQuerySchema = z.object({
  placeId: z.string().uuid().optional(),
  radiusMeters: z.coerce.number().min(5).max(10000).default(300),
  similarityThreshold: z.coerce.number().min(0.3).max(1.0).default(0.65),
});

// FASE 4: Esquemas de Aspectos, Explicaciones y Métricas de IA
export const aspectPolaritySchema = z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']);

export const extractAspectsBodySchema = z.object({
  categorySlug: z.string().trim().min(2).max(60),
  snippets: z.array(z.string().trim().min(3)).min(1, 'Se requiere al menos un fragmento para analizar'),
});

export const explainPlaceBodySchema = z.object({
  placeId: z.string().uuid('Identificador de lugar inválido'),
  placeName: z.string().trim().min(1),
  categorySlug: z.string().trim().min(1),
  evidences: z.array(
    z.object({
      evidence_id: z.string().min(1),
      source_code: z.string().min(1),
      snippet: z.string().trim().min(5),
      confidence_score: z.number().min(0).max(1).default(0.85),
    })
  ),
});

export const recalculateAspectsSchema = z.object({
  forceRefresh: z.boolean().default(false),
});

// FASE 5: Esquemas de Actividades Propias, Verificación y Reseñas Adaptadas
export const activityLogStatusSchema = z.enum(['STARTED', 'COMPLETED', 'CANCELLED']);
export const visitVerificationMethodSchema = z.enum(['NONE', 'GPS_PROXIMITY', 'QR_CODE']);
export const reviewTypeSchema = z.enum(['RESTAURANT', 'TOURISM', 'GENERAL']);
export const restaurantValueForMoneySchema = z.enum(['EXCELLENT', 'FAIR', 'EXPENSIVE']);
export const tourismDurationSpentSchema = z.enum([
  'UNDER_1_HOUR',
  '1_TO_2_HOURS',
  '2_TO_4_HOURS',
  'HALF_DAY',
  'FULL_DAY',
]);
export const tourismAccessibilitySchema = z.enum([
  'EASY',
  'MODERATE',
  'DIFFICULT',
  'WHEELCHAIR_ACCESSIBLE',
]);

export const startActivitySchema = z.object({
  placeId: z.string().uuid('Identificador de lugar inválido'),
  activityId: z.string().uuid('Identificador de actividad inválido').optional(),
  activityTitle: z.string().trim().min(2).max(180).default('Visita libre'),
});

export const verifyVisitSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    qrToken: z.string().trim().min(3).max(255).optional(),
  })
  .refine(
    (data) =>
      (data.latitude !== undefined && data.longitude !== undefined) || !!data.qrToken,
    {
      message:
        'Debe proporcionar coordenadas de geolocalización o un código QR para verificar la visita',
    }
  );

export const restaurantReviewSchema = z.object({
  tasteQuality: z.number().int().min(1).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  valueForMoney: restaurantValueForMoneySchema.optional(),
  amountPaid: z.number().min(0).max(10000).optional(),
  recommendedDish: z.string().trim().max(255).optional(),
  wouldReturn: z.boolean().default(true),
  comment: z.string().trim().max(2000).optional(),
});

export const tourismReviewSchema = z.object({
  worthIt: z.boolean().default(true),
  durationSpent: tourismDurationSpentSchema.optional(),
  amountPaid: z.number().min(0).max(10000).optional(),
  accessibility: tourismAccessibilitySchema.optional(),
  recommendedItem: z.string().trim().max(255).optional(),
  caveatOrTip: z.string().trim().max(1000).optional(),
  comment: z.string().trim().max(2000).optional(),
});

export const completeActivityReviewSchema = z.object({
  reviewType: reviewTypeSchema.default('GENERAL'),
  restaurantReview: restaurantReviewSchema.optional(),
  tourismReview: tourismReviewSchema.optional(),
  generalComment: z.string().trim().max(2000).optional(),
  wouldReturnOrRecommend: z.boolean().default(true),
});

// FASE 6: Esquemas del Planificador de Viajes (Oculto)
export const tripStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
export const tripItemStatusSchema = z.enum(['PLANNED', 'COMPLETED', 'SKIPPED']);
export const flexibilityMinutesSchema = z.union([
  z.literal(0),
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);
export const alternativeMatchLevelSchema = z.enum([
  'VERY_SIMILAR',
  'RELATED_EXPERIENCE',
  'REQUIRES_ADJUSTMENTS',
]);

export const createTripSchema = z
  .object({
    destinationId: z.string().uuid().optional(),
    citySlug: z.string().trim().min(1).optional(),
    title: z
      .string()
      .trim()
      .min(3, 'El título del viaje debe tener al menos 3 caracteres')
      .max(200),
    description: z.string().trim().max(1000).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    budgetTier: budgetTierSchema.default('MEDIUM'),
    travelStyles: z.array(travelStyleSchema).default([]),
    flexibilityMinutes: flexibilityMinutesSchema.default(15),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  });

export const updateTripSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budgetTier: budgetTierSchema.optional(),
  travelStyles: z.array(travelStyleSchema).optional(),
  flexibilityMinutes: flexibilityMinutesSchema.optional(),
  status: tripStatusSchema.optional(),
});

export const createTripItemSchema = z.object({
  placeId: z.string().uuid('Identificador de lugar inválido'),
  activityId: z.string().uuid().optional(),
  customTitle: z.string().trim().max(180).optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Hora inválida (HH:MM)')
    .optional(),
  durationMinutes: z.number().int().min(15).max(720).default(60),
  notes: z.string().trim().max(500).optional(),
});

export const updateTripItemSchema = z.object({
  customTitle: z.string().trim().max(180).optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Hora inválida (HH:MM)')
    .optional(),
  durationMinutes: z.number().int().min(15).max(720).optional(),
  notes: z.string().trim().max(500).optional(),
  status: tripItemStatusSchema.optional(),
});

export const reorderTripItemsSchema = z.object({
  itemIdsInOrder: z.array(z.string().uuid()).min(1),
});

export const assistedPlanRequestSchema = z
  .object({
    citySlug: z.string().trim().min(1, 'La ciudad de destino es obligatoria'),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
    budgetTier: budgetTierSchema.default('MEDIUM'),
    travelStyles: z.array(travelStyleSchema).min(1, 'Selecciona al menos un estilo de viaje'),
    flexibilityMinutes: flexibilityMinutesSchema.default(15),
    title: z.string().trim().max(200).optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
  });

export const getAlternativesQuerySchema = z.object({
  flexibilityMinutes: z.coerce.number().int().optional(),
  maxDistanceMeters: z.coerce.number().int().min(500).max(50000).default(10000),
});

export const applyReorganizationSchema = z.object({
  shiftMinutes: z.number().int(),
  affectedItemIds: z.array(z.string().uuid()),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type DiscoverPlacesQueryInput = z.infer<typeof discoverPlacesQuerySchema>;
export type SurpriseMeRequestInput = z.infer<typeof surpriseMeRequestSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type AddCollectionItemInput = z.infer<typeof addCollectionItemSchema>;
export type GeoAutocompleteQueryInput = z.infer<typeof geoAutocompleteQuerySchema>;
export type GeoReverseQueryInput = z.infer<typeof geoReverseQuerySchema>;
export type GeoRouteInput = z.infer<typeof geoRouteSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
export type DetectDuplicatesQueryInput = z.infer<typeof detectDuplicatesQuerySchema>;
export type ExtractAspectsBodyInput = z.infer<typeof extractAspectsBodySchema>;
export type ExplainPlaceBodyInput = z.infer<typeof explainPlaceBodySchema>;
export type RecalculateAspectsInput = z.infer<typeof recalculateAspectsSchema>;
export type StartActivityInput = z.infer<typeof startActivitySchema>;
export type VerifyVisitInput = z.infer<typeof verifyVisitSchema>;
export type RestaurantReviewInput = z.infer<typeof restaurantReviewSchema>;
export type TourismReviewInput = z.infer<typeof tourismReviewSchema>;
export type CompleteActivityReviewInput = z.infer<typeof completeActivityReviewSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type CreateTripItemInput = z.infer<typeof createTripItemSchema>;
export type UpdateTripItemInput = z.infer<typeof updateTripItemSchema>;
export type ReorderTripItemsInput = z.infer<typeof reorderTripItemsSchema>;
export type AssistedPlanRequestInput = z.infer<typeof assistedPlanRequestSchema>;
export type GetAlternativesQueryInput = z.infer<typeof getAlternativesQuerySchema>;
export type ApplyReorganizationInput = z.infer<typeof applyReorganizationSchema>;






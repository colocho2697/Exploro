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




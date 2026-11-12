import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  resolveSafeRecommendationReason,
  tiersAboveBudget,
} from '@exploro/business-rules';
import {
  ActivityDetailsDTO,
  BudgetTier,
  CategoryDTO,
  CityDTO,
  ConfidenceLevel,
  DataAvailabilityStatus,
  DestinationDTO,
  EstablishmentDetailsDTO,
  EvidenceSummaryDTO,
  PlaceCardDTO,
  PlaceDetailDTO,
  PlaceSortBy,
  SubcategoryDTO,
  VerificationStatus,
} from '@exploro/shared-types';
import { DiscoverPlacesQueryInput } from '@exploro/validation';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';

export interface PersonalizationContext {
  favoriteCategories: string[];
  budgetTier: BudgetTier;
}

export interface DiscoverResult {
  places: PlaceCardDTO[];
  total: number;
  personalizationApplied: boolean;
  sortApplied: PlaceSortBy;
}

export interface SurpriseCandidateRow {
  card: PlaceCardDTO;
  overallScore: number;
  minDurationMins: number | null;
}

interface CardRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_slug: string;
  category_name: string;
  subcategory_slug: string | null;
  subcategory_name: string | null;
  city_name: string;
  state_code: string | null;
  address_text: string | null;
  lat: number;
  lng: number;
  distance_meters: number | null;
  image_url: string | null;
  price_tier: BudgetTier;
  avg_price_min: string | null;
  avg_price_max: string | null;
  currency_code: string;
  price_status: DataAvailabilityStatus;
  schedule_status: DataAvailabilityStatus;
  verification_status: VerificationStatus;
  tags: string[];
  is_demo_data: boolean;
  total_evidences: number;
  confidence_level: ConfidenceLevel;
  ai_explanation_es: string | null;
  overall_score: string | number;
  total_count?: string;
  min_duration?: number | null;
}

const CARD_COLUMNS = `
  p.id, p.slug, p.name, p.description,
  cat.slug AS category_slug, cat.name AS category_name,
  sub.slug AS subcategory_slug, sub.name AS subcategory_name,
  c.name AS city_name, c.state_code, p.address_text,
  ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lng,
  p.image_url, p.price_tier, p.avg_price_min, p.avg_price_max, p.currency_code,
  p.price_status, p.schedule_status, p.verification_status, p.tags, p.is_demo_data,
  COALESCE(ps.total_independent_evidences, 0) AS total_evidences,
  COALESCE(ps.confidence_level, 'LOW') AS confidence_level,
  ps.ai_explanation_es,
  COALESCE(ps.overall_score, 0) AS overall_score`;

const CARD_FROM = `
  FROM places p
  JOIN categories cat ON cat.id = p.category_id
  LEFT JOIN subcategories sub ON sub.id = p.subcategory_id
  JOIN cities c ON c.id = p.city_id
  LEFT JOIN destinations d ON d.id = p.destination_id
  LEFT JOIN place_scores ps ON ps.place_id = p.id`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  public async getCategories(): Promise<CategoryDTO[]> {
    const cacheKey = 'catalog:categories:v1';
    const cached = await this.redis.getJson<CategoryDTO[]>(cacheKey);
    if (cached) return cached;

    const [catRes, subRes] = await Promise.all([
      this.db.query<{
        id: string;
        slug: string;
        name: string;
        description: string;
        icon_name: string;
        sort_order: number;
        is_active: boolean;
      }>(
        `SELECT id, slug, name, description, icon_name, sort_order, is_active
         FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC`
      ),
      this.db.query<{
        id: string;
        category_id: string;
        slug: string;
        name: string;
        sort_order: number;
        is_active: boolean;
      }>(
        `SELECT id, category_id, slug, name, sort_order, is_active
         FROM subcategories WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC`
      ),
    ]);

    const subMap = new Map<string, SubcategoryDTO[]>();
    for (const sub of subRes.rows) {
      const list = subMap.get(sub.category_id) ?? [];
      list.push({
        id: sub.id,
        categoryId: sub.category_id,
        slug: sub.slug,
        name: sub.name,
        sortOrder: sub.sort_order,
        isActive: sub.is_active,
      });
      subMap.set(sub.category_id, list);
    }

    const categories: CategoryDTO[] = catRes.rows.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      iconName: cat.icon_name,
      sortOrder: cat.sort_order,
      isActive: cat.is_active,
      subcategories: subMap.get(cat.id) ?? [],
    }));

    await this.redis.setJson(cacheKey, categories, 300);
    return categories;
  }

  public async getCities(countryIso = 'US'): Promise<CityDTO[]> {
    const normalized = countryIso.trim().toUpperCase();
    const filterByCountry = normalized !== '' && normalized !== 'ALL';
    const res = await this.db.query<{
      id: string;
      country_id: string;
      iso_code: string;
      name: string;
      state_code: string | null;
      slug: string;
      lat: number;
      lng: number;
    }>(
      `SELECT c.id, c.country_id, co.iso_code, c.name, c.state_code, c.slug,
              ST_Y(c.center_point::geometry) AS lat, ST_X(c.center_point::geometry) AS lng
       FROM cities c JOIN countries co ON co.id = c.country_id
       ${filterByCountry ? 'WHERE co.iso_code = $1' : ''}
       ORDER BY CASE WHEN co.iso_code = 'HN' THEN 0 ELSE 1 END, c.name ASC`,
      filterByCountry ? [normalized] : []
    );

    return res.rows.map((row) => ({
      id: row.id,
      countryId: row.country_id,
      countryIsoCode: row.iso_code,
      name: row.name,
      stateCode: row.state_code ?? undefined,
      slug: row.slug,
      center: { lat: Number(row.lat), lng: Number(row.lng) },
    }));
  }

  public async getDestinations(citySlug?: string): Promise<DestinationDTO[]> {
    const params: unknown[] = [];
    let whereClause = 'WHERE d.is_featured = TRUE';
    if (citySlug) {
      params.push(citySlug);
      whereClause += ` AND c.slug = $${params.length}`;
    }

    const res = await this.db.query<{
      id: string;
      city_id: string;
      name: string;
      slug: string;
      description: string;
      lat: number;
      lng: number;
      is_featured: boolean;
    }>(
      `SELECT d.id, d.city_id, d.name, d.slug, d.description,
              ST_Y(d.center_point::geometry) AS lat, ST_X(d.center_point::geometry) AS lng,
              d.is_featured
       FROM destinations d JOIN cities c ON c.id = d.city_id
       ${whereClause} ORDER BY d.name ASC`,
      params
    );

    return res.rows.map((row) => ({
      id: row.id,
      cityId: row.city_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      center: { lat: Number(row.lat), lng: Number(row.lng) },
      isFeatured: row.is_featured,
    }));
  }

  /**
   * Búsqueda geográfica con PostGIS (Paso 2.3).
   * - Distancias reales en metros (ST_Distance sobre geography).
   * - Radio configurable con ST_DWithin o sin límite geográfico (`unbounded`).
   * - Orden: recommended (score + personalización), distance o name.
   * - La personalización solo se aplica cuando recibe un contexto explícito.
   */
  public async discoverPlaces(
    query: DiscoverPlacesQueryInput,
    personalization?: PersonalizationContext
  ): Promise<DiscoverResult> {
    const params: unknown[] = [];
    const conditions: string[] = ['p.is_active = TRUE'];
    const hasCoords = query.lat !== undefined && query.lng !== undefined;

    let distanceSelect = 'NULL::double precision AS distance_meters';
    if (hasCoords) {
      params.push(query.lng, query.lat);
      const point = `ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)::geography`;
      distanceSelect = `ROUND(ST_Distance(p.location, ${point})::numeric, 1)::double precision AS distance_meters`;
      if (!query.unbounded) {
        params.push(query.radiusKm * 1000);
        conditions.push(`ST_DWithin(p.location, ${point}, $${params.length})`);
      }
    }

    const addEq = (column: string, value: string | undefined): void => {
      if (!value) return;
      params.push(value);
      conditions.push(`${column} = $${params.length}`);
    };
    addEq('c.slug', query.citySlug);
    addEq('d.slug', query.destinationSlug);
    addEq('cat.slug', query.categorySlug);
    addEq('sub.slug', query.subcategorySlug);
    addEq('p.price_tier', query.priceTier);

    if (query.searchQuery) {
      params.push(`%${query.searchQuery.toLowerCase()}%`);
      conditions.push(
        `(LOWER(p.name) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`
      );
    }

    let sortApplied: PlaceSortBy = query.sortBy;
    if (sortApplied === 'distance' && !hasCoords) sortApplied = 'recommended';

    let personalizationApplied = false;
    let orderBy: string;
    if (sortApplied === 'name') {
      orderBy = 'p.name ASC';
    } else if (sortApplied === 'distance') {
      orderBy = 'distance_meters ASC NULLS LAST, COALESCE(ps.overall_score, 0) DESC, p.name ASC';
    } else {
      let scoreExpr = 'COALESCE(ps.overall_score, 0)';
      if (personalization && query.applyPreferences) {
        personalizationApplied = true;
        if (personalization.favoriteCategories.length > 0) {
          params.push(personalization.favoriteCategories);
          scoreExpr += ` + CASE WHEN cat.slug = ANY($${params.length}::text[]) THEN 10 ELSE 0 END`;
        }
        const above = tiersAboveBudget(personalization.budgetTier);
        if (above.length > 0) {
          params.push(above);
          scoreExpr += ` - CASE WHEN p.price_tier = ANY($${params.length}::text[]) THEN 15 ELSE 0 END`;
        }
      }
      orderBy = `(${scoreExpr}) DESC, distance_meters ASC NULLS LAST, p.name ASC`;
    }

    const offset = (query.page - 1) * query.limit;
    params.push(query.limit, offset);

    const res = await this.db.query<CardRow>(
      `SELECT ${CARD_COLUMNS}, ${distanceSelect}, COUNT(*) OVER() AS total_count
       ${CARD_FROM}
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      places: res.rows.map((row) => this.mapCard(row)),
      total: res.rows[0]?.total_count ? Number(res.rows[0].total_count) : 0,
      personalizationApplied,
      sortApplied,
    };
  }

  /** Tarjetas por id, conservando el orden solicitado (favoritos y colecciones). */
  public async getPlaceCardsByIds(ids: string[]): Promise<PlaceCardDTO[]> {
    if (ids.length === 0) return [];
    const res = await this.db.query<CardRow>(
      `SELECT ${CARD_COLUMNS}, NULL::double precision AS distance_meters
       ${CARD_FROM}
       WHERE p.is_active = TRUE AND p.id = ANY($1::uuid[])`,
      [ids]
    );
    const byId = new Map(res.rows.map((row) => [row.id, this.mapCard(row)]));
    return ids
      .map((id) => byId.get(id))
      .filter((card): card is PlaceCardDTO => card !== undefined);
  }

  /** Candidatos para «Sorpréndeme»: incluye la menor duración conocida de sus actividades. */
  public async getSurpriseCandidates(filters: {
    lat?: number;
    lng?: number;
    radiusKm: number;
    citySlug?: string;
  }): Promise<SurpriseCandidateRow[]> {
    const params: unknown[] = [];
    const conditions: string[] = ['p.is_active = TRUE'];
    let distanceSelect = 'NULL::double precision AS distance_meters';

    if (filters.lat !== undefined && filters.lng !== undefined) {
      params.push(filters.lng, filters.lat);
      const point = `ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)::geography`;
      distanceSelect = `ROUND(ST_Distance(p.location, ${point})::numeric, 1)::double precision AS distance_meters`;
      params.push(filters.radiusKm * 1000);
      conditions.push(`ST_DWithin(p.location, ${point}, $${params.length})`);
    }
    if (filters.citySlug) {
      params.push(filters.citySlug);
      conditions.push(`c.slug = $${params.length}`);
    }

    const res = await this.db.query<CardRow>(
      `SELECT ${CARD_COLUMNS}, ${distanceSelect},
              (SELECT MIN(a.estimated_duration_mins) FROM activities a WHERE a.place_id = p.id) AS min_duration
       ${CARD_FROM}
       WHERE ${conditions.join(' AND ')}
       LIMIT 200`,
      params
    );

    return res.rows.map((row) => ({
      card: this.mapCard(row),
      overallScore: Number(row.overall_score),
      minDurationMins: row.min_duration ?? null,
    }));
  }

  public async getPlaceBySlugOrId(slugOrId: string): Promise<PlaceDetailDTO> {
    const cardRes = await this.db.query<
      CardRow & {
        explanation_status: DataAvailabilityStatus | null;
        total_native_reviews: number | null;
        source_diversity_count: number | null;
        top_positive_aspects: string[] | null;
        top_negative_aspects: string[] | null;
      }
    >(
      `SELECT ${CARD_COLUMNS}, NULL::double precision AS distance_meters,
              ps.explanation_status, ps.total_native_reviews, ps.source_diversity_count,
              ps.top_positive_aspects, ps.top_negative_aspects
       ${CARD_FROM}
       WHERE p.is_active = TRUE AND ${UUID_RE.test(slugOrId) ? 'p.id = $1' : 'p.slug = $1'}`,
      [slugOrId]
    );

    const row = cardRes.rows[0];
    if (!row) {
      throw new NotFoundException('Lugar no encontrado en el catálogo.');
    }

    const [evRes, estRes, actRes] = await Promise.all([
      this.db.query<{
        id: string;
        source_code: string;
        source_name: string;
        source_type: EvidenceSummaryDTO['sourceType'];
        external_url: string | null;
        extracted_snippet: string;
        evidence_type: EvidenceSummaryDTO['evidenceType'];
        confidence_score: string;
        published_at: Date | null;
        captured_at: Date;
      }>(
        `SELECT e.id, s.code AS source_code, s.name AS source_name, s.source_type,
                e.external_url, e.extracted_snippet, e.evidence_type, e.confidence_score,
                e.published_at, e.captured_at
         FROM evidences e JOIN sources s ON s.id = e.source_id
         WHERE e.place_id = $1 AND e.processing_status = 'PROCESSED'
         ORDER BY e.published_at DESC NULLS LAST, e.captured_at DESC`,
        [row.id]
      ),
      this.db.query<{
        opening_hours: Record<string, string> | null;
        phone: string | null;
        website_url: string | null;
        specialties: string[] | null;
        accepts_reservations: boolean | null;
      }>(
        `SELECT opening_hours, phone, website_url, specialties, accepts_reservations
         FROM establishments WHERE place_id = $1`,
        [row.id]
      ),
      this.db.query<{
        id: string;
        title: string;
        description: string;
        estimated_duration_mins: number | null;
        estimated_cost: string | null;
        accessibility_level: ActivityDetailsDTO['accessibilityLevel'];
        best_time_of_day: ActivityDetailsDTO['bestTimeOfDay'];
      }>(
        `SELECT id, title, description, estimated_duration_mins, estimated_cost,
                accessibility_level, best_time_of_day
         FROM activities WHERE place_id = $1 ORDER BY title ASC`,
        [row.id]
      ),
    ]);

    const evidences: EvidenceSummaryDTO[] = evRes.rows.map((ev) => ({
      id: ev.id,
      sourceCode: ev.source_code,
      sourceName: ev.source_name,
      sourceType: ev.source_type,
      externalUrl: ev.external_url,
      extractedSnippet: ev.extracted_snippet,
      evidenceType: ev.evidence_type,
      confidenceScore: Number(ev.confidence_score),
      publishedAt: ev.published_at ? new Date(ev.published_at).toISOString() : null,
      capturedAt: new Date(ev.captured_at).toISOString(),
    }));

    const est = estRes.rows[0];
    const establishment: EstablishmentDetailsDTO | null = est
      ? {
          openingHours: est.opening_hours,
          phone: est.phone,
          websiteUrl: est.website_url,
          specialties: Array.isArray(est.specialties) ? est.specialties : [],
          acceptsReservations: est.accepts_reservations,
        }
      : null;

    const activities: ActivityDetailsDTO[] = actRes.rows.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      estimatedDurationMins: a.estimated_duration_mins,
      estimatedCost: a.estimated_cost !== null ? Number(a.estimated_cost) : null,
      accessibilityLevel: a.accessibility_level,
      bestTimeOfDay: a.best_time_of_day,
    }));

    const card = this.mapCard(row);
    return {
      ...card,
      establishment,
      activities,
      scoreSummary: {
        overallScore: Number(row.overall_score),
        confidenceLevel: row.confidence_level,
        totalIndependentEvidences: card.recommendationCount,
        totalNativeReviews: row.total_native_reviews ?? 0,
        sourceDiversityCount: row.source_diversity_count ?? 0,
        aiExplanationEs: row.ai_explanation_es,
        explanationStatus:
          row.explanation_status ??
          resolveSafeRecommendationReason({
            verifiedExplanation: row.ai_explanation_es,
            evidenceCount: card.recommendationCount,
          }).status,
        topPositiveAspects: Array.isArray(row.top_positive_aspects)
          ? row.top_positive_aspects
          : [],
        topNegativeAspects: Array.isArray(row.top_negative_aspects)
          ? row.top_negative_aspects
          : [],
      },
      evidences,
    };
  }

  private mapCard(row: CardRow): PlaceCardDTO {
    const evidenceCount = Number(row.total_evidences);
    const reason = resolveSafeRecommendationReason({
      verifiedExplanation: row.ai_explanation_es,
      evidenceCount,
    });
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      categorySlug: row.category_slug,
      categoryName: row.category_name,
      subcategorySlug: row.subcategory_slug,
      subcategoryName: row.subcategory_name,
      cityName: row.city_name,
      stateCode: row.state_code,
      addressText: row.address_text,
      coordinates: { lat: Number(row.lat), lng: Number(row.lng) },
      distanceMeters:
        row.distance_meters !== null ? Number(row.distance_meters) : null,
      imageUrl: row.image_url,
      priceTier: row.price_tier,
      avgPriceMin: row.avg_price_min !== null ? Number(row.avg_price_min) : null,
      avgPriceMax: row.avg_price_max !== null ? Number(row.avg_price_max) : null,
      currencyCode: row.currency_code,
      priceStatus: row.price_status,
      scheduleStatus: row.schedule_status,
      verificationStatus: row.verification_status,
      recommendationReason: reason.text,
      recommendationCount: evidenceCount,
      confidenceLevel: row.confidence_level,
      tags: Array.isArray(row.tags) ? row.tags : [],
      isDemoData: row.is_demo_data,
    };
  }
}

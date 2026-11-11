import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import {
  ActivityLogDTO,
  ActivityLogStatus,
  ReviewType,
  UserReviewDTO,
  VerifyVisitResponse,
  VisitVerificationMethod,
} from '@exploro/shared-types';
import {
  CompleteActivityReviewInput,
  StartActivityInput,
  VerifyVisitInput,
} from '@exploro/validation';
import {
  calculateDeterministicPlaceScore,
  calculateNativeSentimentScore,
  determineReviewTypeForCategory,
  formatNativeReviewSnippet,
  generateEvidenceContentHash,
  RankingEvidenceInput,
  verifyProximityForVisit,
  verifyQrTokenForPlace,
} from '@exploro/business-rules';

interface ActivityLogRow {
  id: string;
  user_id: string;
  place_id: string;
  activity_id: string | null;
  activity_title: string;
  status: ActivityLogStatus;
  verification_method: VisitVerificationMethod;
  is_verified_visit: boolean;
  started_at: string;
  completed_at: string | null;
  verified_at: string | null;
}

interface PlaceLocationRow {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  lat: number;
  lng: number;
}

interface UserReviewRow {
  id: string;
  activity_log_id: string | null;
  user_id: string;
  user_name?: string;
  place_id: string;
  review_type: ReviewType;
  taste_quality: number | null;
  service_rating: number | null;
  value_for_money: string | null;
  worth_it: boolean | null;
  duration_spent: string | null;
  accessibility: string | null;
  amount_paid: string | null;
  currency_code: string;
  recommended_item: string | null;
  caveat_or_tip: string | null;
  would_return_or_recommend: boolean;
  comment: string | null;
  is_verified_visit: boolean;
  verification_method: VisitVerificationMethod;
  moderation_status: 'PUBLISHED' | 'FLAGGED' | 'HIDDEN';
  created_at: string;
}

@Injectable()
export class ExperiencesService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService
  ) {}

  /**
   * Paso 5.1: Inicia una actividad ("Comenzar actividad")
   */
  public async startActivity(
    userId: string,
    dto: StartActivityInput
  ): Promise<ActivityLogDTO> {
    // 1. Verificar existencia del lugar
    const placeCheck = await this.db.query<{ id: string }>(
      'SELECT id FROM places WHERE id = $1',
      [dto.placeId]
    );
    if (placeCheck.rows.length === 0) {
      throw new NotFoundException('Lugar no encontrado en el catálogo.');
    }

    // 2. Si el usuario ya tenía una actividad 'STARTED', la cancelamos
    await this.db.query(
      `UPDATE activity_logs SET status = 'CANCELLED', completed_at = NOW()
       WHERE user_id = $1 AND status = 'STARTED'`,
      [userId]
    );

    // 3. Crear nuevo registro de actividad
    const insertRes = await this.db.query<ActivityLogRow>(
      `INSERT INTO activity_logs (user_id, place_id, activity_id, activity_title, status, verification_method, is_verified_visit, started_at)
       VALUES ($1, $2, $3, $4, 'STARTED', 'NONE', FALSE, NOW())
       RETURNING *`,
      [
        userId,
        dto.placeId,
        dto.activityId ?? null,
        dto.activityTitle ?? 'Visita libre',
      ]
    );

    const row = insertRes.rows[0];
    await this.redis.del(`activity:active:${userId}`);
    return this.mapActivityLogRow(row);
  }

  /**
   * Retorna la actividad activa ('STARTED') del usuario si existe
   */
  public async getActiveActivity(userId: string): Promise<ActivityLogDTO | null> {
    const res = await this.db.query<ActivityLogRow>(
      `SELECT * FROM activity_logs
       WHERE user_id = $1 AND status = 'STARTED'
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) return null;
    return this.mapActivityLogRow(res.rows[0]);
  }

  /**
   * Paso 5.5: Verificación opcional de visita mediante GPS o QR.
   * Regla: "No utilizar el simple inicio de una actividad como prueba definitiva de visita."
   */
  public async verifyVisit(
    activityId: string,
    userId: string,
    dto: VerifyVisitInput
  ): Promise<VerifyVisitResponse> {
    const activityRes = await this.db.query<ActivityLogRow>(
      `SELECT * FROM activity_logs WHERE id = $1 AND user_id = $2`,
      [activityId, userId]
    );

    if (activityRes.rows.length === 0) {
      throw new NotFoundException('Registro de actividad no encontrado.');
    }

    const activity = activityRes.rows[0];
    if (activity.status !== 'STARTED') {
      throw new BadRequestException('Solo actividades activas pueden verificarse.');
    }

    // Obtener coordenadas y datos del lugar
    const placeRes = await this.db.query<PlaceLocationRow>(
      `SELECT p.id, p.slug, p.name, c.slug as category_slug,
              ST_Y(p.location::geometry) as lat,
              ST_X(p.location::geometry) as lng
       FROM places p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [activity.place_id]
    );

    if (placeRes.rows.length === 0) {
      throw new NotFoundException('Lugar asociado a la actividad no encontrado.');
    }

    const place = placeRes.rows[0];

    // Caso A: Verificación por GPS
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      const geoCheck = verifyProximityForVisit(
        dto.latitude,
        dto.longitude,
        place.lat,
        place.lng,
        100
      );

      if (geoCheck.isVerified) {
        await this.db.query(
          `UPDATE activity_logs
           SET verification_method = 'GPS_PROXIMITY', is_verified_visit = TRUE, verified_at = NOW()
           WHERE id = $1`,
          [activityId]
        );
        await this.redis.del(`activity:active:${userId}`);

        return {
          isVerified: true,
          verificationMethod: 'GPS_PROXIMITY',
          distanceMeters: geoCheck.distanceMeters,
          message: `Visita verificada exitosamente mediante GPS (${geoCheck.distanceMeters}m del lugar).`,
        };
      } else {
        return {
          isVerified: false,
          verificationMethod: 'NONE',
          distanceMeters: geoCheck.distanceMeters,
          message: `Ubicación fuera del rango (${geoCheck.distanceMeters}m > 100m). No se pudo verificar la visita.`,
        };
      }
    }

    // Caso B: Verificación por QR
    if (dto.qrToken) {
      const qrValid = verifyQrTokenForPlace(dto.qrToken, place.id, place.slug);
      if (qrValid) {
        await this.db.query(
          `UPDATE activity_logs
           SET verification_method = 'QR_CODE', is_verified_visit = TRUE, verified_at = NOW()
           WHERE id = $1`,
          [activityId]
        );
        await this.redis.del(`activity:active:${userId}`);

        return {
          isVerified: true,
          verificationMethod: 'QR_CODE',
          message: 'Visita verificada exitosamente mediante código QR del lugar.',
        };
      } else {
        return {
          isVerified: false,
          verificationMethod: 'NONE',
          message: 'El código QR escaneado no coincide con este lugar.',
        };
      }
    }

    return {
      isVerified: false,
      verificationMethod: 'NONE',
      message: 'No se enviaron datos válidos para la verificación.',
    };
  }

  /**
   * Paso 5.2, 5.3, 5.4, 5.6: Finalización y Reseña Adaptada con Ingesta al Ranking
   */
  public async completeActivityWithReview(
    activityId: string,
    userId: string,
    dto: CompleteActivityReviewInput
  ): Promise<UserReviewDTO> {
    const activityRes = await this.db.query<
      ActivityLogRow & {
        place_slug: string;
        place_name: string;
        category_slug: string;
        user_name: string;
      }
    >(
      `SELECT a.*, p.slug as place_slug, p.name as place_name, c.slug as category_slug, u.display_name as user_name
       FROM activity_logs a
       JOIN places p ON p.id = a.place_id
       JOIN categories c ON c.id = p.category_id
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1 AND a.user_id = $2`,
      [activityId, userId]
    );

    if (activityRes.rows.length === 0) {
      throw new NotFoundException('Registro de actividad no encontrado.');
    }

    const activity = activityRes.rows[0];

    // Marcar actividad como completada
    await this.db.query(
      `UPDATE activity_logs
       SET status = 'COMPLETED', completed_at = NOW()
       WHERE id = $1`,
      [activityId]
    );

    // Determinar tipo de reseña adaptado si vino como GENERAL
    const finalReviewType: ReviewType =
      dto.reviewType === 'GENERAL'
        ? determineReviewTypeForCategory(activity.category_slug)
        : dto.reviewType;

    const tasteQuality = dto.restaurantReview?.tasteQuality ?? null;
    const serviceRating = dto.restaurantReview?.serviceRating ?? null;
    const valueForMoney = dto.restaurantReview?.valueForMoney ?? null;
    const worthIt =
      dto.tourismReview?.worthIt ?? dto.wouldReturnOrRecommend ?? true;
    const durationSpent = dto.tourismReview?.durationSpent ?? null;
    const accessibility = dto.tourismReview?.accessibility ?? null;
    const amountPaid =
      dto.restaurantReview?.amountPaid ?? dto.tourismReview?.amountPaid ?? null;
    const recommendedItem =
      dto.restaurantReview?.recommendedDish ??
      dto.tourismReview?.recommendedItem ??
      null;
    const caveatOrTip = dto.tourismReview?.caveatOrTip ?? null;
    const wouldReturnOrRecommend =
      dto.wouldReturnOrRecommend ??
      dto.restaurantReview?.wouldReturn ??
      worthIt ??
      true;
    const comment =
      dto.generalComment ??
      dto.restaurantReview?.comment ??
      dto.tourismReview?.comment ??
      null;

    // 1. Insertar en user_reviews
    const reviewInsert = await this.db.query<UserReviewRow>(
      `INSERT INTO user_reviews (
        activity_log_id, user_id, place_id, review_type,
        taste_quality, service_rating, value_for_money, worth_it,
        duration_spent, accessibility, amount_paid, currency_code,
        recommended_item, caveat_or_tip, would_return_or_recommend,
        comment, is_verified_visit, verification_method, moderation_status
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, 'USD',
        $12, $13, $14,
        $15, $16, $17, 'PUBLISHED'
      ) RETURNING *`,
      [
        activity.id,
        userId,
        activity.place_id,
        finalReviewType,
        tasteQuality,
        serviceRating,
        valueForMoney,
        worthIt,
        durationSpent,
        accessibility,
        amountPaid,
        recommendedItem,
        caveatOrTip,
        wouldReturnOrRecommend,
        comment,
        activity.is_verified_visit,
        activity.verification_method,
      ]
    );

    const reviewRow = reviewInsert.rows[0];

    // 2. Paso 5.6: Integrar experiencia como evidencia auditable en evidences
    await this.ingestNativeEvidenceAndRecalculateScore({
      reviewId: reviewRow.id,
      activityLogId: activity.id,
      userId,
      userName: activity.user_name,
      placeId: activity.place_id,
      reviewType: finalReviewType,
      isVerifiedVisit: activity.is_verified_visit,
      restaurantReview: dto.restaurantReview,
      tourismReview: dto.tourismReview,
      wouldReturnOrRecommend,
      comment: comment ?? undefined,
    });

    await this.redis.del(`activity:active:${userId}`);

    return {
      id: reviewRow.id,
      activityLogId: reviewRow.activity_log_id,
      userId: reviewRow.user_id,
      userName: activity.user_name,
      placeId: reviewRow.place_id,
      reviewType: reviewRow.review_type,
      tasteQuality: reviewRow.taste_quality,
      serviceRating: reviewRow.service_rating,
      valueForMoney: reviewRow.value_for_money as any,
      worthIt: reviewRow.worth_it,
      durationSpent: reviewRow.duration_spent as any,
      accessibility: reviewRow.accessibility as any,
      amountPaid: reviewRow.amount_paid ? Number(reviewRow.amount_paid) : null,
      currencyCode: reviewRow.currency_code,
      recommendedItem: reviewRow.recommended_item,
      caveatOrTip: reviewRow.caveat_or_tip,
      wouldReturnOrRecommend: reviewRow.would_return_or_recommend,
      comment: reviewRow.comment,
      isVerifiedVisit: reviewRow.is_verified_visit,
      verificationMethod: reviewRow.verification_method,
      moderationStatus: reviewRow.moderation_status,
      createdAt: reviewRow.created_at,
    };
  }

  /**
   * Lista opiniones nativas del lugar
   */
  public async getPlaceReviews(
    placeId: string,
    limit = 20
  ): Promise<UserReviewDTO[]> {
    const res = await this.db.query<UserReviewRow>(
      `SELECT r.*, u.display_name as user_name
       FROM user_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.place_id = $1 AND r.moderation_status = 'PUBLISHED'
       ORDER BY r.is_verified_visit DESC, r.created_at DESC
       LIMIT $2`,
      [placeId, limit]
    );

    return res.rows.map((r) => ({
      id: r.id,
      activityLogId: r.activity_log_id,
      userId: r.user_id,
      userName: r.user_name,
      placeId: r.place_id,
      reviewType: r.review_type,
      tasteQuality: r.taste_quality,
      serviceRating: r.service_rating,
      valueForMoney: r.value_for_money as any,
      worthIt: r.worth_it,
      durationSpent: r.duration_spent as any,
      accessibility: r.accessibility as any,
      amountPaid: r.amount_paid ? Number(r.amount_paid) : null,
      currencyCode: r.currency_code,
      recommendedItem: r.recommended_item,
      caveatOrTip: r.caveat_or_tip,
      wouldReturnOrRecommend: r.would_return_or_recommend,
      comment: r.comment,
      isVerifiedVisit: r.is_verified_visit,
      verificationMethod: r.verification_method,
      moderationStatus: r.moderation_status,
      createdAt: r.created_at,
    }));
  }

  /**
   * Auxiliar de Paso 5.6: Ingesta la opinión como evidencia y recalcula determinísticamente el score
   */
  private async ingestNativeEvidenceAndRecalculateScore(params: {
    reviewId: string;
    activityLogId: string;
    userId: string;
    userName: string;
    placeId: string;
    reviewType: ReviewType;
    isVerifiedVisit: boolean;
    restaurantReview?: any;
    tourismReview?: any;
    wouldReturnOrRecommend: boolean;
    comment?: string;
  }): Promise<void> {
    const {
      reviewId,
      activityLogId,
      userId,
      userName,
      placeId,
      reviewType,
      isVerifiedVisit,
      restaurantReview,
      tourismReview,
      wouldReturnOrRecommend,
      comment,
    } = params;

    // 1. Obtener fuente EXPLORO_NATIVE
    const sourceRes = await this.db.query<{ id: string }>(
      `SELECT id FROM sources WHERE code = 'EXPLORO_NATIVE' LIMIT 1`
    );
    if (sourceRes.rows.length === 0) return;
    const sourceId = sourceRes.rows[0].id;

    // 2. Generar snippet formateado y sentimiento
    const snippet = formatNativeReviewSnippet({
      authorName: userName,
      reviewType,
      restaurantReview,
      tourismReview,
      comment,
      isVerifiedVisit,
    });

    const sentiment = calculateNativeSentimentScore({
      reviewType,
      restaurantReview,
      tourismReview,
      wouldReturnOrRecommend,
    });

    // Ponderación de confianza según verificación de presencia
    const confidence = isVerifiedVisit ? 0.95 : 0.75;
    const contentHash = generateEvidenceContentHash(
      'EXPLORO_NATIVE',
      null,
      `${userId}-${activityLogId}-${reviewId}-${snippet}`
    );

    await this.db.query(
      `INSERT INTO evidences (
        place_id, source_id, content_hash, extracted_snippet,
        evidence_type, sentiment_score, confidence_score, processing_status,
        captured_at, is_demo_data
      ) VALUES ($1, $2, $3, $4, 'OPINION', $5, $6, 'PROCESSED', NOW(), FALSE)
      ON CONFLICT (content_hash) DO NOTHING`,
      [placeId, sourceId, contentHash, snippet, sentiment, confidence]
    );

    // 3. Recalcular score determinista para el lugar
    const evRows = await this.db.query<{
      source_code: string;
      confidence_score: string;
      sentiment_score: string;
      captured_at: string;
    }>(
      `SELECT s.code as source_code, e.confidence_score, e.sentiment_score, e.captured_at
       FROM evidences e
       JOIN sources s ON s.id = e.source_id
       WHERE e.place_id = $1 AND e.processing_status = 'PROCESSED'`,
      [placeId]
    );

    const now = Date.now();
    const rankingEvidences: RankingEvidenceInput[] = evRows.rows.map((row) => ({
      sourceCode: row.source_code,
      confidenceScore: Number(row.confidence_score),
      sentimentScore: Number(row.sentiment_score),
      ageInDays: Math.max(
        0,
        Math.floor((now - new Date(row.captured_at).getTime()) / (1000 * 3600 * 24))
      ),
      isNativeExperience: row.source_code === 'EXPLORO_NATIVE',
      isVerifiedVisit,
    }));

    const scoreResult = calculateDeterministicPlaceScore(rankingEvidences);

    // Contar reseñas nativas
    const countRes = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM user_reviews WHERE place_id = $1 AND moderation_status = 'PUBLISHED'`,
      [placeId]
    );
    const totalNativeReviews = Number(countRes.rows[0]?.count ?? 0);

    await this.db.query(
      `UPDATE place_scores
       SET overall_score = $1,
           confidence_level = $2,
           total_independent_evidences = $3,
           total_native_reviews = $4,
           source_diversity_count = $5,
           calculated_at = NOW()
       WHERE place_id = $6`,
      [
        scoreResult.overallScore,
        scoreResult.confidenceLevel,
        scoreResult.independentCount,
        totalNativeReviews,
        scoreResult.sourceDiversityCount,
        placeId,
      ]
    );

    // Invalidar cachés
    await this.redis.del(`rec:summary:${placeId}`);
    await this.redis.del(`place:${placeId}`);
  }

  private mapActivityLogRow(row: ActivityLogRow): ActivityLogDTO {
    return {
      id: row.id,
      userId: row.user_id,
      placeId: row.place_id,
      activityId: row.activity_id,
      activityTitle: row.activity_title,
      status: row.status,
      verificationMethod: row.verification_method,
      isVerifiedVisit: row.is_verified_visit,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      verifiedAt: row.verified_at,
    };
  }
}

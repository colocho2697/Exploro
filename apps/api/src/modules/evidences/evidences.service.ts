import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  EvidenceSummaryDTO,
  EvidenceType,
  SourceType,
} from '@exploro/shared-types';
import { CreateEvidenceInput } from '@exploro/validation';
import {
  calculateDeterministicPlaceScore,
  calculateEvidenceConfidence,
  generateEvidenceContentHash,
} from '@exploro/business-rules';

interface EvidenceRow {
  id: string;
  source_code: string;
  source_name: string;
  source_type: string;
  external_url: string | null;
  extracted_snippet: string;
  evidence_type: string;
  confidence_score: string;
  published_at: string | null;
  captured_at: string;
}

@Injectable()
export class EvidencesService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  public async listPlaceEvidences(
    placeId: string
  ): Promise<EvidenceSummaryDTO[]> {
    const res = await this.db.query<EvidenceRow>(
      `SELECT e.id, s.code as source_code, s.name as source_name, s.source_type,
              e.external_url, e.extracted_snippet, e.evidence_type,
              e.confidence_score, e.published_at, e.captured_at
       FROM evidences e
       JOIN sources s ON e.source_id = s.id
       WHERE e.place_id = $1 AND e.processing_status = 'PROCESSED'
       ORDER BY e.confidence_score DESC, e.published_at DESC NULLS LAST, e.captured_at DESC`,
      [placeId]
    );

    return res.rows.map((r) => ({
      id: r.id,
      sourceCode: r.source_code,
      sourceName: r.source_name,
      sourceType: r.source_type as SourceType,
      externalUrl: r.external_url,
      extractedSnippet: r.extracted_snippet,
      evidenceType: r.evidence_type as EvidenceType,
      confidenceScore: Number(r.confidence_score),
      publishedAt: r.published_at,
      capturedAt: r.captured_at,
    }));
  }

  public async createEvidence(
    input: CreateEvidenceInput
  ): Promise<EvidenceSummaryDTO> {
    // 1. Verifica que el lugar exista
    const placeCheck = await this.db.query<{ id: string }>(
      `SELECT id FROM places WHERE id = $1`,
      [input.placeId]
    );
    if (placeCheck.rows.length === 0) {
      throw new NotFoundException('El lugar especificado no existe.');
    }

    // 2. Obtiene la fuente por código
    const sourceRows = await this.db.query<{
      id: string;
      code: string;
      name: string;
      source_type: string;
      base_trust_weight: string;
    }>(
      `SELECT id, code, name, source_type, base_trust_weight FROM sources WHERE code = $1`,
      [input.sourceCode]
    );
    const source = sourceRows.rows[0];
    if (!source) {
      throw new BadRequestException(
        `Fuente no registrada para el código ${input.sourceCode}.`
      );
    }

    // 3. Genera hash determinista para prevenir duplicados
    const hash = generateEvidenceContentHash(
      source.code,
      input.externalUrl,
      input.extractedSnippet
    );

    const confidence =
      input.confidenceScore ??
      calculateEvidenceConfidence({
        baseTrustWeight: Number(source.base_trust_weight),
        hasPublishedAt: Boolean(input.publishedAt),
        hasExternalUrl: Boolean(input.externalUrl),
        isNativeReview: source.source_type === 'NATIVE_EXPERIENCE',
      });

    // 4. Inserta en la base de datos
    const inserted = await this.db.query<EvidenceRow>(
      `INSERT INTO evidences (
          place_id, source_id, external_url, content_hash,
          extracted_snippet, evidence_type, sentiment_score,
          confidence_score, processing_status, published_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PROCESSED', $9)
       ON CONFLICT (content_hash) DO NOTHING
       RETURNING id, external_url, extracted_snippet, evidence_type, confidence_score, published_at, captured_at`,
      [
        input.placeId,
        source.id,
        input.externalUrl ?? null,
        hash,
        input.extractedSnippet,
        input.evidenceType,
        input.sentimentScore,
        confidence,
        input.publishedAt ?? null,
      ]
    );

    if (inserted.rows.length === 0) {
      throw new BadRequestException(
        'Esta evidencia ya ha sido registrada previamente (duplicado detectado por hash).'
      );
    }

    const rec = inserted.rows[0]!;

    // 5. Recalcula el score del lugar de forma determinista
    await this.recalculatePlaceScore(input.placeId);

    return {
      id: rec.id,
      sourceCode: source.code,
      sourceName: source.name,
      sourceType: source.source_type as SourceType,
      externalUrl: rec.external_url,
      extractedSnippet: rec.extracted_snippet,
      evidenceType: rec.evidence_type as EvidenceType,
      confidenceScore: Number(rec.confidence_score),
      publishedAt: rec.published_at,
      capturedAt: rec.captured_at,
    };
  }

  /**
   * Recalcula el puntaje determinista del lugar basado en sus evidencias acumuladas.
   */
  private async recalculatePlaceScore(placeId: string): Promise<void> {
    const evidencesRes = await this.db.query<{
      confidence_score: string;
      sentiment_score: string;
      source_code: string;
      source_type: string;
      published_at: string | null;
      captured_at: string;
    }>(
      `SELECT e.confidence_score, e.sentiment_score, s.code as source_code,
              s.source_type, e.published_at, e.captured_at
       FROM evidences e
       JOIN sources s ON e.source_id = s.id
       WHERE e.place_id = $1 AND e.processing_status = 'PROCESSED'`,
      [placeId]
    );

    const evidences = evidencesRes.rows;
    if (evidences.length === 0) return;

    let nativeCount = 0;
    const inputs = evidences.map((ev) => {
      const pub = ev.published_at ? new Date(ev.published_at) : new Date(ev.captured_at);
      const ageDays = Math.max(0, Math.round((Date.now() - pub.getTime()) / 86400000));
      const isNative = ev.source_type === 'NATIVE_EXPERIENCE';
      if (isNative) nativeCount++;

      return {
        confidenceScore: Number(ev.confidence_score),
        sentimentScore: Number(ev.sentiment_score),
        sourceCode: ev.source_code,
        ageInDays: ageDays,
        isNativeExperience: isNative,
        isVerifiedVisit: isNative,
      };
    });

    const scoreResult = calculateDeterministicPlaceScore(inputs);

    await this.db.query(
      `INSERT INTO place_scores (
          place_id, overall_score, confidence_level, total_independent_evidences,
          total_native_reviews, source_diversity_count, calculated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (place_id) DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          confidence_level = EXCLUDED.confidence_level,
          total_independent_evidences = EXCLUDED.total_independent_evidences,
          total_native_reviews = EXCLUDED.total_native_reviews,
          source_diversity_count = EXCLUDED.source_diversity_count,
          calculated_at = NOW()`,
      [
        placeId,
        scoreResult.overallScore,
        scoreResult.confidenceLevel,
        scoreResult.independentCount,
        nativeCount,
        scoreResult.sourceDiversityCount,
      ]
    );
  }
}

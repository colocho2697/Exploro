import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DuplicateCandidateDTO } from '@exploro/shared-types';
import { DetectDuplicatesQueryInput } from '@exploro/validation';
import { evaluatePlaceDuplicate } from '@exploro/business-rules';

interface CandidatePairRow {
  id1: string;
  name1: string;
  slug1: string;
  city1: string;
  lat1: number;
  lng1: number;
  id2: string;
  name2: string;
  slug2: string;
  city2: string;
  lat2: number;
  lng2: number;
}

@Injectable()
export class NormalizationService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  /**
   * Detección de duplicados entre lugares mediante trigramas y proximidad espacial PostGIS.
   * Aplica la regla estricta: No fusionar automáticamente en ambigüedad.
   */
  public async detectDuplicates(
    options: DetectDuplicatesQueryInput
  ): Promise<DuplicateCandidateDTO[]> {
    const radius = options.radiusMeters ?? 300;
    const similarityMin = options.similarityThreshold ?? 0.65;

    let sql = `
      SELECT p1.id as id1, p1.name as name1, p1.slug as slug1, c1.name as city1,
             ST_Y(p1.location::geometry) as lat1, ST_X(p1.location::geometry) as lng1,
             p2.id as id2, p2.name as name2, p2.slug as slug2, c2.name as city2,
             ST_Y(p2.location::geometry) as lat2, ST_X(p2.location::geometry) as lng2
      FROM places p1
      JOIN places p2 ON p1.id < p2.id
      JOIN cities c1 ON p1.city_id = c1.id
      JOIN cities c2 ON p2.city_id = c2.id
      WHERE p1.is_active = TRUE AND p2.is_active = TRUE
        AND ST_DWithin(p1.location, p2.location, $1)
        AND similarity(p1.normalized_name, p2.normalized_name) >= $2
    `;
    const params: unknown[] = [radius, similarityMin];

    if (options.placeId) {
      params.push(options.placeId);
      sql += ` AND (p1.id = $${params.length} OR p2.id = $${params.length})`;
    }

    sql += ` LIMIT 50`;

    const res = await this.db.query<CandidatePairRow>(sql, params);

    const candidates: DuplicateCandidateDTO[] = [];

    for (const r of res.rows) {
      const coordsA = { lat: Number(r.lat1), lng: Number(r.lng1) };
      const coordsB = { lat: Number(r.lat2), lng: Number(r.lng2) };

      const evalResult = evaluatePlaceDuplicate({
        nameA: r.name1,
        coordsA,
        nameB: r.name2,
        coordsB,
      });

      candidates.push({
        placeA: {
          id: r.id1,
          name: r.name1,
          slug: r.slug1,
          cityName: r.city1,
          coordinates: coordsA,
        },
        placeB: {
          id: r.id2,
          name: r.name2,
          slug: r.slug2,
          cityName: r.city2,
          coordinates: coordsB,
        },
        nameSimilarity: evalResult.nameSimilarity,
        distanceMeters: evalResult.distanceMeters,
        action: evalResult.action,
        reason: evalResult.reason,
      });
    }

    return candidates;
  }
}

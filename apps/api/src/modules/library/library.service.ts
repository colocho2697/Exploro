import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectionDTO,
  FavoriteItemDTO,
  PlaceCardDTO,
} from '@exploro/shared-types';
import {
  CreateCollectionInput,
  UpdateCollectionInput,
} from '@exploro/validation';
import { DatabaseService } from '../../database/database.service';
import { CatalogService } from '../catalog/catalog.service';

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: Date;
  item_count: string;
}

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}

@Injectable()
export class LibraryService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(CatalogService) private readonly catalog: CatalogService
  ) {}

  // ----------------------------- Favoritos ---------------------------------

  public async listFavorites(userId: string): Promise<FavoriteItemDTO[]> {
    const res = await this.db.query<{
      id: string;
      place_id: string;
      created_at: Date;
    }>(
      `SELECT id, place_id, created_at FROM favorites
       WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const cards = await this.catalog.getPlaceCardsByIds(
      res.rows.map((r) => r.place_id)
    );
    const byId = new Map(cards.map((c) => [c.id, c]));

    return res.rows
      .filter((r) => byId.has(r.place_id))
      .map((r) => ({
        id: r.id,
        placeId: r.place_id,
        createdAt: new Date(r.created_at).toISOString(),
        place: byId.get(r.place_id)!,
      }));
  }

  /** Idempotente: guardar dos veces el mismo lugar no genera duplicados ni errores. */
  public async addFavorite(
    userId: string,
    placeId: string
  ): Promise<{ placeId: string; favorited: true }> {
    await this.assertPlaceExists(placeId);
    await this.db.query(
      `INSERT INTO favorites (user_id, place_id) VALUES ($1, $2)
       ON CONFLICT (user_id, place_id) DO NOTHING`,
      [userId, placeId]
    );
    return { placeId, favorited: true };
  }

  public async removeFavorite(
    userId: string,
    placeId: string
  ): Promise<{ placeId: string; favorited: false }> {
    await this.db.query(
      'DELETE FROM favorites WHERE user_id = $1 AND place_id = $2',
      [userId, placeId]
    );
    return { placeId, favorited: false };
  }

  // ----------------------------- Colecciones -------------------------------

  public async listCollections(userId: string): Promise<CollectionDTO[]> {
    const res = await this.db.query<CollectionRow>(
      `SELECT c.id, c.name, c.description, c.is_public, c.created_at,
              COUNT(ci.id) AS item_count
       FROM collections c
       LEFT JOIN collection_items ci ON ci.collection_id = c.id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return res.rows.map((r) => this.mapCollection(r));
  }

  public async createCollection(
    userId: string,
    input: CreateCollectionInput
  ): Promise<CollectionDTO> {
    try {
      const res = await this.db.query<CollectionRow>(
        `INSERT INTO collections (user_id, name, description, is_public)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, is_public, created_at, 0::text AS item_count`,
        [userId, input.name, input.description ?? null, input.isPublic]
      );
      return this.mapCollection(res.rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya tienes una colección con ese nombre.');
      }
      throw error;
    }
  }

  public async getCollection(
    userId: string,
    collectionId: string
  ): Promise<CollectionDTO> {
    const collection = await this.getOwnedCollection(userId, collectionId);
    const items = await this.db.query<{ place_id: string }>(
      `SELECT place_id FROM collection_items
       WHERE collection_id = $1 ORDER BY added_at DESC`,
      [collectionId]
    );
    const places: PlaceCardDTO[] = await this.catalog.getPlaceCardsByIds(
      items.rows.map((i) => i.place_id)
    );
    return { ...collection, itemCount: places.length, places };
  }

  public async updateCollection(
    userId: string,
    collectionId: string,
    input: UpdateCollectionInput
  ): Promise<CollectionDTO> {
    const current = await this.getOwnedCollection(userId, collectionId);
    const name = input.name ?? current.name;
    const description =
      input.description === undefined ? current.description : input.description;
    const isPublic = input.isPublic ?? current.isPublic;

    try {
      await this.db.query(
        `UPDATE collections
         SET name = $1, description = $2, is_public = $3, updated_at = NOW()
         WHERE id = $4 AND user_id = $5`,
        [name, description, isPublic, collectionId, userId]
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya tienes una colección con ese nombre.');
      }
      throw error;
    }
    return this.getOwnedCollection(userId, collectionId);
  }

  public async deleteCollection(
    userId: string,
    collectionId: string
  ): Promise<{ deleted: true }> {
    await this.getOwnedCollection(userId, collectionId);
    await this.db.query(
      'DELETE FROM collections WHERE id = $1 AND user_id = $2',
      [collectionId, userId]
    );
    return { deleted: true };
  }

  public async addCollectionItem(
    userId: string,
    collectionId: string,
    placeId: string
  ): Promise<CollectionDTO> {
    await this.getOwnedCollection(userId, collectionId);
    await this.assertPlaceExists(placeId);
    await this.db.query(
      `INSERT INTO collection_items (collection_id, place_id) VALUES ($1, $2)
       ON CONFLICT (collection_id, place_id) DO NOTHING`,
      [collectionId, placeId]
    );
    return this.getCollection(userId, collectionId);
  }

  public async removeCollectionItem(
    userId: string,
    collectionId: string,
    placeId: string
  ): Promise<CollectionDTO> {
    await this.getOwnedCollection(userId, collectionId);
    await this.db.query(
      'DELETE FROM collection_items WHERE collection_id = $1 AND place_id = $2',
      [collectionId, placeId]
    );
    return this.getCollection(userId, collectionId);
  }

  // ----------------------------- Utilidades --------------------------------

  /** Si la colección no existe o es de otro usuario responde 404 (sin revelar existencia). */
  private async getOwnedCollection(
    userId: string,
    collectionId: string
  ): Promise<CollectionDTO> {
    if (!/^[0-9a-f-]{36}$/i.test(collectionId)) {
      throw new NotFoundException('Colección no encontrada.');
    }
    const res = await this.db.query<CollectionRow>(
      `SELECT c.id, c.name, c.description, c.is_public, c.created_at,
              (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id) AS item_count
       FROM collections c
       WHERE c.id = $1 AND c.user_id = $2`,
      [collectionId, userId]
    );
    const row = res.rows[0];
    if (!row) {
      throw new NotFoundException('Colección no encontrada.');
    }
    return this.mapCollection(row);
  }

  private async assertPlaceExists(placeId: string): Promise<void> {
    if (!/^[0-9a-f-]{36}$/i.test(placeId)) {
      throw new NotFoundException('Lugar no encontrado en el catálogo.');
    }
    const res = await this.db.query<{ id: string }>(
      'SELECT id FROM places WHERE id = $1 AND is_active = TRUE',
      [placeId]
    );
    if (!res.rows[0]) {
      throw new NotFoundException('Lugar no encontrado en el catálogo.');
    }
  }

  private mapCollection(row: CollectionRow): CollectionDTO {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isPublic: row.is_public,
      itemCount: Number(row.item_count),
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}


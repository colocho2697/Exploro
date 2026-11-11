import { useCallback, useEffect, useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import {
  CollectionDTO,
  FavoriteItemDTO,
  PlaceCardDTO,
} from '@exploro/shared-types';

export interface LibraryState {
  favorites: FavoriteItemDTO[];
  favoriteIds: Set<string>;
  collections: CollectionDTO[];
  activeCollection: CollectionDTO | null;
  error: string | null;
  toggleFavorite: (place: PlaceCardDTO) => Promise<void>;
  removeFavorite: (placeId: string) => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  openCollection: (id: string | null) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addToCollection: (collectionId: string, place: PlaceCardDTO) => Promise<void>;
  removeFromCollection: (collectionId: string, placeId: string) => Promise<void>;
}

/** Favoritos y colecciones del usuario; solo consulta la API cuando hay sesión. */
export function useLibrary(
  client: ExploroApiClient,
  userId: string | null,
  guard: <T>(call: () => Promise<T>) => Promise<T>
): LibraryState {
  const [favorites, setFavorites] = useState<FavoriteItemDTO[]>([]);
  const [collections, setCollections] = useState<CollectionDTO[]>([]);
  const [activeCollection, setActiveCollection] = useState<CollectionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      setError(null);
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
      }
    },
    []
  );

  const refresh = useCallback(async (): Promise<void> => {
    const [favs, colls] = await guard(() =>
      Promise.all([client.listFavorites(), client.listCollections()])
    );
    setFavorites(favs);
    setCollections(colls);
  }, [client, guard]);

  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      setCollections([]);
      setActiveCollection(null);
      return;
    }
    void run(refresh);
  }, [userId, refresh, run]);

  const reloadActive = useCallback(
    async (id: string): Promise<void> => {
      setActiveCollection(await guard(() => client.getCollection(id)));
    },
    [client, guard]
  );

  return {
    favorites,
    favoriteIds: new Set(favorites.map((f) => f.placeId)),
    collections,
    activeCollection,
    error,
    toggleFavorite: (place) =>
      run(async () => {
        const isFav = favorites.some((f) => f.placeId === place.id);
        await guard(() =>
          isFav ? client.removeFavorite(place.id) : client.addFavorite(place.id)
        );
        await refresh();
      }),
    removeFavorite: (placeId) =>
      run(async () => {
        await guard(() => client.removeFavorite(placeId));
        await refresh();
      }),
    createCollection: (name) =>
      run(async () => {
        await guard(() => client.createCollection({ name }));
        await refresh();
      }),
    openCollection: (id) =>
      run(async () => {
        if (id === null) setActiveCollection(null);
        else await reloadActive(id);
      }),
    deleteCollection: (id) =>
      run(async () => {
        await guard(() => client.deleteCollection(id));
        setActiveCollection(null);
        await refresh();
      }),
    addToCollection: (collectionId, place) =>
      run(async () => {
        await guard(() => client.addCollectionItem(collectionId, place.id));
        await refresh();
      }),
    removeFromCollection: (collectionId, placeId) =>
      run(async () => {
        await guard(() => client.removeCollectionItem(collectionId, placeId));
        await refresh();
        await reloadActive(collectionId);
      }),
  };
}


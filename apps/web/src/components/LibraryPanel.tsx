'use client';

import React, { useState } from 'react';
import { CollectionDTO, FavoriteItemDTO } from '@exploro/shared-types';
import { useLanguage } from '../i18n';

interface Props {
  favorites: FavoriteItemDTO[];
  collections: CollectionDTO[];
  activeCollection: CollectionDTO | null;
  error: string | null;
  onCreateCollection: (name: string) => Promise<void>;
  onOpenCollection: (id: string | null) => void;
  onDeleteCollection: (id: string) => void;
  onRemoveItem: (collectionId: string, placeId: string) => void;
  onRemoveFavorite: (placeId: string) => void;
  onClose: () => void;
}

export function LibraryPanel({
  favorites,
  collections,
  activeCollection,
  error,
  onCreateCollection,
  onOpenCollection,
  onDeleteCollection,
  onRemoveItem,
  onRemoveFavorite,
  onClose,
}: Props): React.JSX.Element {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'favorites' | 'collections'>('favorites');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (name.trim().length < 2) return;
    setCreating(true);
    try {
      await onCreateCollection(name.trim());
      setName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="card" aria-label={t.library.asideAria} style={{ padding: '1rem', display: 'grid', gap: '.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button type="button" className={`chip ${tab === 'favorites' ? 'chip-active' : ''}`} onClick={() => setTab('favorites')}>
            {t.library.favoritesTab(favorites.length)}
          </button>
          <button type="button" className={`chip ${tab === 'collections' ? 'chip-active' : ''}`} onClick={() => setTab('collections')}>
            {t.library.collectionsTab(collections.length)}
          </button>
        </div>
        <button type="button" className="btn" onClick={onClose} aria-label={t.auth.closeAria}>✕</button>
      </div>

      {error && <div role="alert" className="alert alert-error">{error}</div>}

      {tab === 'favorites' &&
        (favorites.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem' }}>{t.library.emptyFavorites}</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: '.5rem' }}>
            {favorites.map((f) => (
              <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.88rem' }}>
                <span>{f.place.name} <span style={{ color: 'var(--text-secondary)' }}>— {f.place.cityName}</span></span>
                <button type="button" className="btn btn-danger" onClick={() => onRemoveFavorite(f.placeId)} aria-label={`${t.library.remove} ${f.place.name}`}>{t.library.remove}</button>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'collections' && (
        <>
          <form onSubmit={create} style={{ display: 'flex', gap: '.5rem' }}>
            <label style={{ flex: 1 }}>
              <span className="sr-only">{t.library.newCollectionPlaceholder}</span>
              <input className="field" placeholder={t.library.newCollectionPlaceholder} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={creating || name.trim().length < 2}>{t.library.create}</button>
          </form>

          {activeCollection ? (
            <div style={{ display: 'grid', gap: '.5rem' }}>
              <button type="button" className="btn" onClick={() => onOpenCollection(null)}>{t.library.allCollections}</button>
              <strong>{activeCollection.name}</strong>
              {(activeCollection.places?.length ?? 0) === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem' }}>{t.library.emptyCollection}</p>
              ) : (
                <ul style={{ listStyle: 'none', display: 'grid', gap: '.5rem' }}>
                  {activeCollection.places?.map((p) => (
                    <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.88rem' }}>
                      <span>{p.name}</span>
                      <button type="button" className="btn btn-danger" onClick={() => onRemoveItem(activeCollection.id, p.id)} aria-label={`${t.library.remove} ${p.name}`}>{t.library.remove}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : collections.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem' }}>{t.library.noCollections}</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'grid', gap: '.5rem' }}>
              {collections.map((c) => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.88rem' }}>
                  <button type="button" className="btn" onClick={() => onOpenCollection(c.id)} style={{ flex: 1, textAlign: 'left' }}>
                    {c.name} ({c.itemCount})
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    aria-label={`${t.library.delete} ${c.name}`}
                    onClick={() => { if (window.confirm(t.library.confirmDeleteCollection(c.name))) onDeleteCollection(c.id); }}
                  >
                    {t.library.delete}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}


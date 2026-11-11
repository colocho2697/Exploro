'use client';

import React, { useState } from 'react';
import { CollectionDTO, FavoriteItemDTO } from '@exploro/shared-types';

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
    <aside className="card" aria-label="Mis listas" style={{ padding: '1rem', display: 'grid', gap: '.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button type="button" className={`chip ${tab === 'favorites' ? 'chip-active' : ''}`} onClick={() => setTab('favorites')}>
            Favoritos ({favorites.length})
          </button>
          <button type="button" className={`chip ${tab === 'collections' ? 'chip-active' : ''}`} onClick={() => setTab('collections')}>
            Colecciones ({collections.length})
          </button>
        </div>
        <button type="button" className="btn" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>

      {error && <div role="alert" className="alert alert-error">{error}</div>}

      {tab === 'favorites' &&
        (favorites.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem' }}>Aún no guardaste lugares. Pulsa ♡ en una tarjeta.</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'grid', gap: '.5rem' }}>
            {favorites.map((f) => (
              <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.88rem' }}>
                <span>{f.place.name} <span style={{ color: 'var(--text-secondary)' }}>— {f.place.cityName}</span></span>
                <button type="button" className="btn btn-danger" onClick={() => onRemoveFavorite(f.placeId)} aria-label={`Quitar ${f.place.name}`}>Quitar</button>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'collections' && (
        <>
          <form onSubmit={create} style={{ display: 'flex', gap: '.5rem' }}>
            <label style={{ flex: 1 }}>
              <span className="sr-only">Nombre de la colección</span>
              <input className="field" placeholder="Nueva colección (ej. Fin de semana en Miami)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={creating || name.trim().length < 2}>Crear</button>
          </form>

          {activeCollection ? (
            <div style={{ display: 'grid', gap: '.5rem' }}>
              <button type="button" className="btn" onClick={() => onOpenCollection(null)}>← Todas las colecciones</button>
              <strong>{activeCollection.name}</strong>
              {(activeCollection.places?.length ?? 0) === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem' }}>Esta colección está vacía.</p>
              ) : (
                <ul style={{ listStyle: 'none', display: 'grid', gap: '.5rem' }}>
                  {activeCollection.places?.map((p) => (
                    <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.88rem' }}>
                      <span>{p.name}</span>
                      <button type="button" className="btn btn-danger" onClick={() => onRemoveItem(activeCollection.id, p.id)} aria-label={`Quitar ${p.name} de la colección`}>Quitar</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : collections.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem' }}>Todavía no tienes colecciones.</p>
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
                    aria-label={`Eliminar colección ${c.name}`}
                    onClick={() => { if (window.confirm(`¿Eliminar la colección «${c.name}»? Los lugares no se eliminan.`)) onDeleteCollection(c.id); }}
                  >
                    Eliminar
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


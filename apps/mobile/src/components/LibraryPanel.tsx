import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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

  const create = async (): Promise<void> => {
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
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setTab('favorites')}
            style={[
              styles.chip,
              tab === 'favorites' ? styles.chipActive : styles.chipInactive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                tab === 'favorites' ? styles.chipTextActive : styles.chipTextInactive,
              ]}
            >
              {t.library.favoritesTab(favorites.length)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('collections')}
            style={[
              styles.chip,
              tab === 'collections' ? styles.chipActive : styles.chipInactive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                tab === 'collections' ? styles.chipTextActive : styles.chipTextInactive,
              ]}
            >
              {t.library.collectionsTab(collections.length)}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel={t.auth.closeAria}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      {Boolean(error) && (
        <View style={styles.errorAlert}>
          <Text style={styles.errorAlertText}>{error}</Text>
        </View>
      )}

      {tab === 'favorites' &&
        (favorites.length === 0 ? (
          <Text style={styles.emptyText}>{t.library.emptyFavorites}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {favorites.map((f) => (
              <View key={f.id} style={styles.listRow}>
                <Text style={styles.listItemText} numberOfLines={1}>
                  {f.place.name}{' '}
                  <Text style={{ color: '#475569' }}>— {f.place.cityName}</Text>
                </Text>
                <Pressable
                  onPress={() => onRemoveFavorite(f.placeId)}
                  style={styles.dangerBtn}
                >
                  <Text style={styles.dangerBtnText}>{t.library.remove}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))}

      {tab === 'collections' && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.field, { flex: 1 }]}
              placeholder={t.library.newCollectionPlaceholder}
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              maxLength={80}
            />
            <Pressable
              onPress={() => void create()}
              disabled={creating || name.trim().length < 2}
              style={[
                styles.primaryBtn,
                (creating || name.trim().length < 2) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.primaryBtnText}>{t.library.create}</Text>
            </Pressable>
          </View>

          {activeCollection ? (
            <View style={{ gap: 8 }}>
              <Pressable
                onPress={() => onOpenCollection(null)}
                style={styles.outlineBtn}
              >
                <Text style={styles.outlineBtnText}>{t.library.allCollections}</Text>
              </Pressable>
              <Text style={{ fontWeight: '800', fontSize: 15, color: '#0f172a' }}>
                {activeCollection.name}
              </Text>
              {(activeCollection.places?.length ?? 0) === 0 ? (
                <Text style={styles.emptyText}>{t.library.emptyCollection}</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {activeCollection.places?.map((p) => (
                    <View key={p.id} style={styles.listRow}>
                      <Text style={styles.listItemText}>{p.name}</Text>
                      <Pressable
                        onPress={() => onRemoveItem(activeCollection.id, p.id)}
                        style={styles.dangerBtn}
                      >
                        <Text style={styles.dangerBtnText}>{t.library.remove}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : collections.length === 0 ? (
            <Text style={styles.emptyText}>{t.library.noCollections}</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {collections.map((c) => (
                <View key={c.id} style={styles.listRow}>
                  <Pressable
                    onPress={() => onOpenCollection(c.id)}
                    style={[styles.outlineBtn, { flex: 1 }]}
                  >
                    <Text style={styles.outlineBtnText}>
                      {c.name} ({c.itemCount})
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        t.library.delete,
                        t.library.confirmDeleteCollection(c.name),
                        [
                          { text: t.detail.cancel, style: 'cancel' },
                          {
                            text: t.library.delete,
                            style: 'destructive',
                            onPress: () => onDeleteCollection(c.id),
                          },
                        ]
                      );
                    }}
                    style={styles.dangerBtn}
                  >
                    <Text style={styles.dangerBtnText}>{t.library.delete}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ebebeb',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipActive: {
    borderWidth: 1.5,
    borderColor: '#222222',
    backgroundColor: '#222222',
  },
  chipInactive: {
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipTextInactive: {
    color: '#0f172a',
  },
  closeBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderBottomWidth: 3,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorAlert: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorAlertText: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: '#475569',
    fontSize: 14,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  dangerBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    borderBottomWidth: 3,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dangerBtnText: {
    color: '#e11d48',
    fontSize: 12.5,
    fontWeight: '700',
  },
  field: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#d4d4d8',
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 13,
    fontSize: 13.5,
  },
  primaryBtn: {
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderBottomWidth: 3.5,
    borderBottomColor: '#047857',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  outlineBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderBottomWidth: 3,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  outlineBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
});

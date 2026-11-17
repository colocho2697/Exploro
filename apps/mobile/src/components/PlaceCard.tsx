import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExploroApiClient } from '@exploro/api-client';
import { CollectionDTO, Coordinates, PlaceCardDTO } from '@exploro/shared-types';
import {
  computeMultiSourceScore,
  formatCleanPrice,
  formatDistanceKm,
  getPlacePhotoGallery,
  parseRecommendationReason,
} from '../format';
import { SupportedLocale, useLanguage } from '../i18n';
import { PlaceDetail } from './PlaceDetail';

interface Props {
  place: PlaceCardDTO;
  rank?: number;
  client: ExploroApiClient;
  isFavorite: boolean;
  isLoggedIn: boolean;
  collections: CollectionDTO[];
  highlight?: boolean;
  onToggleFavorite: (place: PlaceCardDTO) => void;
  onAddToCollection: (collectionId: string, place: PlaceCardDTO) => void;
  onRequireLogin: () => void;
  onCalculateRoute?: (coords: Coordinates, name: string) => void;
  userOrigin?: string | null;
}

function formatPriceRange(place: PlaceCardDTO, locale: SupportedLocale): string {
  return formatCleanPrice(
    place.priceStatus === 'CONFIRMED' ? place.avgPriceMin : null,
    place.priceStatus === 'CONFIRMED' ? place.avgPriceMax : null,
    place.currencyCode,
    place.priceTier,
    locale
  );
}

export function PlaceCard({
  place,
  rank,
  client,
  isFavorite,
  isLoggedIn,
  collections: _collections,
  highlight = false,
  onToggleFavorite,
  onAddToCollection: _onAddToCollection,
  onRequireLogin,
  onCalculateRoute,
  userOrigin,
}: Props): React.JSX.Element {
  const { locale, t } = useLanguage();
  const [openDetail, setOpenDetail] = useState(false);
  const distanceLabel = formatDistanceKm(place.distanceMeters);
  const score = computeMultiSourceScore(place, locale);
  const parsedReason = parseRecommendationReason(place.recommendationReason, locale, {
    categorySlug: place.categorySlug,
    cityName: place.cityName,
    mapsStars: score.mapsStars,
  });
  const heroPhoto = getPlacePhotoGallery(place)[0]!;
  const [photoSrc, setPhotoSrc] = useState(heroPhoto);
  const cleanTitle = place.name.replace(/^\d+\.\s*/, '');

  useEffect(() => {
    setPhotoSrc(heroPhoto);
  }, [heroPhoto]);

  return (
    <>
      <Pressable
        onPress={() => setOpenDetail(true)}
        style={[
          styles.card,
          highlight ? styles.cardHighlight : styles.cardNormal,
        ]}
      >
        {/* Imagen superior estilo Airbnb con badges flotantes */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photoSrc }}
            onError={() => {
              const fallback =
                'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';
              if (photoSrc !== fallback) {
                setPhotoSrc(fallback);
              }
            }}
            style={styles.heroImg}
            resizeMode="cover"
          />

          {/* Ranking + Puntaje Multi-Fuente en esquina superior izquierda */}
          <View style={styles.topLeftBadges}>
            {rank !== undefined && (
              <View
                style={[
                  styles.rankBadge,
                  rank === 1 ? styles.rankBadgeTop : styles.rankBadgeOther,
                ]}
              >
                <Text
                  style={[
                    styles.rankBadgeText,
                    rank === 1
                      ? styles.rankBadgeTextTop
                      : styles.rankBadgeTextOther,
                  ]}
                >
                  {rank === 1 ? t.card.topPick : `#${rank}`}
                </Text>
              </View>
            )}

            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>
                {score.totalScore} {t.card.pointsSuffix}
              </Text>
            </View>
          </View>

          {/* Botón corazón estilo Airbnb esquina superior derecha */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (isLoggedIn) onToggleFavorite(place);
              else onRequireLogin();
            }}
            accessibilityLabel={t.card.saveFavoriteAria}
            style={styles.favoriteCircleBtn}
          >
            <Text
              style={[
                styles.favoriteIconText,
                { color: isFavorite ? '#ef4444' : '#222222' },
              ]}
            >
              {isFavorite ? '♥' : '♡'}
            </Text>
          </Pressable>

          {/* Píldora de distancia en esquina inferior izquierda */}
          {Boolean(distanceLabel) && (
            <View style={styles.distancePill}>
              <Text style={styles.distancePillText}>
                {t.card.distanceAway(distanceLabel!)}
              </Text>
            </View>
          )}
        </View>

        {/* Cuerpo editorial limpio estilo Airbnb + Píldoras de puntaje */}
        <View style={styles.body}>
          {/* Fila 1: Título + Estrellas Maps */}
          <View style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={2}>
              {cleanTitle}
            </Text>
            <Text style={styles.starsText}>★ {score.mapsStars}</Text>
          </View>

          <Text style={styles.addressText} numberOfLines={1}>
            {place.addressText ?? place.cityName} · {score.mapsReviewsLabel}
          </Text>

          {/* Desglose compacto del Puntaje Multi-Fuente (Maps + Reddit + Redes) */}
          <View style={styles.badgesRow}>
            <View style={styles.mapsPill}>
              <Text style={styles.mapsPillText}>
                {t.card.mapsBadge} {score.mapsPoints}/45
              </Text>
            </View>
            <View style={styles.redditPill}>
              <Text style={styles.redditPillText}>
                {t.card.redditBadge} {score.redditPoints}/30
              </Text>
            </View>
            <View style={styles.socialPill}>
              <Text style={styles.socialPillText}>
                {t.card.socialBadge} {score.socialPoints}/25
              </Text>
            </View>
          </View>

          {/* Razón asertiva adaptada nativamente */}
          <View style={styles.reasonBox}>
            <Text style={styles.reasonMainText}>
              {parsedReason.choiceReason}
            </Text>
            {Boolean(parsedReason.caveat) && (
              <Text style={styles.reasonCaveatText}>
                {parsedReason.caveat}
              </Text>
            )}
          </View>

          {/* Pie de tarjeta: Precio + Ver detalles (abre vista Airbnb) */}
          <View style={styles.footerRow}>
            <View style={styles.priceWrap}>
              <Text style={styles.priceText}>
                {formatPriceRange(place, locale)}
              </Text>
              <Text style={styles.perPersonText}> · {t.card.perPerson}</Text>
            </View>

            <Text style={styles.viewDetailsText}>{t.card.viewDetails}</Text>
          </View>
        </View>
      </Pressable>

      {openDetail && (
        <PlaceDetail
          slug={place.slug}
          initialCard={place}
          client={client}
          isFavorite={isFavorite}
          onToggleFavorite={() =>
            isLoggedIn ? onToggleFavorite(place) : onRequireLogin()
          }
          onClose={() => setOpenDetail(false)}
          onCalculateRoute={onCalculateRoute}
          userOrigin={userOrigin}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  cardNormal: {
    borderWidth: 1.5,
    borderColor: '#ebebeb',
  },
  cardHighlight: {
    borderWidth: 2.5,
    borderColor: '#10b981',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 205,
    backgroundColor: '#f4f4f5',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  topLeftBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  rankBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  rankBadgeTop: {
    backgroundColor: '#10b981',
  },
  rankBadgeOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  rankBadgeTextTop: {
    color: '#ffffff',
  },
  rankBadgeTextOther: {
    color: '#222222',
  },
  scoreBadge: {
    backgroundColor: 'rgba(34, 34, 34, 0.86)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  scoreBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  favoriteCircleBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  favoriteIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  distancePill: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  distancePillText: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    paddingTop: 15,
    paddingHorizontal: 17,
    paddingBottom: 17,
    gap: 9,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleText: {
    flex: 1,
    fontSize: 16.8,
    fontWeight: '800',
    color: '#222222',
    lineHeight: 21,
  },
  starsText: {
    fontSize: 13.8,
    fontWeight: '800',
    color: '#222222',
  },
  addressText: {
    fontSize: 12.8,
    color: '#717171',
    marginTop: -3,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mapsPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  mapsPillText: {
    fontSize: 11.4,
    fontWeight: '800',
    color: '#0369a1',
  },
  redditPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  redditPillText: {
    fontSize: 11.4,
    fontWeight: '800',
    color: '#c2410c',
  },
  socialPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  socialPillText: {
    fontSize: 11.4,
    fontWeight: '800',
    color: '#15803d',
  },
  reasonBox: {
    backgroundColor: '#f7f7f9',
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  reasonMainText: {
    fontSize: 13,
    color: '#222222',
    fontWeight: '700',
    lineHeight: 18,
  },
  reasonCaveatText: {
    color: '#b45309',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },
  footerRow: {
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontWeight: '800',
    fontSize: 14.8,
    color: '#222222',
    textDecorationLine: 'underline',
  },
  perPersonText: {
    fontSize: 12.2,
    color: '#717171',
  },
  viewDetailsText: {
    fontSize: 13.2,
    fontWeight: '800',
    color: '#10b981',
  },
});

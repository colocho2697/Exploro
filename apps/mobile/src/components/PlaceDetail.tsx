import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ExploroApiClient } from '@exploro/api-client';
import {
  ActivityLogDTO,
  PlaceCardDTO,
  PlaceDetailDTO,
  UserReviewDTO,
} from '@exploro/shared-types';
import {
  buildGoogleMapsUrl,
  buildWazeUrl,
  computeMultiSourceScore,
  formatCleanPrice,
  formatDistanceKm,
  getLocalizedPlaceDescription,
  getPlacePhotoDetails,
  parseRecommendationReason,
} from '../format';
import { NativeDictionary, useLanguage } from '../i18n';
import { BackpackerLoader } from './BackpackerLoader';

interface PlaceDetailProps {
  client: ExploroApiClient;
  slug: string;
  initialCard?: PlaceCardDTO;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClose?: () => void;
  onCalculateRoute?: (coords: { lat: number; lng: number }, name: string) => void;
  userOrigin?: string | null;
}

function getCategorySubtitleLines(
  place: Pick<
    PlaceCardDTO,
    'categorySlug' | 'categoryName' | 'subcategorySlug' | 'subcategoryName' | 'cityName' | 'tags'
  >,
  detail: PlaceDetailDTO | null,
  t: NativeDictionary
): { line1: string; line2: string; highlightIcon: string; highlightTitle: string } {
  const cleanTags = (place.tags ?? [])
    .filter(
      (tag): tag is string =>
        typeof tag === 'string' &&
        !tag.startsWith('★') &&
        !tag.startsWith('🏆') &&
        !tag.startsWith('(') &&
        !tag.startsWith('pts:') &&
        !tag.startsWith('gp_photos:') &&
        !tag.startsWith('fsq_photos:')
    )
    .slice(0, 3);

  const subT = t.detail.categorySubtitles;

  switch (place.categorySlug) {
    case 'comida': {
      const validSpecs = (detail?.establishment?.specialties ?? [])
        .filter(
          (s): s is string =>
            typeof s === 'string' && s.trim().length > 0 && !s.startsWith('{')
        )
        .slice(0, 3);
      const specs = validSpecs.length > 0 ? validSpecs : cleanTags;
      return {
        line1: subT.comida.line1(place.cityName),
        line2: specs.length > 0 ? specs.join(' · ') : subT.comida.defaultLine2,
        highlightIcon: '🍽️',
        highlightTitle: subT.comida.highlightTitle,
      };
    }
    case 'turismo': {
      const act = detail?.activities?.[0];
      const duration = act?.estimatedDurationMins
        ? subT.turismo.duration(act.estimatedDurationMins)
        : subT.turismo.defaultDuration;
      const timeLabel = act?.bestTimeOfDay
        ? `${subT.turismo.bestTimePrefix}: ${t.detail.timeOfDay[act.bestTimeOfDay] ?? act.bestTimeOfDay}`
        : subT.turismo.defaultTime;
      const subName =
        (place.subcategorySlug && t.subcategories[place.subcategorySlug]) ??
        place.subcategoryName;
      return {
        line1: subT.turismo.line1(subName, place.cityName),
        line2: `${duration} · ${timeLabel} · ${cleanTags[0] ?? subT.turismo.defaultAccess}`,
        highlightIcon: '🌄',
        highlightTitle: subT.turismo.highlightTitle,
      };
    }
    case 'entretenimiento':
      return {
        line1: subT.entretenimiento.line1(place.cityName),
        line2:
          cleanTags.length > 0
            ? cleanTags.join(' · ')
            : subT.entretenimiento.defaultLine2,
        highlightIcon: '🎭',
        highlightTitle: subT.entretenimiento.highlightTitle,
      };
    case 'actividades': {
      const act = detail?.activities?.[0];
      const duration = act?.estimatedDurationMins
        ? subT.actividades.duration(act.estimatedDurationMins)
        : subT.actividades.defaultDuration;
      return {
        line1: subT.actividades.line1(place.cityName),
        line2: `${duration} · ${subT.actividades.safeRoute} · ${cleanTags.join(' · ') || subT.actividades.defaultNature}`,
        highlightIcon: '🛶',
        highlightTitle: subT.actividades.highlightTitle,
      };
    }
    case 'eventos':
      return {
        line1: subT.eventos.line1(place.cityName),
        line2:
          cleanTags.length > 0 ? cleanTags.join(' · ') : subT.eventos.defaultLine2,
        highlightIcon: '🎪',
        highlightTitle: subT.eventos.highlightTitle,
      };
    case 'compras':
    default:
      return {
        line1: subT.compras.line1(place.cityName),
        line2:
          cleanTags.length > 0 ? cleanTags.join(' · ') : subT.compras.defaultLine2,
        highlightIcon: '🛍️',
        highlightTitle: subT.compras.highlightTitle,
      };
  }
}

export function PlaceDetail({
  client,
  slug,
  initialCard,
  isFavorite = false,
  onToggleFavorite,
  onClose,
  onCalculateRoute: _onCalculateRoute,
  userOrigin,
}: PlaceDetailProps): React.JSX.Element {
  const { locale, t } = useLanguage();
  const [detail, setDetail] = useState<PlaceDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  const [activeActivity, setActiveActivity] = useState<ActivityLogDTO | null>(null);
  const [placeReviews, setPlaceReviews] = useState<UserReviewDTO[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [recommendedItem, setRecommendedItem] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    setPhotoIndex(0);

    client
      .getPlaceBySlug(slug)
      .then(async (d) => {
        if (cancelled) return;
        setDetail(d);
        try {
          const revs = await client.getPlaceReviews(d.id).catch(() => []);
          if (!cancelled) {
            setPlaceReviews(revs);
          }
        } catch {
          // Respaldo silencioso
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t.detail.loadError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, slug, t.detail.loadError]);

  const activePlace: PlaceCardDTO | null = detail ?? initialCard ?? null;
  const photoDetails = activePlace ? getPlacePhotoDetails(activePlace) : [];
  const currentPhotoInfo = photoDetails[photoIndex] ?? photoDetails[0];
  const currentPhoto =
    currentPhotoInfo?.url ??
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';
  const [photoSrc, setPhotoSrc] = useState(currentPhoto);
  const photos = photoDetails.map((p) => p.url);

  useEffect(() => {
    setPhotoSrc(currentPhoto);
  }, [currentPhoto]);

  if (!activePlace) {
    return (
      <Modal visible animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={{ padding: 36, alignItems: 'center' }}>
              <BackpackerLoader
                message={t.detail.loadingTitle}
                submessage={t.detail.loadingSubtitle}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const score = computeMultiSourceScore(activePlace, locale);
  const parsedReason = parseRecommendationReason(activePlace.recommendationReason, locale, {
    categorySlug: activePlace.categorySlug,
    cityName: activePlace.cityName,
    mapsStars: score.mapsStars,
  });
  const localizedDescription = getLocalizedPlaceDescription(activePlace, score, locale);
  const distanceLabel = formatDistanceKm(activePlace.distanceMeters);
  const catInfo = getCategorySubtitleLines(activePlace, detail, t);
  const cleanTitle = activePlace.name.replace(/^\d+\.\s*/, '');
  const localizedCategoryName =
    t.categories[activePlace.categorySlug] ?? activePlace.categoryName;

  const googleMapsUrl = buildGoogleMapsUrl(
    activePlace.coordinates.lat,
    activePlace.coordinates.lng,
    {
      name: cleanTitle,
      addressText: activePlace.addressText,
      cityName: activePlace.cityName,
      origin: userOrigin ?? undefined,
    }
  );
  const wazeUrl = buildWazeUrl(
    activePlace.coordinates.lat,
    activePlace.coordinates.lng,
    {
      name: cleanTitle,
      cityName: activePlace.cityName,
    }
  );

  const handleShare = async (): Promise<void> => {
    try {
      await Share.share({
        message: `${cleanTitle} — ${activePlace.addressText ?? activePlace.cityName}\n${googleMapsUrl}`,
      });
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Ignorar
    }
  };

  const handleStartActivity = async (): Promise<void> => {
    try {
      const started = await client.startActivity({
        placeId: activePlace.id,
        activityTitle: `Visita a ${cleanTitle}`,
      });
      setActiveActivity(started);
      setShowReviewModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.detail.loginToReview);
    }
  };

  const handleCompleteReview = async (): Promise<void> => {
    if (!activeActivity) return;
    setSubmittingReview(true);
    try {
      const isRestaurant = activePlace.categorySlug === 'comida';
      const createdReview = await client.completeActivityWithReview(activeActivity.id, {
        reviewType: isRestaurant ? 'RESTAURANT' : 'TOURISM',
        restaurantReview: isRestaurant
          ? {
              tasteQuality: 5,
              serviceRating: 5,
              valueForMoney: 'EXCELLENT',
              recommendedDish: recommendedItem,
              wouldReturn: true,
              comment,
            }
          : undefined,
        tourismReview: !isRestaurant
          ? {
              worthIt: true,
              durationSpent: '1_TO_2_HOURS',
              accessibility: 'EASY',
              recommendedItem,
              comment,
            }
          : undefined,
        wouldReturnOrRecommend: true,
        generalComment: comment,
      });

      setActiveActivity(null);
      setShowReviewModal(false);
      setPlaceReviews((prev) => [createdReview, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.detail.reviewSubmitError);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.modalCard}>
          {/* Área desplazable: Carrusel de Fotos arriba + Hoja Redondeada abajo */}
          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. CARRUSEL SUPERIOR DE FOTOS ESTILO AIRBNB */}
            <View style={styles.carouselBox}>
              <Image
                source={{ uri: photoSrc }}
                onError={() => {
                  const fallback =
                    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';
                  if (photoSrc !== fallback) {
                    setPhotoSrc(fallback);
                  }
                }}
                style={styles.heroImage}
                resizeMode="cover"
              />

              {/* Barra flotante superior: ← Volver a la izquierda | ⤴ Compartir y ♡ Favorito a la derecha */}
              <View style={styles.floatingTopBar}>
                {onClose ? (
                  <Pressable
                    onPress={onClose}
                    accessibilityLabel={t.detail.backAria}
                    style={styles.circleIconBtn}
                  >
                    <Text style={styles.circleIconText}>←</Text>
                  </Pressable>
                ) : (
                  <View />
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => void handleShare()}
                    accessibilityLabel={t.detail.shareAria}
                    style={styles.circleIconBtn}
                  >
                    <Text style={styles.circleIconText}>
                      {shareCopied ? '✓' : '⤴'}
                    </Text>
                  </Pressable>
                  {onToggleFavorite && (
                    <Pressable
                      onPress={onToggleFavorite}
                      accessibilityLabel={t.card.saveFavoriteAria}
                      style={styles.circleIconBtn}
                    >
                      <Text
                        style={[
                          styles.circleIconText,
                          { color: isFavorite ? '#ef4444' : '#222222' },
                        ]}
                      >
                        {isFavorite ? '♥' : '♡'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Controles laterales de galería */}
              {photos.length > 1 && (
                <>
                  <Pressable
                    onPress={() =>
                      setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
                    }
                    accessibilityLabel={t.detail.photoPrevAria}
                    style={[styles.arrowBtn, { left: 12 }]}
                  >
                    <Text style={styles.arrowBtnText}>‹</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setPhotoIndex((prev) => (prev + 1) % photos.length)
                    }
                    accessibilityLabel={t.detail.photoNextAria}
                    style={[styles.arrowBtn, { right: 12 }]}
                  >
                    <Text style={styles.arrowBtnText}>›</Text>
                  </Pressable>
                </>
              )}

              {/* Badge transparente con origen real de la foto */}
              <View style={styles.photoAttributionBadge}>
                <Text style={styles.photoAttributionText} numberOfLines={1}>
                  {currentPhotoInfo?.isVerifiedReal
                    ? t.detail.verifiedPhoto(currentPhotoInfo.authorName)
                    : t.detail.illustrativePhoto}
                </Text>
              </View>

              {/* Contador de fotos esquina inferior derecha */}
              <View style={styles.photoCounterBadge}>
                <Text style={styles.photoCounterText}>
                  {photoIndex + 1} / {photos.length}
                </Text>
              </View>
            </View>

            {/* 2. HOJA BLANCA REDONDEADA SUPERPUESTA CON DETALLES ADAPTADOS POR CATEGORÍA */}
            <View style={styles.sheetContainer}>
              {/* Miniaturas rápidas de fotos */}
              <View style={styles.thumbnailsRow}>
                {photos.map((url, idx) => (
                  <Pressable
                    key={`${url}-${idx}`}
                    onPress={() => setPhotoIndex(idx)}
                    style={[
                      styles.thumbnailBtn,
                      idx === photoIndex
                        ? styles.thumbnailBtnActive
                        : styles.thumbnailBtnInactive,
                    ]}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.thumbnailImg}
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </View>

              {/* Título centrado + Subtítulo adaptado a la categoría + Línea ★ y reseñas */}
              <View style={styles.headerCenterBlock}>
                <Text style={styles.placeTitle}>{cleanTitle}</Text>

                <View style={{ alignItems: 'center', marginTop: 4 }}>
                  <Text style={styles.subtitleLine}>{catInfo.line1}</Text>
                  <Text style={[styles.subtitleLine, { marginTop: 2 }]}>
                    {catInfo.line2}
                  </Text>
                </View>

                <View style={styles.ratingRow}>
                  <Text style={styles.ratingBoldText}>★ {score.mapsStars}</Text>
                  <Text style={styles.ratingDot}>·</Text>
                  <Text style={[styles.ratingBoldText, { textDecorationLine: 'underline' }]}>
                    {score.mapsReviewsLabel}
                  </Text>
                  <Text style={styles.ratingDot}>·</Text>
                  <View style={styles.scoreGreenPill}>
                    <Text style={styles.scoreGreenPillText}>
                      {t.detail.scoreBadge(score.totalScore)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Bloque de Curaduría / Respaldo estilo Airbnb */}
              <View style={styles.curationRow}>
                <View style={styles.curationCheckCircle}>
                  <Text style={styles.curationCheckText}>✓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.curationTitle}>
                    {t.detail.verifiedRecommendation(localizedCategoryName)}
                  </Text>
                  <Text style={styles.curationSubtitle}>
                    {score.sourcesSummary}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* 3 FILAS DE DETALLES CON DISEÑO LIMPIO */}
              <View style={{ gap: 18 }}>
                {/* Fila 1: Ubicación y cercanía real */}
                <View style={styles.detailFeatureRow}>
                  <View style={[styles.featureIconBox, { backgroundColor: '#f4f4f5' }]}>
                    <Text style={{ fontSize: 15 }}>📍</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>
                      {activePlace.addressText ?? activePlace.cityName}
                      {distanceLabel ? ` · ${t.detail.distanceFromYou(distanceLabel)}` : ''}
                    </Text>
                    <Text style={styles.featureDesc}>
                      {t.detail.verifiedLocationHint}
                    </Text>
                  </View>
                </View>

                {/* Fila 2: Razón adaptada + Detalles específicos de la categoría */}
                <View style={styles.detailFeatureRow}>
                  <View style={[styles.featureIconBox, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={{ fontSize: 15, color: '#059669', fontWeight: '800' }}>★</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>
                      {parsedReason.choiceReason}
                    </Text>
                    <Text style={styles.featureDesc}>
                      {localizedDescription}
                    </Text>
                    {detail?.establishment &&
                      Array.isArray(detail.establishment.specialties) &&
                      detail.establishment.specialties.filter(
                        (s): s is string => typeof s === 'string' && !s.startsWith('{')
                      ).length > 0 && (
                        <View style={styles.specialtiesWrap}>
                          {detail.establishment.specialties
                            .filter(
                              (spec): spec is string =>
                                typeof spec === 'string' && !spec.startsWith('{')
                            )
                            .map((spec, sIdx) => (
                              <View key={`${spec}-${sIdx}`} style={styles.specialtyPill}>
                                <Text style={styles.specialtyPillText}>{spec}</Text>
                              </View>
                            ))}
                        </View>
                      )}
                    {detail?.activities && detail.activities.length > 0 && (
                      <View style={{ marginTop: 8, gap: 4 }}>
                        {detail.activities.map((act) => (
                          <Text key={act.id} style={styles.activityItemText}>
                            ✓ {act.title}
                            {act.estimatedDurationMins
                              ? ` (${act.estimatedDurationMins} min)`
                              : ''}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Fila 3: Desglose de Puntaje Multi-Fuente */}
                <View style={styles.detailFeatureRow}>
                  <View style={[styles.featureIconBox, { backgroundColor: '#f0f9ff' }]}>
                    <Text style={{ fontSize: 14, color: '#0284c7', fontWeight: '800' }}>%</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>
                      {t.detail.exploroScoreTitle(score.totalScore)}
                    </Text>

                    <View style={styles.scoreBreakdownCard}>
                      {/* Barra Google Maps */}
                      <View style={{ gap: 4 }}>
                        <View style={styles.barHeaderRow}>
                          <Text style={styles.barLabel}>
                            Google Maps ({score.mapsStars} ★ · {score.mapsReviewsLabel})
                          </Text>
                          <Text style={[styles.barValue, { color: '#0284c7' }]}>
                            {score.mapsPoints} / 45
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${Math.round((score.mapsPoints / 45) * 100)}%`,
                                backgroundColor: '#0284c7',
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Barra Reddit */}
                      <View style={{ gap: 4 }}>
                        <View style={styles.barHeaderRow}>
                          <Text style={styles.barLabel}>
                            {t.detail.redditCommunityLabel}
                          </Text>
                          <Text style={[styles.barValue, { color: '#ea580c' }]}>
                            {score.redditPoints} / 30
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${Math.round((score.redditPoints / 30) * 100)}%`,
                                backgroundColor: '#ea580c',
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Barra Redes Sociales & Guías */}
                      <View style={{ gap: 4 }}>
                        <View style={styles.barHeaderRow}>
                          <Text style={styles.barLabel}>
                            {t.detail.socialGuidesLabel}
                          </Text>
                          <Text style={[styles.barValue, { color: '#16a34a' }]}>
                            {score.socialPoints} / 25
                          </Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${Math.round((score.socialPoints / 25) * 100)}%`,
                                backgroundColor: '#16a34a',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>

                    {Boolean(parsedReason.caveat) && (
                      <View style={styles.caveatAlert}>
                        <Text style={styles.caveatAlertText}>
                          {t.detail.caveatPrefix}: {parsedReason.caveat}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Evidencias y comentarios verificados */}
              {detail && detail.evidences.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={{ gap: 10 }}>
                    <Text style={styles.sectionHeading}>
                      {t.detail.whatPeopleSay(detail.evidences.length + placeReviews.length)}
                    </Text>

                    {detail.evidences.map((ev) => (
                      <View key={ev.id} style={styles.evidenceBox}>
                        <Text style={styles.evidenceQuote}>
                          “{ev.extractedSnippet}”
                        </Text>
                        <Text style={styles.evidenceSource}>
                          {t.detail.sourceLabels[ev.sourceType] ?? ev.sourceName}
                        </Text>
                      </View>
                    ))}

                    {placeReviews.map((rev) => (
                      <View key={rev.id} style={styles.userReviewBox}>
                        <Text style={styles.userReviewAuthor}>
                          {rev.userName ?? t.detail.exploroTraveler} · {t.detail.ownExperience}
                        </Text>
                        {Boolean(rev.comment) && (
                          <Text style={styles.userReviewComment}>
                            “{rev.comment}”
                          </Text>
                        )}
                      </View>
                    ))}

                    <View style={{ marginTop: 6 }}>
                      {!showReviewModal ? (
                        <Pressable
                          onPress={() => void handleStartActivity()}
                          style={styles.outlineBtn}
                        >
                          <Text style={styles.outlineBtnText}>
                            {t.detail.rateThisPlaceBtn}
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={styles.reviewFormBox}>
                          <Text style={styles.reviewFormTitle}>
                            {t.detail.shareQuickReviewTitle}
                          </Text>
                          <TextInput
                            placeholder={t.detail.recommendedItemPlaceholder}
                            placeholderTextColor="#94a3b8"
                            value={recommendedItem}
                            onChangeText={setRecommendedItem}
                            style={styles.textInputField}
                          />
                          <TextInput
                            placeholder={t.detail.commentPlaceholder}
                            placeholderTextColor="#94a3b8"
                            value={comment}
                            onChangeText={setComment}
                            multiline
                            style={[styles.textInputField, { minHeight: 64 }]}
                          />
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                              onPress={() => void handleCompleteReview()}
                              disabled={submittingReview}
                              style={styles.primaryGreenBtn}
                            >
                              <Text style={styles.primaryGreenBtnText}>
                                {submittingReview ? t.detail.publishing : t.detail.publish}
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => setShowReviewModal(false)}
                              style={styles.outlineBtn}
                            >
                              <Text style={styles.outlineBtnText}>
                                {t.detail.cancel}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </>
              )}

              {Boolean(error) && (
                <View style={styles.warnAlert}>
                  <Text style={styles.warnAlertText}>{error}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* 3. BARRA INFERIOR FIJA ESTILO AIRBNB */}
          <View style={styles.bottomBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bottomPriceText}>
                {formatCleanPrice(
                  activePlace.avgPriceMin,
                  activePlace.avgPriceMax,
                  activePlace.currencyCode,
                  activePlace.priceTier,
                  locale
                )}
              </Text>
              <Text style={styles.bottomSubPriceText}>
                {activePlace.categorySlug === 'comida'
                  ? t.detail.avgPerPerson
                  : t.detail.estimatedCost}
                {distanceLabel ? ` · ${t.card.distanceAway(distanceLabel)}` : ''}
              </Text>
              <View style={styles.directRoutePill}>
                <Text style={styles.directRoutePillText}>
                  {t.detail.directRouteAvailable}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Pressable
                onPress={() => void Linking.openURL(googleMapsUrl)}
                style={styles.irAhoraBtn}
              >
                <Text style={styles.irAhoraBtnText}>{t.detail.goNowBtn}</Text>
              </Pressable>
              <Pressable
                onPress={() => void Linking.openURL(wazeUrl)}
                style={{ marginTop: 4 }}
              >
                <Text style={styles.wazeSubLink}>
                  {t.detail.orOpenIn}{' '}
                  <Text style={styles.wazeUnderline}>Waze</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(34, 34, 34, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    width: '100%',
    height: '94%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  carouselBox: {
    position: 'relative',
    width: '100%',
    height: 330,
    backgroundColor: '#f4f4f5',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingTopBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  circleIconText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222222',
  },
  arrowBtn: {
    position: 'absolute',
    top: '45%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  arrowBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222222',
    marginTop: -2,
  },
  photoAttributionBadge: {
    position: 'absolute',
    bottom: 38,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    maxWidth: '72%',
  },
  photoAttributionText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '600',
  },
  photoCounterBadge: {
    position: 'absolute',
    bottom: 38,
    right: 16,
    backgroundColor: 'rgba(34, 34, 34, 0.78)',
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 8,
  },
  photoCounterText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sheetContainer: {
    marginTop: -26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 32,
    gap: 18,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  thumbnailBtn: {
    width: 48,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnailBtnActive: {
    borderWidth: 2.5,
    borderColor: '#10b981',
    opacity: 1,
  },
  thumbnailBtnInactive: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    opacity: 0.65,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  headerCenterBlock: {
    alignItems: 'center',
    gap: 6,
  },
  placeTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#222222',
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitleLine: {
    color: '#717171',
    fontSize: 14.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  ratingRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  ratingBoldText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  ratingDot: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
  },
  scoreGreenPill: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  scoreGreenPillText: {
    color: '#15803d',
    fontSize: 12.5,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#ebebeb',
  },
  curationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  curationCheckCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  curationCheckText: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '800',
  },
  curationTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: '#222222',
  },
  curationSubtitle: {
    color: '#717171',
    fontSize: 13.5,
    marginTop: 2,
  },
  detailFeatureRow: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureTitle: {
    fontWeight: '800',
    fontSize: 15,
    color: '#222222',
    lineHeight: 20,
  },
  featureDesc: {
    color: '#717171',
    fontSize: 13.8,
    marginTop: 3,
    lineHeight: 19,
  },
  specialtiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  specialtyPill: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#f4f4f5',
  },
  specialtyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#222222',
  },
  activityItemText: {
    fontSize: 13,
    color: '#3f3f46',
    fontWeight: '600',
  },
  scoreBreakdownCard: {
    marginTop: 9,
    gap: 9,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  barHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  barLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#222222',
    flex: 1,
    paddingRight: 8,
  },
  barValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  caveatAlert: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  caveatAlertText: {
    color: '#b45309',
    fontSize: 12.8,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222222',
    marginBottom: 4,
  },
  evidenceBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f7f7f9',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  evidenceQuote: {
    color: '#222222',
    fontWeight: '500',
    fontSize: 13.5,
    lineHeight: 19,
  },
  evidenceSource: {
    fontSize: 12,
    color: '#717171',
    marginTop: 5,
    fontWeight: '700',
  },
  userReviewBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  userReviewAuthor: {
    fontWeight: '700',
    color: '#15803d',
    fontSize: 13.5,
  },
  userReviewComment: {
    color: '#222222',
    marginTop: 3,
    fontSize: 13.5,
  },
  outlineBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dddddd',
    borderBottomWidth: 3,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  reviewFormBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#f7f7f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    gap: 9,
  },
  reviewFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  textInputField: {
    backgroundColor: '#ffffff',
    color: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  primaryGreenBtn: {
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderBottomWidth: 3.5,
    borderBottomColor: '#047857',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  primaryGreenBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  warnAlert: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warnAlertText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#ebebeb',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  bottomPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222222',
    textDecorationLine: 'underline',
  },
  bottomSubPriceText: {
    fontSize: 12.5,
    color: '#717171',
    marginTop: 2,
  },
  directRoutePill: {
    alignSelf: 'flex-start',
    marginTop: 5,
    backgroundColor: '#f4f4f5',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  directRoutePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#222222',
  },
  irAhoraBtn: {
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderBottomWidth: 4,
    borderBottomColor: '#047857',
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 999,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  irAhoraBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15.5,
  },
  wazeSubLink: {
    fontSize: 11.5,
    color: '#717171',
  },
  wazeUnderline: {
    color: '#222222',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

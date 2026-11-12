'use client';

import React, { useEffect, useState } from 'react';
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
  formatDistanceKm,
  getPlacePhotoDetails,
  parseRecommendationReason,
} from '../lib/format';


const TIME_OF_DAY: Record<string, string> = {
  MORNING: 'Mañana',
  AFTERNOON: 'Tarde / Atardecer',
  NIGHT: 'Noche',
  ANY: 'Cualquier hora',
};

const SOURCE_LABELS: Record<string, string> = {
  EXTERNAL_COMMUNITY: 'Reddit & Comunidad',
  BLOG: 'Blog independiente',
  NATIVE_EXPERIENCE: 'Visita verificada Exploro',
  CURATED: 'Guía local & Redes',
};

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
    'categorySlug' | 'categoryName' | 'subcategoryName' | 'cityName' | 'tags'
  >,
  detail: PlaceDetailDTO | null
): { line1: string; line2: string; highlightIcon: string; highlightTitle: string } {
  const cleanTags = place.tags
    .filter((t) => !t.startsWith('★') && !t.startsWith('🏆'))
    .slice(0, 3);

  switch (place.categorySlug) {
    case 'comida': {
      const specs = detail?.establishment?.specialties?.slice(0, 3) ?? cleanTags;
      return {
        line1: `Restaurante recomendado en ${place.cityName}`,
        line2:
          specs.length > 0
            ? specs.join(' · ')
            : 'Sabor verificado · Buena relación calidad-precio · Menú local',
        highlightIcon: '🍽️',
        highlightTitle: 'Especialidades y propuesta gastronómica',
      };
    }
    case 'turismo': {
      const act = detail?.activities?.[0];
      const duration = act?.estimatedDurationMins
        ? `${act.estimatedDurationMins} min de recorrido`
        : 'Recorrido panorámico';
      const timeLabel = act?.bestTimeOfDay
        ? `Ideal en: ${TIME_OF_DAY[act.bestTimeOfDay] ?? act.bestTimeOfDay}`
        : 'Aire libre y fotografía';
      return {
        line1: `${place.subcategoryName ?? 'Destino turístico'} en ${place.cityName}`,
        line2: `${duration} · ${timeLabel} · ${cleanTags[0] ?? 'Acceso verificado'}`,
        highlightIcon: '🌄',
        highlightTitle: 'Experiencia turística y recorrido sugerido',
      };
    }
    case 'entretenimiento':
      return {
        line1: `Entretenimiento y vida cultural en ${place.cityName}`,
        line2:
          cleanTags.length > 0
            ? cleanTags.join(' · ')
            : 'Ambiente seguro · Ideal con amigos o pareja',
        highlightIcon: '🎭',
        highlightTitle: 'Ambiente, cartelera y experiencia nocturna',
      };
    case 'actividades': {
      const act = detail?.activities?.[0];
      const duration = act?.estimatedDurationMins
        ? `Duración: ${act.estimatedDurationMins} min`
        : 'Actividad al aire libre';
      return {
        line1: `Actividad recreativa y deportiva en ${place.cityName}`,
        line2: `${duration} · Ruta segura · ${cleanTags.join(' · ') || 'Contacto con naturaleza'}`,
        highlightIcon: '🛶',
        highlightTitle: 'Detalles de la ruta, duración y nivel físico',
      };
    }
    case 'eventos':
      return {
        line1: `Agenda cultural y evento en ${place.cityName}`,
        line2:
          cleanTags.length > 0
            ? cleanTags.join(' · ')
            : 'Música en vivo · Gastronomía · Diseño local',
        highlightIcon: '🎪',
        highlightTitle: 'Qué encontrarás en este evento',
      };
    case 'compras':
    default:
      return {
        line1: `Compras, diseño y artesanías en ${place.cityName}`,
        line2:
          cleanTags.length > 0
            ? cleanTags.join(' · ')
            : 'Productos auténticos · Parqueo y zona segura',
        highlightIcon: '🛍️',
        highlightTitle: 'Productos destacados y experiencia de compra',
      };
  }
}

function formatCleanPrice(place: Pick<PlaceCardDTO, 'priceStatus' | 'priceTier' | 'avgPriceMin' | 'avgPriceMax' | 'currencyCode'>): string {
  if (place.priceStatus !== 'CONFIRMED') return 'Consultar precio';
  if (place.priceTier === 'FREE' || (place.avgPriceMin === 0 && place.avgPriceMax === 0)) {
    return 'Gratis';
  }
  if (place.avgPriceMin !== null && place.avgPriceMax !== null) {
    return `$${place.avgPriceMin}–$${place.avgPriceMax} ${place.currencyCode}`;
  }
  return place.priceTier;
}

/**
 * Pantalla de Detalles Estilo Airbnb:
 * - Galería de fotos en la parte superior con contador (1 / 4) y botones circulares flotantes (←, ⤴, ♡)
 * - Hoja blanca redondeada abajo con detalles adaptados según la categoría del lugar
 * - Desglose del Puntaje Multi-Fuente (Google Maps + Reddit + Redes Sociales)
 * - Barra fija inferior con precio y un simple botón principal «Ir ahora»
 */
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
  const [detail, setDetail] = useState<PlaceDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  // Fase 5: Actividad y reseñas
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
          setError(e instanceof Error ? e.message : 'No se pudo cargar la ficha.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, slug]);

  const activePlace: PlaceCardDTO | null = detail ?? initialCard ?? null;
  if (!activePlace && error) {
    return <div role="alert" className="alert alert-error">{error}</div>;
  }
  if (!activePlace) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#717171' }}>
        Cargando detalles del lugar…
      </div>
    );
  }

  const photoDetails = getPlacePhotoDetails(activePlace);
  const currentPhotoInfo = photoDetails[photoIndex] ?? photoDetails[0]!;
  const currentPhoto = currentPhotoInfo.url;
  const photos = photoDetails.map((p) => p.url);
  const score = computeMultiSourceScore(activePlace);
  const parsedReason = parseRecommendationReason(activePlace.recommendationReason);
  const distanceLabel = formatDistanceKm(activePlace.distanceMeters);
  const catInfo = getCategorySubtitleLines(activePlace, detail);
  const cleanTitle = activePlace.name.replace(/^\d+\.\s*/, '');

  // URL de navegación directa precisa con origen y destino exactos para el botón principal «Ir ahora»
  const googleMapsUrl = buildGoogleMapsUrl(
    activePlace.coordinates.lat,
    activePlace.coordinates.lng,
    {
      name: cleanTitle,
      addressText: activePlace.addressText,
      cityName: activePlace.cityName,
      origin: userOrigin ?? 'Colonia Florencia Norte, Tegucigalpa, Honduras',
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


  const handleShare = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
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
      setError(
        err instanceof Error
          ? err.message
          : 'Inicia sesión para registrar tu opinión.'
      );
    }
  };

  const handleCompleteReview = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
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
      setError(err instanceof Error ? err.message : 'Error al enviar opinión.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const content = (
    <div className="airbnb-detail-modal" onClick={(e) => e.stopPropagation()}>
      {/* Área desplazable: Carrusel de Fotos arriba + Hoja Redondeada abajo */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#ffffff' }}>
        {/* 1. CARRUSEL SUPERIOR DE FOTOS ESTILO AIRBNB */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 330,
            background: '#f4f4f5',
            overflow: 'hidden',
          }}
        >
          <img
            src={currentPhoto}
            alt={cleanTitle}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Sombra superior suave para contraste de botones circulares */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 32%, transparent 72%, rgba(0,0,0,0.35) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Barra flotante superior: ← Volver a la izquierda | ⤴ Compartir y ♡ Favorito a la derecha */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              right: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            {onClose ? (
              <button
                type="button"
                className="airbnb-circle-icon-btn"
                onClick={onClose}
                aria-label="Volver a recomendaciones"
              >
                ←
              </button>
            ) : (
              <span />
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="airbnb-circle-icon-btn"
                onClick={handleShare}
                aria-label="Compartir lugar"
                title="Compartir"
              >
                {shareCopied ? '✓' : '⤴'}
              </button>
              {onToggleFavorite && (
                <button
                  type="button"
                  className="airbnb-circle-icon-btn"
                  onClick={onToggleFavorite}
                  aria-label="Guardar en favoritos"
                  style={{ color: isFavorite ? '#ef4444' : '#222222' }}
                >
                  {isFavorite ? '♥' : '♡'}
                </button>
              )}
            </div>
          </div>

          {/* Controles laterales de galería */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={() =>
                  setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
                }
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.88)',
                  border: 'none',
                  fontWeight: 800,
                  color: '#222222',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Foto siguiente"
                onClick={() => setPhotoIndex((prev) => (prev + 1) % photos.length)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.88)',
                  border: 'none',
                  fontWeight: 800,
                  color: '#222222',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                }}
              >
                ›
              </button>
            </>
          )}

          {/* Badge transparente con origen real de la foto y atribución legal de autor (§ 3.2.3 TOS Google Maps) */}
          <div
            style={{
              position: 'absolute',
              bottom: 38,
              left: 16,
              background: 'rgba(15, 23, 42, 0.82)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: '.72rem',
              fontWeight: 600,
              backdropFilter: 'blur(6px)',
              maxWidth: 'calc(100% - 95px)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {currentPhotoInfo.isVerifiedReal ? (
              <span>
                📷 Google Maps · {currentPhotoInfo.authorName}
              </span>
            ) : (
              <span>
                📷 Foto ilustrativa · Sube una real
              </span>
            )}
          </div>

          {/* Contador de fotos esquina inferior derecha */}
          <div
            style={{
              position: 'absolute',
              bottom: 38,
              right: 16,
              background: 'rgba(34, 34, 34, 0.78)',
              color: '#ffffff',
              padding: '4px 11px',
              borderRadius: 8,
              fontSize: '.78rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {photoIndex + 1} / {photos.length}
          </div>
        </div>

        {/* 2. HOJA BLANCA REDONDEADA SUPERPUESTA CON DETALLES ADAPTADOS POR CATEGORÍA */}
        <div
          style={{
            position: 'relative',
            marginTop: -26,
            borderRadius: '28px 28px 0 0',
            background: '#ffffff',
            padding: '1.6rem 1.45rem 2rem',
            display: 'grid',
            gap: '1.25rem',
          }}
        >
          {/* Miniaturas rápidas de fotos */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {photos.map((url, idx) => (
              <button
                key={url}
                type="button"
                onClick={() => setPhotoIndex(idx)}
                style={{
                  width: 48,
                  height: 34,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border:
                    idx === photoIndex
                      ? '2.5px solid #10b981'
                      : '1px solid #e5e5e5',
                  padding: 0,
                  opacity: idx === photoIndex ? 1 : 0.65,
                }}
              >
                <img
                  src={url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>


          {/* Título centrado + Subtítulo adaptado a la categoría + Línea ★ y reseñas */}
          <div style={{ textAlign: 'center', display: 'grid', gap: '.4rem' }}>
            <h2
              style={{
                fontSize: '1.55rem',
                fontWeight: 800,
                color: '#222222',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {cleanTitle}
            </h2>

            <div style={{ color: '#717171', fontSize: '.92rem', lineHeight: 1.4 }}>
              <div>{catInfo.line1}</div>
              <div style={{ marginTop: 2 }}>{catInfo.line2}</div>
            </div>

            <div
              style={{
                marginTop: '.25rem',
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '.45rem',
                flexWrap: 'wrap',
                fontSize: '.88rem',
                fontWeight: 700,
                color: '#222222',
              }}
            >
              <span>★ {score.mapsStars}</span>
              <span>·</span>
              <span style={{ textDecoration: 'underline' }}>
                {score.mapsReviewsLabel}
              </span>
              <span>·</span>
              <span
                style={{
                  background: '#ecfdf5',
                  color: '#15803d',
                  padding: '2px 9px',
                  borderRadius: 999,
                  fontSize: '.78rem',
                  fontWeight: 800,
                  border: '1px solid #bbf7d0',
                }}
              >
                Puntaje {score.totalScore}/100
              </span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #ebebeb' }} />

          {/* Bloque de Curaduría / Respaldo (equivalente al bloque de Anfitrión en Airbnb) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #0284c7 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                fontWeight: 800,
                flexShrink: 0,
                position: 'relative',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',

              }}
            >
              🏆
              <span
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  background: '#58CC02',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                }}
              >
                ✓
              </span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '.96rem', color: '#222222' }}>
                Selección Destacada · {activePlace.categoryName}
              </div>
              <div style={{ color: '#717171', fontSize: '.84rem' }}>
                Respaldado en {score.sourcesSummary}
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #ebebeb' }} />

          {/* 3 FILAS DE DETALLES CON ÍCONO (Igual que en la captura de Airbnb, adaptadas por categoría) */}
          <div style={{ display: 'grid', gap: '1.15rem' }}>
            {/* Fila 1: Ubicación y cercanía real */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span
                style={{
                  fontSize: '1.35rem',
                  width: 32,
                  textAlign: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                📍
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#222222' }}>
                  {activePlace.addressText ?? activePlace.cityName}
                  {distanceLabel ? ` · A ${distanceLabel} de ti` : ''}
                </div>
                <div style={{ color: '#717171', fontSize: '.86rem', marginTop: 2 }}>
                  Dentro de tu radio de 5 km a la redonda. Toca «Ir ahora» abajo para abrir la ruta directa.
                </div>
              </div>
            </div>

            {/* Fila 2: Lo elegiría para + Detalles específicos de la categoría */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span
                style={{
                  fontSize: '1.35rem',
                  width: 32,
                  textAlign: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {catInfo.highlightIcon}
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#222222' }}>
                  {parsedReason.choiceReason}
                </div>
                <div style={{ color: '#717171', fontSize: '.86rem', marginTop: 3 }}>
                  {activePlace.description}
                </div>
                {detail?.establishment && detail.establishment.specialties.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '.35rem',
                      marginTop: '.5rem',
                    }}
                  >
                    {detail.establishment.specialties.map((spec) => (
                      <span
                        key={spec}
                        style={{
                          fontSize: '.76rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: '#f4f4f5',
                          color: '#222222',
                        }}
                      >
                        🍴 {spec}
                      </span>
                    ))}
                  </div>
                )}
                {detail?.activities && detail.activities.length > 0 && (
                  <div style={{ marginTop: '.45rem', display: 'grid', gap: '.25rem' }}>
                    {detail.activities.map((act) => (
                      <div
                        key={act.id}
                        style={{
                          fontSize: '.8rem',
                          color: '#3f3f46',
                          fontWeight: 600,
                        }}
                      >
                        ✓ {act.title}
                        {act.estimatedDurationMins ? ` (${act.estimatedDurationMins} min)` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fila 3: Desglose de Puntaje Multi-Fuente (Google Maps + Reddit + Redes Sociales) */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span
                style={{
                  fontSize: '1.35rem',
                  width: 32,
                  textAlign: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                📊
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#222222' }}>
                  Puntaje Compuesto Exploro: {score.totalScore} / 100 pts
                </div>
                <div style={{ color: '#717171', fontSize: '.84rem', marginTop: 2 }}>
                  Combinamos valoraciones y volumen de Google Maps con conversaciones en Reddit y presencia en redes sociales:
                </div>

                <div
                  style={{
                    marginTop: '.65rem',
                    display: 'grid',
                    gap: '.5rem',
                    background: '#f8fafc',
                    padding: '.8rem .9rem',
                    borderRadius: 14,
                    border: '1px solid #e5e5e5',
                  }}
                >
                  {/* Barra Google Maps */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '.78rem',
                        fontWeight: 700,
                        color: '#222222',
                        marginBottom: 3,
                      }}
                    >
                      <span>📍 Valoraciones Google Maps ({score.mapsStars} ★ · {score.mapsReviewsLabel})</span>
                      <span style={{ color: '#0284c7' }}>{score.mapsPoints} / 45 pts</span>
                    </div>
                    <div
                      style={{
                        height: 7,
                        borderRadius: 999,
                        background: '#e5e7eb',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((score.mapsPoints / 45) * 100)}%`,
                          height: '100%',
                          background: '#1CB0F6',
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>

                  {/* Barra Reddit */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '.78rem',
                        fontWeight: 700,
                        color: '#222222',
                        marginBottom: 3,
                      }}
                    >
                      <span>💬 Comunidad en Reddit (r/Honduras & viajeros)</span>
                      <span style={{ color: '#ea580c' }}>{score.redditPoints} / 30 pts</span>
                    </div>
                    <div
                      style={{
                        height: 7,
                        borderRadius: 999,
                        background: '#e5e7eb',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((score.redditPoints / 30) * 100)}%`,
                          height: '100%',
                          background: '#FF9600',
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>

                  {/* Barra Redes Sociales & Guías */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '.78rem',
                        fontWeight: 700,
                        color: '#222222',
                        marginBottom: 3,
                      }}
                    >
                      <span>📱 Redes Sociales & Guías Locales (Qué Plan Tegus / IG / TikTok)</span>
                      <span style={{ color: '#16a34a' }}>{score.socialPoints} / 25 pts</span>
                    </div>
                    <div
                      style={{
                        height: 7,
                        borderRadius: 999,
                        background: '#e5e7eb',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round((score.socialPoints / 25) * 100)}%`,
                          height: '100%',
                          background: '#58CC02',
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Críticas honestas / Ojo cuando existen */}
                {parsedReason.caveat && (
                  <div
                    style={{
                      marginTop: '.6rem',
                      padding: '.55rem .75rem',
                      borderRadius: 10,
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      color: '#b45309',
                      fontSize: '.82rem',
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ {parsedReason.caveat}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Evidencias y comentarios verificados */}
          {detail && detail.evidences.length > 0 && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid #ebebeb' }} />
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '.65rem', color: '#222222' }}>
                  Lo que dice la gente ({detail.evidences.length + placeReviews.length})
                </h3>
                <div style={{ display: 'grid', gap: '.6rem' }}>
                  {detail.evidences.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        padding: '.75rem .9rem',
                        borderRadius: 12,
                        background: '#f7f7f9',
                        border: '1px solid #ebebeb',
                        fontSize: '.85rem',
                      }}
                    >
                      <div style={{ color: '#222222', fontWeight: 500 }}>
                        “{ev.extractedSnippet}”
                      </div>
                      <div style={{ fontSize: '.76rem', color: '#717171', marginTop: '.3rem', fontWeight: 700 }}>
                        {SOURCE_LABELS[ev.sourceType] ?? ev.sourceName}
                      </div>
                    </div>
                  ))}
                  {placeReviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: '.75rem .9rem',
                        borderRadius: 12,
                        background: '#ecfdf5',
                        border: '1px solid #bbf7d0',
                        fontSize: '.85rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#15803d' }}>
                        {rev.userName ?? 'Viajero Exploro'} · ✓ Experiencia propia
                      </div>
                      {rev.comment && (
                        <div style={{ color: '#222222', marginTop: 2 }}>“{rev.comment}”</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Botón discreto para dejar opinión propia (Fase 5) */}
                <div style={{ marginTop: '.85rem' }}>
                  {!showReviewModal ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void handleStartActivity()}
                      style={{ fontSize: '.8rem' }}
                    >
                      ✍️ ¿Ya fuiste? Calificar este lugar
                    </button>
                  ) : (
                    <form
                      onSubmit={(e) => void handleCompleteReview(e)}
                      style={{
                        marginTop: '.5rem',
                        padding: '.9rem',
                        borderRadius: 14,
                        background: '#f7f7f9',
                        border: '1px solid #e5e5e5',
                        display: 'grid',
                        gap: '.55rem',
                      }}
                    >
                      <strong style={{ fontSize: '.88rem' }}>Comparte tu opinión rápida</strong>
                      <input
                        className="field"
                        type="text"
                        placeholder="¿Qué plato o experiencia recomiendas?"
                        value={recommendedItem}
                        onChange={(e) => setRecommendedItem(e.target.value)}
                      />
                      <textarea
                        className="field"
                        rows={2}
                        placeholder="Tu comentario para otros usuarios..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                          {submittingReview ? 'Enviando…' : 'Publicar'}
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setShowReviewModal(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}

          {error && (
            <div role="alert" className="alert alert-warn" style={{ fontSize: '.82rem' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* 3. BARRA INFERIOR FIJA ESTILO AIRBNB: Precio a la izquierda + Un simple botón «Ir ahora» a la derecha */}
      <div
        style={{
          borderTop: '1px solid #ebebeb',
          background: '#ffffff',
          padding: '0.9rem 1.35rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '1.12rem',
              fontWeight: 800,
              color: '#222222',
              textDecoration: 'underline',
            }}
          >
            {formatCleanPrice(activePlace)}
          </div>
          <div style={{ fontSize: '.78rem', color: '#717171', marginTop: 1 }}>
            {activePlace.categorySlug === 'comida' ? 'Promedio por persona' : 'Costo estimado'}
            {distanceLabel ? ` · a ${distanceLabel}` : ''}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.3rem',
              marginTop: 4,
              background: '#f4f4f5',
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: '.72rem',
              fontWeight: 700,
              color: '#222222',
            }}
          >
            ✓ Ruta directa disponible
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="airbnb-ir-ahora-btn"
          >
            Ir ahora
          </a>
          <div style={{ marginTop: 4, fontSize: '.72rem', color: '#717171' }}>
            o abrir en{' '}
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#222222', fontWeight: 700, textDecoration: 'underline' }}
            >
              Waze
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  if (onClose) {
    return (
      <div
        className="airbnb-detail-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalles de ${cleanTitle}`}
        onClick={onClose}
      >
        {content}
      </div>
    );
  }

  return content;
}

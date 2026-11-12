'use client';

import React, { useEffect, useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import {
  ActivityLogDTO,
  PlaceDetailDTO,
  PlaceRecommendationSummary,
  UserReviewDTO,
} from '@exploro/shared-types';
import { buildGoogleMapsUrl, buildWazeUrl } from '../lib/format';

const TIME_OF_DAY: Record<string, string> = {
  MORNING: 'mañana',
  AFTERNOON: 'tarde',
  NIGHT: 'noche',
  ANY: 'cualquier hora',
};

const SOURCE_LABELS: Record<string, string> = {
  EXTERNAL_COMMUNITY: 'Comunidad externa (Reddit)',
  BLOG: 'Blog de viajes independiente',
  NATIVE_EXPERIENCE: 'Experiencia nativa verificada',
  CURATED: 'Curaduría editorial',
};

/** Evidencias, actividades, cálculo de rutas, experiencias propias y verificación. */
export function PlaceDetail({
  client,
  slug,
  onCalculateRoute: _onCalculateRoute,
}: {
  client: ExploroApiClient;
  slug: string;
  onCalculateRoute?: (coords: { lat: number; lng: number }, name: string) => void;
}): React.JSX.Element {
  const [detail, setDetail] = useState<PlaceDetailDTO | null>(null);
  const [recSummary, setRecSummary] = useState<PlaceRecommendationSummary | null>(null);
  const [activeActivity, setActiveActivity] = useState<ActivityLogDTO | null>(null);
  const [placeReviews, setPlaceReviews] = useState<UserReviewDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifyingGps, setIsVerifyingGps] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Formulario de reseña corta adaptada (Fase 5)
  const [tasteQuality, setTasteQuality] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [valueForMoney, setValueForMoney] = useState<'EXCELLENT' | 'FAIR' | 'EXPENSIVE'>('EXCELLENT');
  const [amountPaid, setAmountPaid] = useState<string>('15');
  const [recommendedItem, setRecommendedItem] = useState('');
  const [worthIt, setWorthIt] = useState(true);
  const [durationSpent, setDurationSpent] = useState<'UNDER_1_HOUR' | '1_TO_2_HOURS' | '2_TO_4_HOURS'>('1_TO_2_HOURS');
  const [accessibility, setAccessibility] = useState<'EASY' | 'MODERATE' | 'WHEELCHAIR_ACCESSIBLE'>('EASY');
  const [caveatOrTip, setCaveatOrTip] = useState('');
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let active = true;
    client
      .getPlaceBySlug(slug)
      .then(async (d) => {
        if (!active) return;
        setDetail(d);

        // Cargar recomendaciones y opiniones de la comunidad
        const [rec, reviews, currAct] = await Promise.all([
          client.getPlaceRecommendationSummary(d.id).catch(() => null),
          client.getPlaceReviews(d.id).catch(() => []),
          client.getActiveActivity().catch(() => null),
        ]);

        if (active) {
          if (rec) setRecSummary(rec);
          if (reviews) setPlaceReviews(reviews);
          if (currAct && currAct.placeId === d.id) setActiveActivity(currAct);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.');
      });

    return () => {
      active = false;
    };
  }, [client, slug]);

  const handleStartActivity = async () => {
    if (!detail) return;
    try {
      setError(null);
      const act = await client.startActivity({
        placeId: detail.id,
        activityTitle: detail.activities[0]?.title ?? `Visita a ${detail.name}`,
      });
      setActiveActivity(act);
      setVerifyMsg('¡Actividad iniciada! Disfruta tu visita.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al iniciar actividad (¿iniciaste sesión?)');
    }
  };

  const handleVerifyGps = () => {
    if (!activeActivity || !navigator.geolocation) {
      setVerifyMsg('Geolocalización no disponible en este dispositivo.');
      return;
    }
    setIsVerifyingGps(true);
    setVerifyMsg('Obteniendo coordenadas GPS para verificar visita...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await client.verifyActivityVisit(activeActivity.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setIsVerifyingGps(false);
          setVerifyMsg(res.message);
          if (res.isVerified) {
            setActiveActivity((prev) =>
              prev ? { ...prev, isVerifiedVisit: true, verificationMethod: 'GPS_PROXIMITY' } : null
            );
          }
        } catch (e: unknown) {
          setIsVerifyingGps(false);
          setVerifyMsg(e instanceof Error ? e.message : 'Error al verificar proximidad.');
        }
      },
      (err) => {
        setIsVerifyingGps(false);
        setVerifyMsg(`No se pudo acceder al GPS: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCompleteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity || !detail) return;
    setSubmittingReview(true);
    try {
      const isRestaurant = detail.categorySlug === 'comida';
      const createdReview = await client.completeActivityWithReview(activeActivity.id, {
        reviewType: isRestaurant ? 'RESTAURANT' : 'TOURISM',
        restaurantReview: isRestaurant
          ? {
              tasteQuality,
              serviceRating,
              valueForMoney,
              amountPaid: amountPaid ? Number(amountPaid) : undefined,
              recommendedDish: recommendedItem,
              wouldReturn: worthIt,
              comment,
            }
          : undefined,
        tourismReview: !isRestaurant
          ? {
              worthIt,
              durationSpent,
              amountPaid: amountPaid ? Number(amountPaid) : undefined,
              accessibility,
              recommendedItem,
              caveatOrTip,
              comment,
            }
          : undefined,
        wouldReturnOrRecommend: worthIt,
        generalComment: comment,
      });

      setActiveActivity(null);
      setShowReviewModal(false);
      setVerifyMsg('¡Gracias por compartir tu experiencia! Tu opinión ya fortalece el ranking.');
      setPlaceReviews((prev) => [createdReview, ...prev]);

      // Refrescar resumen de recomendaciones
      const updatedRec = await client.getPlaceRecommendationSummary(detail.id).catch(() => null);
      if (updatedRec) setRecSummary(updatedRec);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar opinión.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (error) return <div role="alert" className="alert alert-error">{error}</div>;
  if (!detail) return <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>Cargando evidencias…</p>;

  const isFoodCategory = detail.categorySlug === 'comida';

  return (
    <div style={{ display: 'grid', gap: '.8rem', fontSize: '.85rem' }}>
      {/* Botones principales de navegación directa (Waze / Google Maps) y actividad */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '.5rem',
        }}
      >
        <a
          href={buildWazeUrl(detail.coordinates.lat, detail.coordinates.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: '.8rem',
            fontWeight: 700,
            background: 'rgba(56, 189, 248, 0.16)',
            borderColor: 'rgba(56, 189, 248, 0.45)',
            color: '#38bdf8',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.35rem',
          }}
        >
          🚗 Abrir en Waze
        </a>

        <a
          href={buildGoogleMapsUrl(detail.coordinates.lat, detail.coordinates.lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: '.8rem',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.45)',
            color: '#34d399',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.35rem',
          }}
        >
          🗺️ Abrir en Google Maps
        </a>

        {!activeActivity ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStartActivity}
            style={{ width: '100%', justifyContent: 'center', fontSize: '.8rem' }}
          >
            🚀 Registrar visita
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowReviewModal(true)}
            style={{ width: '100%', justifyContent: 'center', fontSize: '.8rem', background: '#10b981' }}
          >
            ✅ Finalizar experiencia
          </button>
        )}
      </div>

      {/* Banner de actividad en curso (Fase 5) */}
      {activeActivity && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            borderRadius: '6px',
            padding: '.6rem .8rem',
            display: 'grid',
            gap: '.4rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#6ee7b7' }}>
              📍 Actividad en curso: {activeActivity.activityTitle}
            </strong>
            <span
              style={{
                fontSize: '.72rem',
                padding: '.1rem .4rem',
                borderRadius: '4px',
                fontWeight: 700,
                background: activeActivity.isVerifiedVisit ? '#10b981' : '#f59e0b',
                color: '#0f172a',
              }}
            >
              {activeActivity.isVerifiedVisit ? '✓ Visita Verificada' : 'Visita sin verificar'}
            </span>
          </div>

          {!activeActivity.isVerifiedVisit && (
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginTop: '.2rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isVerifyingGps}
                onClick={handleVerifyGps}
                style={{ fontSize: '.75rem', padding: '.25rem .5rem' }}
              >
                {isVerifyingGps ? '⏳ Verificando…' : '📍 Verificar presencia (GPS)'}
              </button>
              <span style={{ fontSize: '.72rem', color: '#94a3b8' }}>
                Regla: el inicio no prueba la visita.
              </span>
            </div>
          )}

          {verifyMsg && (
            <p style={{ margin: 0, fontSize: '.75rem', color: '#38bdf8' }}>{verifyMsg}</p>
          )}
        </div>
      )}

      {/* Modal/Formulario de Cuestionario Corto Adaptado (Fase 5) */}
      {showReviewModal && (
        <form
          onSubmit={handleCompleteReview}
          style={{
            background: '#0f172a',
            border: '2px solid #38bdf8',
            borderRadius: '8px',
            padding: '.8rem',
            display: 'grid',
            gap: '.6rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#f8fafc', fontSize: '.9rem' }}>
              {isFoodCategory ? '🍽️ Tu experiencia en este restaurante' : '🌄 Tu experiencia turística'}
            </strong>
            <button
              type="button"
              onClick={() => setShowReviewModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <p style={{ margin: 0, color: '#94a3b8', fontSize: '.75rem' }}>
            Cuestionario breve y conciso (sin formularios largos ni aburridos).
          </p>

          {isFoodCategory ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                  Calidad y Sabor:
                  <select
                    value={tasteQuality}
                    onChange={(e) => setTasteQuality(Number(e.target.value))}
                    style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                  >
                    <option value={5}>5 - Increíble</option>
                    <option value={4}>4 - Muy bueno</option>
                    <option value={3}>3 - Aceptable</option>
                    <option value={2}>2 - Mejorable</option>
                    <option value={1}>1 - Decepcionante</option>
                  </select>
                </label>
                <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                  Atención y Servicio:
                  <select
                    value={serviceRating}
                    onChange={(e) => setServiceRating(Number(e.target.value))}
                    style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                  >
                    <option value={5}>5 - Excelente</option>
                    <option value={4}>4 - Rápida y atenta</option>
                    <option value={3}>3 - Normal</option>
                    <option value={2}>2 - Lenta</option>
                    <option value={1}>1 - Mala atención</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                  Relación Calidad-Precio:
                  <select
                    value={valueForMoney}
                    onChange={(e) => setValueForMoney(e.target.value as any)}
                    style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                  >
                    <option value="EXCELLENT">Excelente ($$ justo)</option>
                    <option value="FAIR">Precio estándar</option>
                    <option value="EXPENSIVE">Costoso para lo que ofrece</option>
                  </select>
                </label>
                <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                  Gasto promedio (USD):
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="Ej. 18"
                    style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                  />
                </label>
              </div>

              <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                Plato recomendado:
                <input
                  type="text"
                  value={recommendedItem}
                  onChange={(e) => setRecommendedItem(e.target.value)}
                  placeholder="Ej. Burrata Pizza Slice"
                  style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                />
              </label>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                  ¿Valió la pena?:
                  <select
                    value={worthIt ? 'yes' : 'no'}
                    onChange={(e) => setWorthIt(e.target.value === 'yes')}
                    style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                  >
                    <option value="yes">Totalmente sí</option>
                    <option value="no">No lo recomendaría</option>
                  </select>
                </label>
                <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                  Tiempo invertido:
                  <select
                    value={durationSpent}
                    onChange={(e) => setDurationSpent(e.target.value as any)}
                    style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                  >
                    <option value="UNDER_1_HOUR">Menos de 1 hora</option>
                    <option value="1_TO_2_HOURS">1 a 2 horas</option>
                    <option value="2_TO_4_HOURS">2 a 4 horas</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                  Accesibilidad:
                  <select
                    value={accessibility}
                    onChange={(e) => setAccessibility(e.target.value as any)}
                    style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                  >
                    <option value="EASY">Fácil acceso a pie</option>
                    <option value="WHEELCHAIR_ACCESSIBLE">Apto silla de ruedas</option>
                    <option value="MODERATE">Moderado / Escaleras</option>
                  </select>
                </label>
                <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                  Gasto aproximado ($):
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0 si fue gratis"
                    style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                  />
                </label>
              </div>

              <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
                ¿Qué debería saber otro visitante?:
                <input
                  type="text"
                  value={caveatOrTip}
                  onChange={(e) => setCaveatOrTip(e.target.value)}
                  placeholder="Ej. Llevar abrigo porque suele haber viento"
                  style={{ width: '100%', padding: '.2rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
                />
              </label>
            </>
          )}

          <label style={{ color: '#cbd5e1', fontSize: '.75rem' }}>
            Comentario libre:
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Consejo para otros viajeros..."
              style={{ width: '100%', padding: '.3rem', background: '#1e293b', color: '#f8fafc', borderRadius: '4px' }}
            />
          </label>

          <button
            type="submit"
            disabled={submittingReview}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submittingReview ? 'Enviando opinión…' : 'Publicar experiencia'}
          </button>
        </form>
      )}

      {/* Panel de Inteligencia y Recomendación Explicable (Fase 4) */}
      <section
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '.8rem',
          display: 'grid',
          gap: '.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: '#f8fafc' }}>
            <span>🧠</span> Recomendación Explicable
          </strong>
          <span
            style={{
              fontSize: '.75rem',
              padding: '.15rem .45rem',
              borderRadius: '999px',
              fontWeight: 700,
              background:
                recSummary?.confidenceLevel === 'HIGH'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : recSummary?.confidenceLevel === 'MEDIUM'
                  ? 'rgba(56, 189, 248, 0.2)'
                  : 'rgba(245, 158, 11, 0.2)',
              color:
                recSummary?.confidenceLevel === 'HIGH'
                  ? '#34d399'
                  : recSummary?.confidenceLevel === 'MEDIUM'
                  ? '#38bdf8'
                  : '#fbbf24',
              border: '1px solid currentColor',
            }}
          >
            Puntuación: {recSummary ? Math.round(recSummary.overallScore) : Math.round(detail.scoreSummary.overallScore)}/100
          </span>
        </div>

        <p style={{ margin: 0, color: '#e2e8f0', lineHeight: 1.4 }}>
          {recSummary?.explanation ?? detail.recommendationReason}
        </p>

        {/* Aspectos positivos respaldados */}
        {recSummary && recSummary.topPositiveAspects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.3rem' }}>
            {recSummary.topPositiveAspects.map((asp) => (
              <span
                key={asp.aspect}
                style={{
                  fontSize: '.72rem',
                  padding: '.15rem .4rem',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                ✨ {asp.aspect} {asp.mentionsCount > 1 ? `(${asp.mentionsCount})` : ''}
              </span>
            ))}
          </div>
        )}

        {/* Advertencias / Aspectos a tener en cuenta */}
        {recSummary && recSummary.topNegativeAspects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.2rem' }}>
            {recSummary.topNegativeAspects.map((asp) => (
              <span
                key={asp.aspect}
                style={{
                  fontSize: '.72rem',
                  padding: '.15rem .4rem',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                ⚠️ {asp.aspect}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: '.72rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(51, 65, 85, 0.5)',
            paddingTop: '.4rem',
            marginTop: '.2rem',
          }}
        >
          <span>
            {recSummary?.factCheckPassed
              ? '✅ Respaldado por evidencias'
              : '⚠️ Información en revisión'}
          </span>
          <span style={{ color: '#94a3b8' }}>Gobernanza IA: Costo $0.00</span>
        </div>
      </section>

      {/* Experiencias de la Comunidad Exploro (Fase 5) */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Opiniones de la Comunidad ({placeReviews.length})</strong>
          <span style={{ fontSize: '.72rem', color: '#10b981' }}>Comunidad Exploro</span>
        </div>

        {placeReviews.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', marginTop: '.3rem' }}>
            Aún no hay opiniones de la comunidad. ¡Sé el primero en iniciar una actividad y compartir tu experiencia!
          </p>
        ) : (
          <ul style={{ paddingLeft: '0', display: 'grid', gap: '.5rem', marginTop: '.4rem', listStyle: 'none' }}>
            {placeReviews.map((rev) => (
              <li
                key={rev.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '.6rem',
                  display: 'grid',
                  gap: '.3rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {rev.userName ?? 'Viajero anónimo'}
                  </span>
                  <span
                    style={{
                      fontSize: '.7rem',
                      padding: '.1rem .35rem',
                      borderRadius: '4px',
                      background: rev.isVerifiedVisit
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(56, 189, 248, 0.15)',
                      color: rev.isVerifiedVisit ? '#34d399' : '#38bdf8',
                      fontWeight: 600,
                    }}
                  >
                    {rev.isVerifiedVisit ? '✓ Visita Verificada' : 'Opinión Nativa'}
                  </span>
                </div>

                {rev.recommendedItem && (
                  <div style={{ fontSize: '.78rem', color: '#38bdf8' }}>
                    ✨ Recomendado: <strong>{rev.recommendedItem}</strong>
                  </div>
                )}

                {rev.caveatOrTip && (
                  <div style={{ fontSize: '.78rem', color: '#fbbf24' }}>
                    💡 Tip: {rev.caveatOrTip}
                  </div>
                )}

                {rev.comment && (
                  <p style={{ margin: 0, color: '#cbd5e1', fontSize: '.8rem', fontStyle: 'italic' }}>
                    "{rev.comment}"
                  </p>
                )}

                <div style={{ fontSize: '.7rem', color: '#64748b' }}>
                  {new Date(rev.createdAt).toLocaleDateString('es-US')}
                  {rev.amountPaid ? ` • Gasto: $${rev.amountPaid}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Evidencias externas auditables */}
      <section>
        <strong>Otras Evidencias Auditables ({detail.evidences.length})</strong>
        {detail.evidences.length === 0 ? (
          <p style={{ color: '#fbbf24' }}>Sin evidencias registradas todavía.</p>
        ) : (
          <ul style={{ paddingLeft: '1.1rem', display: 'grid', gap: '.6rem', marginTop: '.3rem' }}>
            {detail.evidences.map((ev) => (
              <li key={ev.id} style={{ borderLeft: '3px solid #10b981', paddingLeft: '.6rem' }}>
                <div>"{ev.extractedSnippet}"</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: '.2rem' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {SOURCE_LABELS[ev.sourceType] ?? ev.sourceName}
                  </span>
                  {' • '}
                  <span>Confianza: {Math.round(ev.confidenceScore * 100)}%</span>
                  {ev.publishedAt ? ` • ${new Date(ev.publishedAt).toLocaleDateString('es-US')}` : ''}
                  {ev.externalUrl ? (
                    <span>
                      {' • '}
                      <a
                        href={ev.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#93c5fd', textDecoration: 'underline' }}
                      >
                        Enlace original
                      </a>
                    </span>
                  ) : (
                    ' • sin enlace público'
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail.establishment && (
        <section>
          <strong>Establecimiento</strong>
          <div>Especialidades: {detail.establishment.specialties.join(', ') || 'sin datos'}</div>
          <div>Horario: {detail.establishment.openingHours ? 'disponible' : 'sin verificar'}</div>
        </section>
      )}

      {detail.activities.length > 0 && (
        <section>
          <strong>Actividades sugeridas</strong>
          <ul style={{ paddingLeft: '1.1rem' }}>
            {detail.activities.map((a) => (
              <li key={a.id}>
                {a.title} —{' '}
                {a.estimatedDurationMins !== null ? `${a.estimatedDurationMins} min` : 'duración sin datos'} •{' '}
                {TIME_OF_DAY[a.bestTimeOfDay] ?? a.bestTimeOfDay}
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail.scoreSummary.topNegativeAspects.length > 0 && (
        <section>
          <strong>A tener en cuenta</strong>
          <div>{detail.scoreSummary.topNegativeAspects.join(' • ')}</div>
        </section>
      )}
    </div>
  );
}

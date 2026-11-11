'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityAlternativeOptionDTO,
  BudgetTier,
  TravelStyle,
  TripDTO,
  TripItemDTO,
  TripReorganizationImpactDTO,
} from '@exploro/shared-types';
import { ExploroApiClient, ExploroApiError } from '@exploro/api-client';

interface TripPlannerPanelProps {
  client: ExploroApiClient;
  isLoggedIn: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
}

export function TripPlannerPanel({
  client,
  isLoggedIn,
  onClose,
  onRequireAuth,
}: TripPlannerPanelProps): React.JSX.Element {
  const [internalOverride, setInternalOverride] = useState(true);
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripDTO | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureBlocked, setFeatureBlocked] = useState(false);

  // Modales
  const [showAssistedModal, setShowAssistedModal] = useState(false);
  const [assistedCitySlug, setAssistedCitySlug] = useState('new-york');
  const [assistedStartDate, setAssistedStartDate] = useState('2026-11-20');
  const [assistedEndDate, setAssistedEndDate] = useState('2026-11-20');
  const [assistedBudget, setAssistedBudget] = useState<BudgetTier>('MEDIUM');
  const [assistedStyle, setAssistedStyle] = useState<TravelStyle>('CULTURAL');

  // Alternativas
  const [alternativesItem, setAlternativesItem] = useState<TripItemDTO | null>(null);
  const [alternativesData, setAlternativesData] = useState<{
    verySimilar: ActivityAlternativeOptionDTO[];
    relatedExperiences: ActivityAlternativeOptionDTO[];
    requiresAdjustments: ActivityAlternativeOptionDTO[];
  } | null>(null);
  const [loadingAlts, setLoadingAlts] = useState(false);

  // Reorganización
  const [modifyingItem, setModifyingItem] = useState<TripItemDTO | null>(null);
  const [newStartTime, setNewStartTime] = useState('11:00');
  const [newDuration, setNewDuration] = useState(60);
  const [reorgPreview, setReorgPreview] = useState<TripReorganizationImpactDTO | null>(null);
  const [submittingReorg, setSubmittingReorg] = useState(false);

  // Cliente con override interno según el switch
  const activeClient = React.useMemo(() => {
    return internalOverride
      ? new ExploroApiClient({
          baseUrl: (client as any).baseUrl,
          getAccessToken: (client as any).getAccessToken,
          defaultHeaders: { 'x-exploro-internal': 'true' },
        })
      : client;
  }, [client, internalOverride]);

  const loadTrips = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    setFeatureBlocked(false);
    try {
      const list = await activeClient.listTrips();
      setTrips(list);
      if (list.length > 0 && !selectedTrip) {
        setSelectedTrip(list[0]);
      }
    } catch (err: unknown) {
      if (err instanceof ExploroApiError && err.statusCode === 403) {
        setFeatureBlocked(true);
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar viajes');
      }
    } finally {
      setLoading(false);
    }
  }, [activeClient, isLoggedIn, selectedTrip]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const handleGenerateAssisted = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const newPlan = await activeClient.generateAssistedPlan({
        citySlug: assistedCitySlug,
        startDate: assistedStartDate,
        endDate: assistedEndDate,
        budgetTier: assistedBudget,
        travelStyles: [assistedStyle],
        flexibilityMinutes: 15,
      });
      setShowAssistedModal(false);
      await loadTrips();
      setSelectedTrip(newPlan);
      setSelectedDayNumber(1);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al generar itinerario asistido'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAlternatives = async (item: TripItemDTO) => {
    if (!selectedTrip) return;
    setAlternativesItem(item);
    setLoadingAlts(true);
    setAlternativesData(null);
    try {
      const data = await activeClient.getActivityAlternatives(
        selectedTrip.id,
        item.id,
        15
      );
      setAlternativesData(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al consultar alternativas'
      );
    } finally {
      setLoadingAlts(false);
    }
  };

  const handleOpenModifySchedule = (item: TripItemDTO) => {
    setModifyingItem(item);
    setNewStartTime(item.startTime?.slice(0, 5) ?? '10:00');
    setNewDuration(item.durationMinutes);
    setReorgPreview(null);
  };

  const handlePreviewReorg = async () => {
    if (!selectedTrip || !modifyingItem) return;
    setLoading(true);
    try {
      const preview = await activeClient.previewReorganization(
        selectedTrip.id,
        modifyingItem.id,
        {
          newStartTime,
          newDurationMinutes: newDuration,
        }
      );
      setReorgPreview(preview);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al calcular impacto'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReorg = async () => {
    if (!selectedTrip || !modifyingItem || !reorgPreview) return;
    setSubmittingReorg(true);
    try {
      // 1. Actualizar el ítem modificado
      await activeClient.updateTripItem(selectedTrip.id, modifyingItem.id, {
        startTime: newStartTime,
        durationMinutes: newDuration,
      });

      // 2. Si hay ítems afectados, aplicar el desplazamiento
      if (reorgPreview.shiftedItems.length > 0) {
        await activeClient.applyReorganization(selectedTrip.id, {
          affectedItemIds: reorgPreview.shiftedItems.map((s) => s.itemId),
          shiftMinutes: reorgPreview.shiftedItems[0].shiftMinutes,
        });
      }

      // 3. Recargar viaje
      const updated = await activeClient.getTripById(selectedTrip.id);
      setSelectedTrip(updated);
      setModifyingItem(null);
      setReorgPreview(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al aplicar reorganización'
      );
    } finally {
      setSubmittingReorg(false);
    }
  };

  const activeDay = selectedTrip?.days?.find(
    (d) => d.dayNumber === selectedDayNumber
  );

  return (
    <div
      role="dialog"
      aria-labelledby="trip-planner-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 960,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#1e293b',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2
                id="trip-planner-title"
                style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}
              >
                🗺️ Planificador de Viajes
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  backgroundColor: internalOverride
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
                  color: internalOverride ? '#10b981' : '#ef4444',
                  fontWeight: 600,
                  border: `1px solid ${internalOverride ? '#10b981' : '#ef4444'}`,
                }}
              >
                {internalOverride ? '🧪 Modo Interno Activo' : '🔒 Feature Flag Bloqueado'}
              </span>
            </div>
            <p
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                margin: '0.25rem 0 0 0',
              }}
            >
              Fase 6: Itinerarios asistidos, cálculo PostGIS de traslados y clasificación de 3 niveles.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={internalOverride}
                onChange={(e) => setInternalOverride(e.target.checked)}
              />
              Bypass interno (x-exploro-internal)
            </label>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              style={{ padding: '0.4rem 0.8rem' }}
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {!isLoggedIn ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#cbd5e1' }}>
                Inicia sesión para gestionar tus itinerarios y viajes asistidos.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onRequireAuth}
                style={{ marginTop: '1rem' }}
              >
                Iniciar sesión
              </button>
            </div>
          ) : featureBlocked ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                🔒 Función Deshabilitada para Usuarios Públicos
              </h3>
              <p style={{ color: '#cbd5e1', maxWidth: 500, margin: '0 auto' }}>
                El Planificador de Viajes se encuentra en fase de desarrollo interno (Feature Flag: <code>trip_planner_enabled = false</code>). Activa la casilla «Bypass interno» arriba para probar la funcionalidad con cabeceras de testing.
              </p>
            </div>
          ) : (
            <div>
              {/* Barra superior de acciones */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    className="input"
                    value={selectedTrip?.id ?? ''}
                    onChange={(e) => {
                      const t = trips.find((x) => x.id === e.target.value);
                      if (t) setSelectedTrip(t);
                    }}
                    style={{ minWidth: 260 }}
                  >
                    {trips.length === 0 ? (
                      <option value="">(No hay viajes creados)</option>
                    ) : (
                      trips.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.startDate})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAssistedModal(true)}
                  >
                    ✨ Generar Itinerario Asistido
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: '1rem' }}
                >
                  {error}
                </div>
              )}

              {/* Detalle del viaje seleccionado */}
              {selectedTrip ? (
                <div>
                  <div
                    style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.7)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                        {selectedTrip.title}
                      </h3>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: '#94a3b8',
                          marginTop: '0.3rem',
                        }}
                      >
                        📅 {selectedTrip.startDate} al {selectedTrip.endDate} • 📍{' '}
                        {selectedTrip.citySlug ?? 'US'} • 💰 Presupuesto:{' '}
                        {selectedTrip.budgetTier} • ⏱️ Flexibilidad: ±
                        {selectedTrip.flexibilityMinutes} min
                      </div>
                    </div>
                  </div>

                  {/* Tabs de días */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      borderBottom: '1px solid #334155',
                      marginBottom: '1rem',
                      overflowX: 'auto',
                    }}
                  >
                    {selectedTrip.days?.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDayNumber(d.dayNumber)}
                        style={{
                          padding: '0.6rem 1.2rem',
                          background: 'none',
                          border: 'none',
                          borderBottom:
                            selectedDayNumber === d.dayNumber
                              ? '3px solid #38bdf8'
                              : '3px solid transparent',
                          color:
                            selectedDayNumber === d.dayNumber
                              ? '#38bdf8'
                              : '#94a3b8',
                          fontWeight:
                            selectedDayNumber === d.dayNumber ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        Día {d.dayNumber} ({d.date})
                      </button>
                    ))}
                  </div>

                  {/* Lista de actividades del día */}
                  {activeDay && (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {activeDay.items?.length === 0 ? (
                        <p style={{ color: '#94a3b8', textAlign: 'center' }}>
                          No hay actividades programadas para este día.
                        </p>
                      ) : (
                        activeDay.items?.map((it, idx) => (
                          <div
                            key={it.id}
                            style={{
                              padding: '1rem',
                              backgroundColor: '#1e293b',
                              borderRadius: '10px',
                              border: '1px solid #334155',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '1rem',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <div
                                style={{
                                  backgroundColor: '#0f172a',
                                  padding: '0.4rem 0.7rem',
                                  borderRadius: '8px',
                                  textAlign: 'center',
                                  minWidth: 70,
                                }}
                              >
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>
                                  {it.startTime ?? '10:00'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  {it.durationMinutes} min
                                </div>
                              </div>

                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                  {it.customTitle ?? it.placeName ?? 'Actividad'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                  {it.categorySlug && (
                                    <span style={{ textTransform: 'capitalize', color: '#cbd5e1' }}>
                                      {it.categorySlug}
                                    </span>
                                  )}
                                  {idx > 0 && it.transitDistanceMetersFromPrev > 0 && (
                                    <span>
                                      {' '}• 🚶 Traslado: {(it.transitDistanceMetersFromPrev / 1000).toFixed(1)} km (~{it.transitMinutesFromPrev} min)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => handleOpenAlternatives(it)}
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }}
                              >
                                🔄 Alternativas (3 Niveles)
                              </button>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => handleOpenModifySchedule(it)}
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }}
                              >
                                ⏱️ Ajustar Horario
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  No tienes viajes registrados. Genera uno asistido para comenzar.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Asistido */}
        {showAssistedModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '1rem',
            }}
          >
            <form
              onSubmit={handleGenerateAssisted}
              className="card"
              style={{
                width: '100%',
                maxWidth: 480,
                backgroundColor: '#1e293b',
                padding: '1.5rem',
                borderRadius: '12px',
              }}
            >
              <h3 style={{ margin: '0 0 1rem 0' }}>✨ Generar Itinerario Asistido</h3>
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                <label style={{ fontSize: '0.85rem' }}>
                  Ciudad:
                  <select
                    className="input"
                    value={assistedCitySlug}
                    onChange={(e) => setAssistedCitySlug(e.target.value)}
                    style={{ width: '100%', marginTop: '0.3rem' }}
                  >
                    <option value="new-york">Nueva York</option>
                    <option value="austin">Austin</option>
                    <option value="chicago">Chicago</option>
                    <option value="miami">Miami</option>
                  </select>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem' }}>
                    Fecha inicio:
                    <input
                      type="date"
                      className="input"
                      value={assistedStartDate}
                      onChange={(e) => setAssistedStartDate(e.target.value)}
                      style={{ width: '100%', marginTop: '0.3rem' }}
                      required
                    />
                  </label>
                  <label style={{ fontSize: '0.85rem' }}>
                    Fecha fin:
                    <input
                      type="date"
                      className="input"
                      value={assistedEndDate}
                      onChange={(e) => setAssistedEndDate(e.target.value)}
                      style={{ width: '100%', marginTop: '0.3rem' }}
                      required
                    />
                  </label>
                </div>

                <label style={{ fontSize: '0.85rem' }}>
                  Presupuesto:
                  <select
                    className="input"
                    value={assistedBudget}
                    onChange={(e) => setAssistedBudget(e.target.value as BudgetTier)}
                    style={{ width: '100%', marginTop: '0.3rem' }}
                  >
                    <option value="LOW">Económico ($)</option>
                    <option value="MEDIUM">Medio ($$)</option>
                    <option value="HIGH">Alto ($$$)</option>
                  </select>
                </label>

                <label style={{ fontSize: '0.85rem' }}>
                  Estilo de viaje principal:
                  <select
                    className="input"
                    value={assistedStyle}
                    onChange={(e) => setAssistedStyle(e.target.value as TravelStyle)}
                    style={{ width: '100%', marginTop: '0.3rem' }}
                  >
                    <option value="CULTURAL">Cultural</option>
                    <option value="GASTRONOMICO">Gastronómico</option>
                    <option value="AVENTURERO">Aventurero</option>
                    <option value="NATURALEZA">Naturaleza</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowAssistedModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Generando...' : 'Crear Itinerario'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Alternativas en 3 Niveles */}
        {alternativesItem && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '1rem',
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: 640,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#1e293b',
                padding: '1.5rem',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>
                  🔄 Alternativas para: {alternativesItem.placeName ?? alternativesItem.customTitle}
                </h3>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setAlternativesItem(null)}
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loadingAlts ? (
                  <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    Clasificando alternativas según proximidad y tiempos...
                  </p>
                ) : alternativesData ? (
                  <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {/* Nivel 1 */}
                    <section>
                      <h4 style={{ color: '#10b981', margin: '0 0 0.5rem 0' }}>
                        🟢 Nivel 1: Muy Similares ({alternativesData.verySimilar.length})
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 0.5rem 0' }}>
                        Misma categoría, distancia cercana (&lt; 2.5 km) y duración equivalente.
                      </p>
                      {alternativesData.verySimilar.map((alt) => (
                        <div
                          key={alt.placeId}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: '#0f172a',
                            borderRadius: '8px',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{alt.placeName}</div>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                            📍 {(alt.distanceMetersFromOriginal / 1000).toFixed(1)} km • ⏱️ {alt.estimatedDurationMins} min • 💰 ${alt.estimatedCost}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.3rem' }}>
                            {alt.explanation}
                          </div>
                        </div>
                      ))}
                    </section>

                    {/* Nivel 2 */}
                    <section>
                      <h4 style={{ color: '#f59e0b', margin: '0 0 0.5rem 0' }}>
                        🟡 Nivel 2: Experiencias Relacionadas ({alternativesData.relatedExperiences.length})
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 0.5rem 0' }}>
                        Experiencias complementarias en la misma zona (&lt; 6 km).
                      </p>
                      {alternativesData.relatedExperiences.map((alt) => (
                        <div
                          key={alt.placeId}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: '#0f172a',
                            borderRadius: '8px',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{alt.placeName}</div>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                            📍 {(alt.distanceMetersFromOriginal / 1000).toFixed(1)} km • ⏱️ {alt.estimatedDurationMins} min
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.3rem' }}>
                            {alt.explanation}
                          </div>
                        </div>
                      ))}
                    </section>

                    {/* Nivel 3 */}
                    <section>
                      <h4 style={{ color: '#f97316', margin: '0 0 0.5rem 0' }}>
                        🟠 Nivel 3: Requiere Ajustes ({alternativesData.requiresAdjustments.length})
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 0.5rem 0' }}>
                        Opciones valiosas que implican mayor tiempo de viaje o modificar el orden del día.
                      </p>
                      {alternativesData.requiresAdjustments.slice(0, 3).map((alt) => (
                        <div
                          key={alt.placeId}
                          style={{
                            padding: '0.75rem',
                            backgroundColor: '#0f172a',
                            borderRadius: '8px',
                            border: '1px solid rgba(249, 115, 22, 0.4)',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{alt.placeName}</div>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                            📍 {(alt.distanceMetersFromOriginal / 1000).toFixed(1)} km
                          </div>
                        </div>
                      ))}
                    </section>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Ajustar Horario y Reorganización Inteligente */}
        {modifyingItem && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '1rem',
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: 520,
                backgroundColor: '#1e293b',
                padding: '1.5rem',
                borderRadius: '12px',
              }}
            >
              <h3 style={{ margin: '0 0 1rem 0' }}>
                ⏱️ Ajustar Horario: {modifyingItem.customTitle ?? modifyingItem.placeName}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <label style={{ fontSize: '0.85rem' }}>
                  Nueva Hora de Inicio:
                  <input
                    type="time"
                    className="input"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    style={{ width: '100%', marginTop: '0.3rem' }}
                  />
                </label>
                <label style={{ fontSize: '0.85rem' }}>
                  Duración (minutos):
                  <input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    className="input"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '0.3rem' }}
                  />
                </label>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handlePreviewReorg}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  🔍 Calcular Impacto en Actividades Posteriores
                </button>
              </div>

              {reorgPreview && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    border: `1px solid ${
                      reorgPreview.scheduleOverflowsDay ? '#ef4444' : '#38bdf8'
                    }`,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                    {reorgPreview.requiresApproval
                      ? '⚠️ Impacto detectado en el itinerario'
                      : '✅ Horarios compatibles sin afectaciones'}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                    {reorgPreview.reason}
                  </p>
                  {reorgPreview.scheduleOverflowsDay && (
                    <p style={{ fontSize: '0.8rem', color: '#ef4444', margin: '0.4rem 0 0 0' }}>
                      {reorgPreview.recommendationMessage}
                    </p>
                  )}

                  {reorgPreview.shiftedItems.length > 0 && (
                    <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Propuesta de reacomodo:
                      </div>
                      {reorgPreview.shiftedItems.map((sh) => (
                        <div
                          key={sh.itemId}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.4rem',
                            backgroundColor: 'rgba(56,189,248,0.1)',
                            borderRadius: '4px',
                          }}
                        >
                          • <strong>{sh.placeName}</strong>: {sh.originalStartTime} ➔{' '}
                          <span style={{ color: '#38bdf8' }}>{sh.proposedStartTime}</span> (+{sh.shiftMinutes} min)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setModifyingItem(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyReorg}
                  disabled={submittingReorg || !reorgPreview}
                >
                  {submittingReorg ? 'Aplicando...' : 'Confirmar y Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

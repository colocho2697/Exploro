'use client';

import React, { useEffect, useState } from 'react';
import { ExploroApiClient } from '@exploro/api-client';
import {
  AdminFeatureFlagDTO,
  AdminStatsDTO,
  AdminUserDTO,
  AiModelConfigDTO,
  AuditLogDTO,
  ContentReportDTO,
  ProcessingErrorDTO,
} from '@exploro/shared-types';

interface AdminControlPanelProps {
  client: ExploroApiClient;
  isLoggedIn: boolean;
  userRole?: string;
  onClose: () => void;
  onRequireAuth: () => void;
}

type AdminTab = 'overview' | 'flags' | 'reports' | 'audit' | 'ai' | 'errors' | 'users';

export function AdminControlPanel({
  client,
  isLoggedIn,
  userRole,
  onClose,
  onRequireAuth,
}: AdminControlPanelProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStatsDTO | null>(null);
  const [flags, setFlags] = useState<AdminFeatureFlagDTO[]>([]);
  const [reports, setReports] = useState<ContentReportDTO[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogDTO[]>([]);
  const [aiModels, setAiModels] = useState<AiModelConfigDTO[]>([]);
  const [errors, setErrors] = useState<ProcessingErrorDTO[]>([]);
  const [users, setUsers] = useState<AdminUserDTO[]>([]);

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modal para acción con motivo de auditoría
  const [targetFlag, setTargetFlag] = useState<AdminFeatureFlagDTO | null>(null);
  const [auditReason, setAuditReason] = useState('');
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
  const [reportResolutionNotes, setReportResolutionNotes] = useState('');

  const loadAllData = async (): Promise<void> => {
    if (!isLoggedIn) return;
    setLoading(true);
    setActionError(null);
    try {
      const [s, f, r, a, m, errs] = await Promise.all([
        client.getAdminStats(),
        client.listAdminFeatureFlags(),
        client.listContentReports(),
        client.listAuditLogs({ limit: 20 }),
        client.listAiModelsConfig(),
        client.listProcessingErrors(),
      ]);
      setStats(s);
      setFlags(f);
      setReports(r);
      setAuditLogs(a);
      setAiModels(m);
      setErrors(errs);
      if (userRole === 'ADMIN') {
        const u = await client.listAdminUsers();
        setUsers(u);
      }
    } catch (e: unknown) {
      setActionError(
        e instanceof Error ? e.message : 'Error al cargar datos administrativos.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      void loadAllData();
    }
  }, [isLoggedIn]);

  const handleToggleFlag = async (): Promise<void> => {
    if (!targetFlag) return;
    if (auditReason.trim().length < 10) {
      setActionError('El motivo de auditoría debe tener al menos 10 caracteres obligatorios.');
      return;
    }
    setActionError(null);
    try {
      await client.updateAdminFeatureFlag(targetFlag.key, {
        enabled: !targetFlag.enabled,
        reason: auditReason.trim(),
      });
      setSuccessNotice(`Bandera '${targetFlag.key}' actualizada correctamente.`);
      setTargetFlag(null);
      setAuditReason('');
      void loadAllData();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al actualizar feature flag.');
    }
  };

  const handleResolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED'): Promise<void> => {
    if (reportResolutionNotes.trim().length < 10) {
      setActionError('Las notas de resolución deben tener al menos 10 caracteres obligatorios.');
      return;
    }
    setActionError(null);
    try {
      await client.resolveContentReport(reportId, {
        status,
        resolutionNotes: reportResolutionNotes.trim(),
      });
      setSuccessNotice(`Reporte actualizado a ${status}.`);
      setResolvingReportId(null);
      setReportResolutionNotes('');
      void loadAllData();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al resolver reporte.');
    }
  };

  const handleResolveError = async (errorId: string): Promise<void> => {
    setActionError(null);
    try {
      await client.resolveProcessingError(errorId);
      setSuccessNotice('Error marcado como resuelto.');
      void loadAllData();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : 'Error al marcar error.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Panel de Administración"
        className="modal-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 480,
            width: '90%',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>
            🛡️ Control Administrativo
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Debes iniciar sesión con una cuenta de rol administrativo (ADMIN o MODERATOR) para acceder a este panel.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onRequireAuth();
              }}
            >
              Iniciar sesión
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Panel de Control y Gobernanza Administrativa"
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        zIndex: 1000,
        padding: '2rem 1rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 1100,
          width: '100%',
          padding: '1.8rem',
          display: 'grid',
          gap: '1.25rem',
          background: '#0f172a',
          border: '1px solid #334155',
        }}
      >
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🛡️ Administración y Control</h2>
              <span className="badge" style={{ background: '#e11d48', color: '#fff', fontSize: '.75rem' }}>
                {userRole ?? 'ADMIN'}
              </span>
              <span className="badge" style={{ background: 'rgba(16,185,129,.2)', color: '#34d399', fontSize: '.75rem' }}>
                $0.00 Zero-Cost
              </span>
            </div>
            <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginTop: '.2rem' }}>
              Gobernanza estricta • Inmutabilidad de testimonios • Auditoría completa en tiempo real
            </p>
          </div>
          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => void loadAllData()} disabled={loading}>
              {loading ? 'Actualizando…' : '🔄 Refrescar'}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Notificaciones */}
        {actionError && (
          <div role="alert" className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>⚠️ {actionError}</span>
            <button type="button" className="btn" onClick={() => setActionError(null)} style={{ padding: '.1rem .4rem', fontSize: '.75rem' }}>✕</button>
          </div>
        )}
        {successNotice && (
          <div role="status" className="alert alert-info" style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(16,185,129,.15)', borderColor: '#10b981' }}>
            <span>✅ {successNotice}</span>
            <button type="button" className="btn" onClick={() => setSuccessNotice(null)} style={{ padding: '.1rem .4rem', fontSize: '.75rem' }}>✕</button>
          </div>
        )}

        {/* Barra de pestañas */}
        <nav aria-label="Navegación de pestañas administrativas" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', borderBottom: '1px solid #334155', paddingBottom: '.5rem' }}>
          {(
            [
              { id: 'overview', label: '📊 Panorama General' },
              { id: 'flags', label: '🚩 Feature Flags' },
              { id: 'reports', label: `🚨 Reportes (${reports.filter((r) => r.status === 'PENDING').length})` },
              { id: 'audit', label: '📜 Auditoría Inmutable' },
              { id: 'ai', label: '🤖 Modelos de IA ($0.00)' },
              { id: 'errors', label: `⚠️ Errores Ingesta (${errors.filter((e) => !e.isResolved).length})` },
              ...(userRole === 'ADMIN' ? [{ id: 'users', label: '👥 Usuarios' }] : []),
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn ${activeTab === tab.id ? 'btn-primary' : ''}`}
              style={{
                fontSize: '.85rem',
                padding: '.4rem .8rem',
                background: activeTab === tab.id ? '#38bdf8' : 'transparent',
                color: activeTab === tab.id ? '#0f172a' : '#cbd5e1',
                borderColor: activeTab === tab.id ? '#38bdf8' : '#334155',
              }}
              onClick={() => setActiveTab(tab.id as AdminTab)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 1. PANORAMA GENERAL */}
        {activeTab === 'overview' && stats && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.8rem' }}>
              <div className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Usuarios Registrados</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>{stats.totalUsers}</div>
              </div>
              <div className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Lugares en Catálogo</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{stats.totalPlaces}</div>
              </div>
              <div className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Evidencias Respaldadas</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a855f7' }}>{stats.totalEvidences}</div>
              </div>
              <div className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Opiniones Comunitarias</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{stats.totalUserReviews}</div>
              </div>
              <div className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Viajes Planificados</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>{stats.totalTrips}</div>
              </div>
              <div className="card" style={{ padding: '1rem', background: stats.pendingReportsCount > 0 ? '#450a0a' : '#1e293b' }}>
                <div style={{ fontSize: '.75rem', color: '#fca5a5' }}>Reportes Pendientes</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>{stats.pendingReportsCount}</div>
              </div>
              <div className="card" style={{ padding: '1rem', background: stats.unresolvedErrorsCount > 0 ? '#450a0a' : '#1e293b' }}>
                <div style={{ fontSize: '.75rem', color: '#fca5a5' }}>Errores Ingesta</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171' }}>{stats.unresolvedErrorsCount}</div>
              </div>
              <div className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                <div style={{ fontSize: '.75rem', color: '#94a3b8' }}>Banderas Activas</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2dd4bf' }}>{stats.activeFeatureFlagsCount}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.2rem', background: '#1e293b' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '.5rem' }}>Principios de Arquitectura Inmutable</h3>
              <p style={{ fontSize: '.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                • <strong>Inmutabilidad Textual:</strong> El texto de opiniones y fragmentos citados no puede ser editado ni silenciado por administradores; solo se permite moderar su estado.<br/>
                • <strong>Auditoría Exigible:</strong> Ninguna modificación se ejecuta sin registrar actor, entidad, estados y un motivo explícito de al menos 10 caracteres.<br/>
                • <strong>Costos Cero ($0.00):</strong> No se utilizan APIs de pago; georreferenciación PostGIS y modelos locales Ollama en ejecución contenerizada.
              </p>
            </div>
          </div>
        )}

        {/* 2. FEATURE FLAGS */}
        {activeTab === 'flags' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>
              Permite alternar funcionalidades en caliente sin reiniciar el servidor. Cada cambio queda registrado en audit_logs.
            </p>
            <div style={{ display: 'grid', gap: '.6rem' }}>
              {flags.map((f) => (
                <div
                  key={f.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '.8rem 1rem',
                    background: '#1e293b',
                    borderRadius: 6,
                    border: '1px solid #334155',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <code>{f.key}</code>
                      <span className="badge" style={{ background: f.enabled ? '#065f46' : '#7f1d1d', color: '#fff', fontSize: '.7rem' }}>
                        {f.enabled ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    <div style={{ fontSize: '.8rem', color: '#94a3b8', marginTop: '.2rem' }}>
                      {f.description ?? 'Sin descripción'}
                    </div>
                  </div>
                  {userRole === 'ADMIN' && (
                    <button
                      type="button"
                      className="btn"
                      style={{
                        background: f.enabled ? '#7f1d1d' : '#065f46',
                        borderColor: f.enabled ? '#dc2626' : '#10b981',
                        color: '#fff',
                        fontSize: '.8rem',
                      }}
                      onClick={() => {
                        setTargetFlag(f);
                        setAuditReason('');
                      }}
                    >
                      {f.enabled ? 'Deshabilitar' : 'Habilitar'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. REPORTES COMUNITARIOS */}
        {activeTab === 'reports' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>
              Reportes generados por la comunidad sobre lugares, evidencias u opiniones inconsistentes.
            </p>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No hay reportes registrados.</div>
            ) : (
              <div style={{ display: 'grid', gap: '.8rem' }}>
                {reports.map((r) => (
                  <div key={r.id} className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '.7rem', marginRight: '.5rem' }}>
                          {r.targetType}
                        </span>
                        <span className="badge" style={{ background: r.status === 'PENDING' ? '#dc2626' : '#10b981', color: '#fff', fontSize: '.7rem' }}>
                          {r.status}
                        </span>
                        <div style={{ fontWeight: 600, marginTop: '.4rem' }}>Motivo: {r.reason}</div>
                        {r.details && <div style={{ fontSize: '.85rem', color: '#cbd5e1', marginTop: '.2rem' }}>Detalles: {r.details}</div>}
                        <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: '.4rem' }}>
                          Reportado: {new Date(r.createdAt).toLocaleString()} • Target: <code>{r.targetId}</code>
                        </div>
                        {r.resolutionNotes && (
                          <div style={{ fontSize: '.8rem', color: '#34d399', marginTop: '.4rem', background: 'rgba(16,185,129,.1)', padding: '.4rem', borderRadius: 4 }}>
                            Resolución: {r.resolutionNotes} (por: {r.resolvedBy ?? 'admin'})
                          </div>
                        )}
                      </div>
                      {r.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '.8rem', padding: '.3rem .6rem' }}
                            onClick={() => {
                              setResolvingReportId(r.id);
                              setReportResolutionNotes('');
                            }}
                          >
                            Resolver / Desestimar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. AUDITORÍA INMUTABLE */}
        {activeTab === 'audit' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>
              Registro inmutable de toda acción administrativa. Garantiza transparencia e impide manipulaciones silenciosas.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '.6rem' }}>Fecha</th>
                    <th style={{ padding: '.6rem' }}>Actor</th>
                    <th style={{ padding: '.6rem' }}>Entidad</th>
                    <th style={{ padding: '.6rem' }}>Acción</th>
                    <th style={{ padding: '.6rem' }}>Motivo Exigido</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '.6rem', whiteSpace: 'nowrap', color: '#64748b' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '.6rem' }}>
                        <div>{log.actorName ?? 'Sistema'}</div>
                        <span className="badge" style={{ fontSize: '.65rem', background: '#334155', color: '#94a3b8' }}>
                          {log.actorRole ?? 'ADMIN'}
                        </span>
                      </td>
                      <td style={{ padding: '.6rem' }}>
                        <code>{log.entityType}</code>
                      </td>
                      <td style={{ padding: '.6rem' }}>
                        <span className="badge" style={{ background: 'rgba(56,189,248,.15)', color: '#38bdf8', fontSize: '.7rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '.6rem', maxWidth: 300 }}>
                        <div style={{ fontStyle: 'italic', color: '#cbd5e1' }}>«{log.reason}»</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. MODELOS DE IA */}
        {activeTab === 'ai' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>
              Modelos locales de extracción y análisis semántico ejecutados en contenedor propio ($0.00 sin facturación externa).
            </p>
            <div style={{ display: 'grid', gap: '.8rem' }}>
              {aiModels.map((m) => (
                <div key={m.id} className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{m.modelName}</div>
                      <div style={{ fontSize: '.8rem', color: '#94a3b8' }}>{m.description ?? 'Modelo de procesamiento'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                      <span className="badge" style={{ background: '#0284c7', color: '#fff', fontSize: '.75rem' }}>
                        {m.provider}
                      </span>
                      <span className="badge" style={{ background: m.isActive ? '#10b981' : '#64748b', color: '#fff', fontSize: '.75rem' }}>
                        {m.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: '.6rem', fontSize: '.75rem', background: '#0f172a', padding: '.4rem', borderRadius: 4 }}>
                    <code>Parámetros: {JSON.stringify(m.parameters)}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. ERRORES DE INGESTA */}
        {activeTab === 'errors' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>
              Errores detectados durante la ingesta de fuentes o extracción con IA local.
            </p>
            {errors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No hay errores registrados.</div>
            ) : (
              <div style={{ display: 'grid', gap: '.8rem' }}>
                {errors.map((e) => (
                  <div key={e.id} className="card" style={{ padding: '1rem', background: '#1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f87171' }}>{e.errorType}</div>
                        <div style={{ fontSize: '.85rem', color: '#cbd5e1', marginTop: '.2rem' }}>{e.errorMessage}</div>
                        <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: '.4rem' }}>
                          Fuente: {e.sourceCode ?? 'N/A'} • {new Date(e.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {!e.isResolved ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '.8rem' }}
                          onClick={() => void handleResolveError(e.id)}
                        >
                          Marcar resuelto
                        </button>
                      ) : (
                        <span className="badge" style={{ background: '#10b981', color: '#fff', fontSize: '.75rem' }}>
                          Resuelto
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. USUARIOS (Solo ADMIN) */}
        {activeTab === 'users' && userRole === 'ADMIN' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '.6rem' }}>Nombre</th>
                    <th style={{ padding: '.6rem' }}>Email</th>
                    <th style={{ padding: '.6rem' }}>Rol</th>
                    <th style={{ padding: '.6rem' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '.6rem', fontWeight: 600 }}>{u.displayName}</td>
                      <td style={{ padding: '.6rem', color: '#94a3b8' }}>{u.email}</td>
                      <td style={{ padding: '.6rem' }}>
                        <span className="badge" style={{ background: u.role === 'ADMIN' ? '#e11d48' : u.role === 'MODERATOR' ? '#d97706' : '#334155', color: '#fff', fontSize: '.7rem' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '.6rem' }}>
                        <span className="badge" style={{ background: u.isActive ? '#10b981' : '#ef4444', color: '#fff', fontSize: '.7rem' }}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal para motivo obligatorio de auditoría al alternar feature flag */}
      {targetFlag && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmación de modificación con auditoría"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
          }}
        >
          <div className="card" style={{ maxWidth: 460, width: '90%', padding: '1.5rem', background: '#0f172a', border: '1px solid #ef4444' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '.5rem', color: '#f87171' }}>
              ⚠️ Confirmar Modificación de Feature Flag
            </h3>
            <p style={{ fontSize: '.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Por regla de gobernanza estricta, debes justificar este cambio en la auditoría inmutable del sistema (mínimo 10 caracteres).
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="audit-reason-input" style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: '.3rem' }}>
                Motivo de Auditoría:
              </label>
              <textarea
                id="audit-reason-input"
                className="input"
                style={{ width: '100%', minHeight: 80, fontSize: '.85rem' }}
                placeholder="Escribe el motivo detallado de esta acción…"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
              />
              <span style={{ fontSize: '.75rem', color: auditReason.trim().length >= 10 ? '#34d399' : '#f87171' }}>
                {auditReason.trim().length}/10 caracteres mínimos
              </span>
            </div>
            <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setTargetFlag(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                disabled={auditReason.trim().length < 10}
                onClick={() => void handleToggleFlag()}
              >
                Confirmar y Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para resolución de reporte comunitario */}
      {resolvingReportId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Resolución de reporte comunitario"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
          }}
        >
          <div className="card" style={{ maxWidth: 480, width: '90%', padding: '1.5rem', background: '#0f172a', border: '1px solid #38bdf8' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '.5rem' }}>
              📋 Resolución de Reporte Comunitario
            </h3>
            <p style={{ fontSize: '.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Ingresa las notas de resolución que se guardarán en el historial público del reporte y en la auditoría.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="resolution-notes-input" style={{ fontSize: '.8rem', fontWeight: 600, display: 'block', marginBottom: '.3rem' }}>
                Notas de Resolución:
              </label>
              <textarea
                id="resolution-notes-input"
                className="input"
                style={{ width: '100%', minHeight: 80, fontSize: '.85rem' }}
                placeholder="Explica la decisión tomada y medidas adoptadas…"
                value={reportResolutionNotes}
                onChange={(e) => setReportResolutionNotes(e.target.value)}
              />
              <span style={{ fontSize: '.75rem', color: reportResolutionNotes.trim().length >= 10 ? '#34d399' : '#f87171' }}>
                {reportResolutionNotes.trim().length}/10 caracteres mínimos
              </span>
            </div>
            <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setResolvingReportId(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={reportResolutionNotes.trim().length < 10}
                onClick={() => void handleResolveReport(resolvingReportId, 'DISMISSED')}
              >
                Desestimar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={reportResolutionNotes.trim().length < 10}
                onClick={() => void handleResolveReport(resolvingReportId, 'RESOLVED')}
              >
                Resolver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

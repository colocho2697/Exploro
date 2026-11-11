/**
 * Módulo de Resiliencia Móvil, Conectividad Limitada y Geolocalización (Fase 8).
 * Cumple con Paso 8.2 y 8.3 de MASTER_PROMPT.md:
 * - Ahorro de batería (sin polling continuo).
 * - Manejo de conectividad limitada y modo offline.
 * - Adaptación responsive (teléfonos y tabletas).
 * - Manejo ético de permisos de geolocalización.
 */

export type NetworkStatus = 'ONLINE' | 'LIMITED' | 'OFFLINE';

export type ScreenSizeCategory = 'PHONE_COMPACT' | 'PHONE_STANDARD' | 'TABLET';

export type LocationPermissionState = 'UNDETERMINED' | 'GRANTED' | 'DENIED';

export interface CachedRecord<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

export class OfflineStorageManager {
  private memoryCache: Map<string, CachedRecord<unknown>> = new Map();

  /**
   * Guarda un elemento con tiempo de vida (TTL) en milisegundos.
   */
  public set<T>(key: string, data: T, ttlMs = 3600000): void {
    const now = Date.now();
    this.memoryCache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Obtiene un elemento; si expiró o no existe, retorna null en modo online,
   * o el último valor conocido si allowStaleOnOffline = true.
   */
  public get<T>(key: string, isOffline = false): T | null {
    const record = this.memoryCache.get(key) as CachedRecord<T> | undefined;
    if (!record) return null;

    const now = Date.now();
    if (now > record.expiresAt) {
      if (isOffline) {
        return record.data; // Stale-while-offline
      }
      this.memoryCache.delete(key);
      return null;
    }

    return record.data;
  }

  public clear(): void {
    this.memoryCache.clear();
  }

  public getCacheSize(): number {
    return this.memoryCache.size;
  }
}

/**
 * Determina el tipo de pantalla según el ancho en dp para diseño responsivo.
 */
export function getScreenCategory(width: number): ScreenSizeCategory {
  if (width < 360) return 'PHONE_COMPACT';
  if (width < 600) return 'PHONE_STANDARD';
  return 'TABLET';
}

/**
 * Calcula columnas de visualización según dispositivo.
 */
export function getGridColumns(category: ScreenSizeCategory): number {
  switch (category) {
    case 'PHONE_COMPACT':
      return 1;
    case 'PHONE_STANDARD':
      return 1;
    case 'TABLET':
      return 2;
  }
}

/**
 * Evaluador de permisos de geolocalización con fallback elegante.
 */
export function resolveLocationStrategy(
  permission: LocationPermissionState,
  gpsAvailable: boolean
): { useGps: boolean; fallbackReason?: string } {
  if (permission === 'DENIED') {
    return {
      useGps: false,
      fallbackReason:
        'Permiso de ubicación denegado. Se utilizará la ciudad seleccionada manualmente.',
    };
  }

  if (permission === 'UNDETERMINED') {
    return {
      useGps: false,
      fallbackReason:
        'Permiso de ubicación pendiente de solicitud voluntaria.',
    };
  }

  if (!gpsAvailable) {
    return {
      useGps: false,
      fallbackReason:
        'Servicios de ubicación del dispositivo desactivados. Se utilizará selección de ciudad.',
    };
  }

  return { useGps: true };
}

/**
 * Validador de política de ahorro de batería:
 * Prohíbe intervalos de actualización menores a 30 segundos en segundo plano.
 */
export function validateBatteryFriendlyInterval(intervalMs: number): boolean {
  return intervalMs >= 30000;
}

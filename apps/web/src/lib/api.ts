import { ExploroApiClient } from '@exploro/api-client';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Estilo de mapa vectorial gratuito (OpenFreeMap / OpenStreetMap), sin API key. */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  'https://tiles.openfreemap.org/styles/liberty';

export function createApiClient(
  getToken: () => string | null,
  options?: { isInternal?: boolean }
): ExploroApiClient {
  return new ExploroApiClient({
    baseUrl: API_BASE_URL,
    getAccessToken: getToken,
    defaultHeaders: options?.isInternal
      ? { 'x-exploro-internal': 'true' }
      : undefined,
  });
}


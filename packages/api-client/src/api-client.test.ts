import { describe, expect, it, vi } from 'vitest';
import { ExploroApiClient, ExploroApiError } from './index';

describe('@exploro/api-client', () => {
  it('construye peticiones tipadas e inyecta el token Bearer cuando está disponible', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'cat-1',
            slug: 'comida',
            name: 'Comida',
            description: 'Restaurantes y gastronomía local',
            iconName: 'utensils',
            sortOrder: 1,
            isActive: true,
            subcategories: [],
          },
        ],
      }),
    });

    const client = new ExploroApiClient({
      baseUrl: 'http://localhost:4000/api/v1/',
      getAccessToken: () => 'jwt-token-123',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const categories = await client.getCategories();

    expect(categories).toHaveLength(1);
    expect(categories[0]?.slug).toBe('comida');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/categories',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-token-123',
        }),
      })
    );
  });

  it('lanza ExploroApiError cuando la respuesta indica error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: {
          code: 'MODE_DISABLED',
          message: 'El modo local no está habilitado.',
        },
      }),
    });

    const client = new ExploroApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    await expect(client.getBootstrapConfig()).rejects.toThrowError(
      ExploroApiError
    );
  });

  it('permite iniciar actividad, verificar visita y completar con reseña adaptada (Fase 5)', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: {
            id: 'act-123',
            userId: 'usr-1',
            placeId: '77777777-7777-7777-7777-777777777701',
            activityTitle: 'Probar pizza',
            status: 'STARTED',
            verificationMethod: 'NONE',
            isVerifiedVisit: false,
            startedAt: new Date().toISOString(),
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            isVerified: true,
            verificationMethod: 'GPS_PROXIMITY',
            distanceMeters: 45,
            message: 'Visita verificada exitosamente mediante GPS (45m).',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: {
            id: 'rev-1',
            activityLogId: 'act-123',
            placeId: '77777777-7777-7777-7777-777777777701',
            reviewType: 'RESTAURANT',
            isVerifiedVisit: true,
            verificationMethod: 'GPS_PROXIMITY',
            wouldReturnOrRecommend: true,
          },
        }),
      });

    const client = new ExploroApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    const started = await client.startActivity({
      placeId: '77777777-7777-7777-7777-777777777701',
      activityTitle: 'Probar pizza',
    });
    expect(started.id).toBe('act-123');
    expect(started.status).toBe('STARTED');

    const verified = await client.verifyActivityVisit('act-123', {
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(verified.isVerified).toBe(true);
    expect(verified.verificationMethod).toBe('GPS_PROXIMITY');

    const completed = await client.completeActivityWithReview('act-123', {
      reviewType: 'RESTAURANT',
      restaurantReview: {
        tasteQuality: 5,
        wouldReturn: true,
      },
    });
    expect(completed.id).toBe('rev-1');
    expect(completed.isVerifiedVisit).toBe(true);
  });
});


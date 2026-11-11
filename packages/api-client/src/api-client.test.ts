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
});


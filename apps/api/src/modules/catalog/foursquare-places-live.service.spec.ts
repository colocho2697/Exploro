import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FoursquarePlacesLiveService } from './foursquare-places-live.service';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';

describe('FoursquarePlacesLiveService Unit Test', () => {
  let service: FoursquarePlacesLiveService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
    };
    mockRedis = {
      getJson: vi.fn().mockResolvedValue(null),
      setJson: vi.fn().mockResolvedValue(undefined),
    };
    service = new FoursquarePlacesLiveService(mockDb as DatabaseService, mockRedis as RedisService);
  });

  it('should instantiate cleanly with dependencies', () => {
    expect(service).toBeDefined();
  });

  it('should return 0 immediately if coordinates are missing', async () => {
    const result = await service.ensureAreaPopulated({ categorySlug: 'comida' }, 0);
    expect(result).toBe(0);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('should return 0 if existingCount is 8 or more and no searchQuery is given', async () => {
    const result = await service.ensureAreaPopulated(
      { lat: 14.6349, lng: -90.5069, categorySlug: 'comida' },
      8
    );
    expect(result).toBe(0);
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  it('should return 0 when test environment is active (safety guard)', async () => {
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const result = await service.ensureAreaPopulated(
      { lat: 14.6349, lng: -90.5069, categorySlug: 'comida' },
      0
    );
    expect(result).toBe(0);
    process.env.NODE_ENV = oldEnv;
  });
});

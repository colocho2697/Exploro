import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://exploro:exploro_dev_local_pass@localhost:5432/exploro_db';

    this.pool = new Pool({
      connectionString,
      max: 15,
      idleTimeoutMillis: 30000,
    });
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  public async checkPostgisHealth(): Promise<{
    healthy: boolean;
    postgisVersion?: string;
  }> {
    try {
      const res = await this.pool.query<{ version: string }>(
        'SELECT PostGIS_Lib_Version() AS version'
      );
      return {
        healthy: true,
        postgisVersion: res.rows[0]?.version,
      };
    } catch {
      return { healthy: false };
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}


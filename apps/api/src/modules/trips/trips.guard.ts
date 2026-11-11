import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Guardia de Feature Flag para el Planificador de Viajes (Fase 6).
 * Regla de MASTER_PROMPT.md:
 * "Esta fase debe desarrollarse internamente y permanecer deshabilitada para los usuarios públicos.
 *  Utilizar una bandera de funcionalidad o feature flag para controlar su visibilidad."
 */
@Injectable()
export class TripsFeatureFlagGuard implements CanActivate {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // 1. Cabeceras internas de desarrollo / QA / testing
    const internalHeader = req.headers['x-exploro-internal'];
    const overrideHeader = req.headers['x-feature-override'];
    if (
      internalHeader === 'true' ||
      internalHeader === '1' ||
      overrideHeader === 'trip-planner'
    ) {
      return true;
    }

    // 2. Verificar estado de la bandera en la base de datos
    const flagRes = await this.db.query<{ enabled: boolean }>(
      `SELECT enabled FROM feature_flags WHERE key = 'trip_planner_enabled' LIMIT 1`
    );

    const isEnabled = flagRes.rows[0]?.enabled ?? false;
    if (isEnabled) {
      return true;
    }

    // 3. Si la bandera está deshabilitada y no hay override interno, bloquear acceso
    throw new ForbiddenException(
      'El Planificador de Viajes se encuentra en fase de desarrollo interno y está deshabilitado para usuarios públicos (Feature Flag: trip_planner_enabled = false).'
    );
  }
}

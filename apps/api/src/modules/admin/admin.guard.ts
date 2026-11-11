import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@exploro/shared-types';
import { AuthService } from '../auth/auth.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    reflector?: Reflector
  ) {
    this.reflector = reflector ?? new Reflector();
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Token de autenticación requerido.');
    }

    const principal = this.authService.authenticateBearerHeader(authHeader);
    if (!principal) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    req.user = principal;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(principal.role)) {
        throw new ForbiddenException(
          `Acceso denegado: Se requiere rol ${requiredRoles.join(' o ')}.`
        );
      }
      return true;
    }

    // Por defecto, cualquier endpoint administrativo requiere al menos MODERATOR o ADMIN
    if (principal.role !== 'ADMIN' && principal.role !== 'MODERATOR') {
      throw new ForbiddenException(
        'Acceso denegado: Se requiere rol administrativo (ADMIN o MODERATOR).'
      );
    }

    return true;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiResponse,
  AuthSessionResponse,
  AuthTokens,
  UserProfile,
} from '@exploro/shared-types';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  updatePreferencesSchema,
} from '@exploro/validation';
import { AuthService } from './auth.service';

@ApiTags('Authentication & User Preferences')
@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('auth/register')
  @ApiOperation({ summary: 'Registrar nuevo usuario viajero' })
  public async register(
    @Body() body: unknown
  ): Promise<ApiResponse<AuthSessionResponse>> {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Datos de registro inválidos.'
      );
    }
    const data = await this.authService.register(parsed.data);
    return { success: true, data };
  }

  @Post('auth/login')
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña' })
  public async login(
    @Body() body: unknown
  ): Promise<ApiResponse<AuthSessionResponse>> {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Datos de inicio de sesión inválidos.'
      );
    }
    const data = await this.authService.login(parsed.data);
    return { success: true, data };
  }

  @Post('auth/refresh')
  @ApiOperation({ summary: 'Rotar refreshToken y obtener nuevo accessToken' })
  public async refresh(
    @Body() body: unknown
  ): Promise<ApiResponse<AuthTokens>> {
    const parsed = refreshTokenSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Token de refresco inválido.');
    }
    const data = await this.authService.refresh(parsed.data);
    return { success: true, data };
  }

  @Post('auth/logout')
  @ApiOperation({ summary: 'Cerrar sesión activa y revocar tokens' })
  public async logout(
    @Headers('authorization') authHeader?: string
  ): Promise<ApiResponse<{ loggedOut: boolean }>> {
    const principal = this.authService.authenticateBearerHeader(authHeader);
    if (!principal) {
      throw new UnauthorizedException('Autenticación requerida.');
    }
    const data = await this.authService.logout(principal.userId);
    return { success: true, data };
  }

  @Post('auth/forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  public async forgotPassword(
    @Body() body: unknown
  ): Promise<ApiResponse<{ message: string; resetTokenForDev?: string }>> {
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Correo electrónico inválido.');
    }
    const data = await this.authService.requestPasswordReset(parsed.data);
    return { success: true, data };
  }

  @Post('auth/reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token válido' })
  public async resetPassword(
    @Body() body: unknown
  ): Promise<ApiResponse<{ reset: boolean }>> {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Datos de restablecimiento inválidos.'
      );
    }
    const data = await this.authService.resetPassword(parsed.data);
    return { success: true, data };
  }

  @Get('users/me')
  @ApiOperation({ summary: 'Obtener perfil y preferencias del usuario actual' })
  public async getMe(
    @Headers('authorization') authHeader?: string
  ): Promise<ApiResponse<UserProfile>> {
    const principal = this.authService.authenticateBearerHeader(authHeader);
    if (!principal) {
      throw new UnauthorizedException('Autenticación requerida.');
    }
    const data = await this.authService.getUserProfile(principal.userId);
    return { success: true, data };
  }

  @Patch('users/me/preferences')
  @ApiOperation({
    summary:
      'Actualizar preferencias y activar/desactivar la personalización en búsquedas',
  })
  public async updatePreferences(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown
  ): Promise<ApiResponse<UserProfile>> {
    const principal = this.authService.authenticateBearerHeader(authHeader);
    if (!principal) {
      throw new UnauthorizedException('Autenticación requerida.');
    }
    const parsed = updatePreferencesSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Preferencias inválidas.');
    }
    const data = await this.authService.updatePreferences(
      principal.userId,
      parsed.data
    );
    return { success: true, data };
  }
}

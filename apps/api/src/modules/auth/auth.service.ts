import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthSessionResponse,
  AuthTokens,
  BudgetTier,
  CategorySlug,
  CompanionType,
  ExplorationMode,
  TravelStyle,
  UserProfile,
  UserRole,
} from '@exploro/shared-types';
import {
  ForgotPasswordInput,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
  UpdatePreferencesInput,
} from '@exploro/validation';
import { DatabaseService } from '../../database/database.service';
import {
  generateOpaqueToken,
  hashPassword,
  sha256Hex,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from './crypto.util';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
}

interface PreferencesRow {
  id: string;
  user_id: string;
  personalization_enabled: boolean;
  preferred_mode: ExplorationMode;
  budget_tier: BudgetTier;
  favorite_categories: CategorySlug[];
  travel_styles: TravelStyle[];
  companion_default: CompanionType;
  updated_at: Date;
}

@Injectable()
export class AuthService {
  private readonly accessExpiresIn = Number(
    process.env.JWT_ACCESS_EXPIRES_IN ?? 900
  );
  private readonly refreshExpiresIn = Number(
    process.env.JWT_REFRESH_EXPIRES_IN ?? 604800
  );

  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  public async register(input: RegisterInput): Promise<AuthSessionResponse> {
    const existing = await this.db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [input.email]
    );
    if (existing.rows.length > 0) {
      throw new ConflictException(
        'Ya existe una cuenta registrada con este correo electrónico.'
      );
    }

    const passwordHash = hashPassword(input.password);
    const userRes = await this.db.query<UserRow>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'TRAVELER')
       RETURNING id, email, password_hash, display_name, role, is_active, created_at`,
      [input.email, passwordHash, input.displayName]
    );
    const userRow = userRes.rows[0]!;

    const prefRes = await this.db.query<PreferencesRow>(
      `INSERT INTO user_preferences (user_id, personalization_enabled, preferred_mode, budget_tier)
       VALUES ($1, TRUE, 'TRAVELER', 'MEDIUM')
       RETURNING *`,
      [userRow.id]
    );

    const tokens = await this.issueSessionTokens(userRow);
    return {
      user: this.mapUserProfile(userRow, prefRes.rows[0]!),
      tokens,
    };
  }

  public async login(input: LoginInput): Promise<AuthSessionResponse> {
    const userRes = await this.db.query<UserRow>(
      `SELECT id, email, password_hash, display_name, role, is_active, created_at
       FROM users WHERE email = $1`,
      [input.email]
    );
    const userRow = userRes.rows[0];
    if (!userRow || !verifyPassword(input.password, userRow.password_hash)) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    if (!userRow.is_active) {
      throw new UnauthorizedException('La cuenta se encuentra deshabilitada.');
    }

    const prefRow = await this.ensureUserPreferences(userRow.id);
    const tokens = await this.issueSessionTokens(userRow);

    return {
      user: this.mapUserProfile(userRow, prefRow),
      tokens,
    };
  }

  public async refresh(input: RefreshTokenInput): Promise<AuthTokens> {
    const tokenHash = sha256Hex(input.refreshToken);
    const sessionRes = await this.db.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `SELECT id, user_id, expires_at, revoked_at
       FROM user_sessions
       WHERE refresh_token_hash = $1`,
      [tokenHash]
    );

    const session = sessionRes.rows[0];
    if (
      !session ||
      session.revoked_at !== null ||
      new Date(session.expires_at).getTime() <= Date.now()
    ) {
      throw new UnauthorizedException(
        'Sesión expirada o inválida. Por favor inicia sesión nuevamente.'
      );
    }

    await this.db.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1',
      [session.id]
    );

    const userRes = await this.db.query<UserRow>(
      'SELECT id, email, password_hash, display_name, role, is_active, created_at FROM users WHERE id = $1',
      [session.user_id]
    );
    const userRow = userRes.rows[0];
    if (!userRow || !userRow.is_active) {
      throw new UnauthorizedException('Usuario no válido.');
    }

    return this.issueSessionTokens(userRow);
  }

  public async logout(userId: string): Promise<{ loggedOut: boolean }> {
    await this.db.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
    return { loggedOut: true };
  }

  public async requestPasswordReset(
    input: ForgotPasswordInput
  ): Promise<{ message: string; resetTokenForDev?: string }> {
    const userRes = await this.db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [input.email]
    );
    const user = userRes.rows[0];
    if (!user) {
      return {
        message:
          'Si el correo existe en nuestro sistema, recibirás instrucciones para recuperar el acceso.',
      };
    }

    const rawToken = generateOpaqueToken(24);
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    return {
      message:
        'Si el correo existe en nuestro sistema, recibirás instrucciones para recuperar el acceso.',
      ...(process.env.NODE_ENV !== 'production'
        ? { resetTokenForDev: rawToken }
        : {}),
    };
  }

  public async resetPassword(
    input: ResetPasswordInput
  ): Promise<{ reset: boolean }> {
    const tokenHash = sha256Hex(input.token);
    const tokenRes = await this.db.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    const record = tokenRes.rows[0];
    if (
      !record ||
      record.used_at !== null ||
      new Date(record.expires_at).getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'El token de recuperación es inválido o ha expirado.'
      );
    }

    const newHash = hashPassword(input.newPassword);
    await this.db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, record.user_id]
    );
    await this.db.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [record.id]
    );
    await this.db.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [record.user_id]
    );

    return { reset: true };
  }

  public async getUserProfile(userId: string): Promise<UserProfile> {
    const userRes = await this.db.query<UserRow>(
      'SELECT id, email, password_hash, display_name, role, is_active, created_at FROM users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    const pref = await this.ensureUserPreferences(user.id);
    return this.mapUserProfile(user, pref);
  }

  public async updatePreferences(
    userId: string,
    input: UpdatePreferencesInput
  ): Promise<UserProfile> {
    const current = await this.ensureUserPreferences(userId);

    const personalizationEnabled =
      input.personalizationEnabled ?? current.personalization_enabled;
    const budgetTier = input.budgetTier ?? current.budget_tier;
    const favoriteCategories =
      input.favoriteCategories ?? current.favorite_categories;
    const travelStyles = input.travelStyles ?? current.travel_styles;
    const companionDefault =
      input.companionDefault ?? current.companion_default;

    await this.db.query(
      `UPDATE user_preferences
       SET personalization_enabled = $1,
           budget_tier = $2,
           favorite_categories = $3::jsonb,
           travel_styles = $4::jsonb,
           companion_default = $5,
           updated_at = NOW()
       WHERE user_id = $6`,
      [
        personalizationEnabled,
        budgetTier,
        JSON.stringify(favoriteCategories),
        JSON.stringify(travelStyles),
        companionDefault,
        userId,
      ]
    );

    return this.getUserProfile(userId);
  }

  public requirePrincipal(authHeader?: string): {
    userId: string;
    email: string;
    role: UserRole;
  } {
    const principal = this.authenticateBearerHeader(authHeader);
    if (!principal) {
      throw new UnauthorizedException('Autenticación requerida.');
    }
    return principal;
  }

  /** Perfil del usuario si el token es válido; null en modo invitado o token inválido. */
  public async getOptionalProfile(
    authHeader?: string
  ): Promise<UserProfile | null> {
    const principal = this.authenticateBearerHeader(authHeader);
    if (!principal) return null;
    try {
      return await this.getUserProfile(principal.userId);
    } catch {
      return null;
    }
  }

  public authenticateBearerHeader(
    authHeader?: string
  ): { userId: string; email: string; role: UserRole } | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    if (!payload) return null;
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

  private async issueSessionTokens(user: UserRow): Promise<AuthTokens> {
    const accessToken = signAccessToken(
      { id: user.id, email: user.email, role: user.role },
      this.accessExpiresIn
    );
    const refreshToken = generateOpaqueToken(32);
    const refreshTokenHash = sha256Hex(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshExpiresIn * 1000);

    await this.db.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshTokenHash, expiresAt]
    );

    return {
      accessToken,
      refreshToken,
      expiresInSeconds: this.accessExpiresIn,
    };
  }

  private async ensureUserPreferences(userId: string): Promise<PreferencesRow> {
    const existing = await this.db.query<PreferencesRow>(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    if (existing.rows[0]) {
      return existing.rows[0];
    }
    const created = await this.db.query<PreferencesRow>(
      `INSERT INTO user_preferences (user_id, personalization_enabled, preferred_mode, budget_tier)
       VALUES ($1, TRUE, 'TRAVELER', 'MEDIUM')
       RETURNING *`,
      [userId]
    );
    return created.rows[0]!;
  }

  private mapUserProfile(user: UserRow, pref: PreferencesRow): UserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      isActive: user.is_active,
      createdAt: new Date(user.created_at).toISOString(),
      preferences: {
        id: pref.id,
        userId: pref.user_id,
        personalizationEnabled: pref.personalization_enabled,
        preferredMode: pref.preferred_mode,
        budgetTier: pref.budget_tier,
        favoriteCategories: Array.isArray(pref.favorite_categories)
          ? pref.favorite_categories
          : [],
        travelStyles: Array.isArray(pref.travel_styles)
          ? pref.travel_styles
          : [],
        companionDefault: pref.companion_default,
        updatedAt: new Date(pref.updated_at).toISOString(),
      },
    };
  }
}

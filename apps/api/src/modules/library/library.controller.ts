import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiResponse,
  CollectionDTO,
  FavoriteItemDTO,
} from '@exploro/shared-types';
import {
  addCollectionItemSchema,
  createCollectionSchema,
  updateCollectionSchema,
} from '@exploro/validation';
import { AuthService } from '../auth/auth.service';
import { LibraryService } from './library.service';

@ApiTags('Favorites & Collections')
@Controller()
export class LibraryController {
  constructor(
    @Inject(LibraryService) private readonly library: LibraryService,
    @Inject(AuthService) private readonly auth: AuthService
  ) {}

  @Get('favorites')
  @ApiOperation({ summary: 'Lista los lugares guardados del usuario' })
  public async listFavorites(
    @Headers('authorization') authHeader?: string
  ): Promise<ApiResponse<FavoriteItemDTO[]>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    return { success: true, data: await this.library.listFavorites(userId) };
  }

  @Post('favorites/:placeId')
  @ApiOperation({ summary: 'Guarda un lugar en favoritos (idempotente)' })
  public async addFavorite(
    @Headers('authorization') authHeader: string | undefined,
    @Param('placeId') placeId: string
  ): Promise<ApiResponse<{ placeId: string; favorited: true }>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    return {
      success: true,
      data: await this.library.addFavorite(userId, placeId),
    };
  }

  @Delete('favorites/:placeId')
  @ApiOperation({ summary: 'Quita un lugar de favoritos' })
  public async removeFavorite(
    @Headers('authorization') authHeader: string | undefined,
    @Param('placeId') placeId: string
  ): Promise<ApiResponse<{ placeId: string; favorited: false }>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    return {
      success: true,
      data: await this.library.removeFavorite(userId, placeId),
    };
  }

  @Get('collections')
  @ApiOperation({ summary: 'Lista las colecciones del usuario' })
  public async listCollections(
    @Headers('authorization') authHeader?: string
  ): Promise<ApiResponse<CollectionDTO[]>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    return { success: true, data: await this.library.listCollections(userId) };
  }

  @Post('collections')
  @ApiOperation({ summary: 'Crea una colección personalizada' })
  public async createCollection(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: unknown
  ): Promise<ApiResponse<CollectionDTO>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    const parsed = createCollectionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Datos de colección inválidos.'
      );
    }
    return {
      success: true,
      data: await this.library.createCollection(userId, parsed.data),
    };
  }

  @Get('collections/:id')
  @ApiOperation({ summary: 'Detalle de una colección con sus lugares' })
  public async getCollection(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string
  ): Promise<ApiResponse<CollectionDTO>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    return { success: true, data: await this.library.getCollection(userId, id) };
  }

  @Patch('collections/:id')
  @ApiOperation({ summary: 'Renombra o edita una colección' })
  public async updateCollection(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<ApiResponse<CollectionDTO>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    const parsed = updateCollectionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Datos de colección inválidos.'
      );
    }
    return {
      success: true,
      data: await this.library.updateCollection(userId, id, parsed.data),
    };
  }

  @Delete('collections/:id')
  @ApiOperation({ summary: 'Elimina una colección (no elimina los lugares)' })
  public async deleteCollection(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string
  ): Promise<ApiResponse<{ deleted: true }>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    return {
      success: true,
      data: await this.library.deleteCollection(userId, id),
    };
  }

  @Post('collections/:id/items')
  @ApiOperation({ summary: 'Agrega un lugar a la colección (idempotente)' })
  public async addItem(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown
  ): Promise<ApiResponse<CollectionDTO>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    const parsed = addCollectionItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Identificador de lugar inválido.');
    }
    return {
      success: true,
      data: await this.library.addCollectionItem(userId, id, parsed.data.placeId),
    };
  }

  @Delete('collections/:id/items/:placeId')
  @ApiOperation({ summary: 'Quita un lugar de la colección' })
  public async removeItem(
    @Headers('authorization') authHeader: string | undefined,
    @Param('id') id: string,
    @Param('placeId') placeId: string
  ): Promise<ApiResponse<CollectionDTO>> {
    const { userId } = this.auth.requirePrincipal(authHeader);
    return {
      success: true,
      data: await this.library.removeCollectionItem(userId, id, placeId),
    };
  }
}


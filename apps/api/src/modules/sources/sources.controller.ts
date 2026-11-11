import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { SourcesService } from './sources.service';
import {
  ApiResponse,
  SourceDTO,
  SourceSyncResult,
} from '@exploro/shared-types';
import { createSourceSchema } from '@exploro/validation';

@Controller('sources')
export class SourcesController {
  constructor(
    @Inject(SourcesService) private readonly sourcesService: SourcesService
  ) {}

  @Get()
  public async listSources(): Promise<ApiResponse<SourceDTO[]>> {
    const sources = await this.sourcesService.listSources();
    return {
      success: true,
      data: sources,
      meta: {
        total: sources.length,
      },
    };
  }

  @Post()
  public async createSource(
    @Body() body: unknown
  ): Promise<ApiResponse<SourceDTO>> {
    const parsed = createSourceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const source = await this.sourcesService.createSource(parsed.data);
    return {
      success: true,
      data: source,
    };
  }

  @Post(':id/sync')
  public async syncSource(
    @Param('id') id: string
  ): Promise<ApiResponse<SourceSyncResult>> {
    const result = await this.sourcesService.syncSource(id);
    return {
      success: true,
      data: result,
    };
  }
}

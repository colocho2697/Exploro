import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
} from '@nestjs/common';
import { NormalizationService } from './normalization.service';
import {
  ApiResponse,
  DuplicateCandidateDTO,
} from '@exploro/shared-types';
import { detectDuplicatesQuerySchema } from '@exploro/validation';

@Controller('normalization')
export class NormalizationController {
  constructor(
    @Inject(NormalizationService)
    private readonly normalizationService: NormalizationService
  ) {}

  @Get('duplicates')
  public async detectDuplicates(
    @Query() query: Record<string, unknown>
  ): Promise<ApiResponse<DuplicateCandidateDTO[]>> {
    const parsed = detectDuplicatesQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const duplicates = await this.normalizationService.detectDuplicates(
      parsed.data
    );
    return {
      success: true,
      data: duplicates,
      meta: {
        total: duplicates.length,
      },
    };
  }
}


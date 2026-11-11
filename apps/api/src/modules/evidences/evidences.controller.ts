import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { EvidencesService } from './evidences.service';
import {
  ApiResponse,
  EvidenceSummaryDTO,
} from '@exploro/shared-types';
import { createEvidenceSchema } from '@exploro/validation';

@Controller()
export class EvidencesController {
  constructor(
    @Inject(EvidencesService) private readonly evidencesService: EvidencesService
  ) {}

  @Get('places/:placeId/evidences')
  public async listPlaceEvidences(
    @Param('placeId') placeId: string
  ): Promise<ApiResponse<EvidenceSummaryDTO[]>> {
    const evidences = await this.evidencesService.listPlaceEvidences(placeId);
    return {
      success: true,
      data: evidences,
      meta: {
        total: evidences.length,
      },
    };
  }

  @Post('evidences')
  public async createEvidence(
    @Body() body: unknown
  ): Promise<ApiResponse<EvidenceSummaryDTO>> {
    const parsed = createEvidenceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', ')
      );
    }

    const evidence = await this.evidencesService.createEvidence(parsed.data);
    return {
      success: true,
      data: evidence,
    };
  }
}


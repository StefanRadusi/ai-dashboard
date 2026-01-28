import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { GenieService } from './genie.service';
import type { GenieAskRequest, GenieAskResponse, GenieResultResponse } from '@ai-dashboard/shared';

@Controller('genie')
export class GenieController {
  constructor(private readonly genieService: GenieService) {}

  @Post('ask')
  async ask(@Body() request: GenieAskRequest): Promise<GenieAskResponse> {
    return this.genieService.ask(request);
  }

  @Get('result/:conversationId/:messageId')
  async getResult(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ): Promise<GenieResultResponse> {
    return this.genieService.getResult(conversationId, messageId);
  }
}

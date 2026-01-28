import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { WidgetService } from './widget.service';
import type { VisualizationConfig, WidgetLayout } from '@ai-dashboard/shared';

interface CreateWidgetDto {
  conversationId: string;
  messageId: string;
  sql: string;
  visualization: VisualizationConfig;
  layout: WidgetLayout;
}

interface UpdateWidgetDto {
  visualization?: VisualizationConfig;
  layout?: WidgetLayout;
}

@Controller('widgets')
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Post()
  async create(@Body() dto: CreateWidgetDto) {
    return this.widgetService.create(dto);
  }

  @Get()
  async findAll() {
    return this.widgetService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const widget = await this.widgetService.findOne(id);
    if (!widget) {
      throw new NotFoundException(`Widget ${id} not found`);
    }
    return widget;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWidgetDto) {
    const widget = await this.widgetService.update(id, dto);
    if (!widget) {
      throw new NotFoundException(`Widget ${id} not found`);
    }
    return widget;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.widgetService.remove(id);
    if (!deleted) {
      throw new NotFoundException(`Widget ${id} not found`);
    }
    return { success: true };
  }
}

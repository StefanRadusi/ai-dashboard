import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { QueryService } from './query.service';
import { WidgetService } from '../widget/widget.service';

@Controller('query')
export class QueryController {
  private readonly logger = new Logger(QueryController.name);

  constructor(
    private readonly queryService: QueryService,
    private readonly widgetService: WidgetService,
  ) {}

  @Get(':queryId/data')
  async getQueryData(@Param('queryId') queryId: string) {
    this.logger.debug(`Getting data for widget: ${queryId}`);

    // For MVP, queryId is the widget ID
    // Look up the widget to get the SQL
    const widget = await this.widgetService.findOne(queryId);

    if (!widget) {
      throw new NotFoundException(`Query ${queryId} not found`);
    }

    // databricksQueryId contains the SQL in MVP
    const sql = widget.databricksQueryId;
    this.logger.debug(`SQL to execute: ${sql}`);

    return this.queryService.executeQuery(sql);
  }
}

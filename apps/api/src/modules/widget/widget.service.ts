import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { WidgetConfig, VisualizationConfig, WidgetLayout } from '@ai-dashboard/shared';
import { DRIZZLE, type Database, widgets } from '../../database';

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

@Injectable()
export class WidgetService {
  private readonly logger = new Logger(WidgetService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(dto: CreateWidgetDto): Promise<WidgetConfig> {
    const id = randomUUID();
    const now = new Date();

    const [widget] = await this.db
      .insert(widgets)
      .values({
        id,
        dashboardId: 'default',
        databricksQueryId: dto.sql,
        visualization: dto.visualization,
        layout: dto.layout,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    this.logger.log(`Created widget ${id} with SQL: ${dto.sql?.substring(0, 100)}...`);

    return this.toWidgetConfig(widget);
  }

  async findAll(): Promise<WidgetConfig[]> {
    const rows = await this.db.select().from(widgets);
    return rows.map(this.toWidgetConfig);
  }

  async findOne(id: string): Promise<WidgetConfig | null> {
    const [widget] = await this.db
      .select()
      .from(widgets)
      .where(eq(widgets.id, id));

    return widget ? this.toWidgetConfig(widget) : null;
  }

  async update(id: string, dto: UpdateWidgetDto): Promise<WidgetConfig | null> {
    const [widget] = await this.db
      .update(widgets)
      .set({
        ...(dto.visualization && { visualization: dto.visualization }),
        ...(dto.layout && { layout: dto.layout }),
        updatedAt: new Date(),
      })
      .where(eq(widgets.id, id))
      .returning();

    if (widget) {
      this.logger.log(`Updated widget ${id}`);
      return this.toWidgetConfig(widget);
    }

    return null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.db
      .delete(widgets)
      .where(eq(widgets.id, id))
      .returning({ id: widgets.id });

    if (result.length > 0) {
      this.logger.log(`Deleted widget ${id}`);
      return true;
    }

    return false;
  }

  private toWidgetConfig(row: typeof widgets.$inferSelect): WidgetConfig {
    return {
      id: row.id,
      dashboardId: row.dashboardId,
      databricksQueryId: row.databricksQueryId,
      visualization: row.visualization,
      layout: row.layout,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

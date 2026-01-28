import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { VisualizationConfig, WidgetLayout } from '@ai-dashboard/shared';

export const widgets = pgTable('widgets', {
  id: text('id').primaryKey(),
  dashboardId: text('dashboard_id').notNull(),
  databricksQueryId: text('databricks_query_id').notNull(),
  visualization: jsonb('visualization').notNull().$type<VisualizationConfig>(),
  layout: jsonb('layout').notNull().$type<WidgetLayout>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

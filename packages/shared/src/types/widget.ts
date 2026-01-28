export type ChartType = 'bar' | 'line' | 'pie' | 'area';

export interface BarChartConfig {
  type: 'bar';
  xAxisKey: string;
  yAxisKey: string;
  title?: string;
}

export interface LineChartConfig {
  type: 'line';
  xAxisKey: string;
  yAxisKey: string;
  title?: string;
}

export interface PieChartConfig {
  type: 'pie';
  nameKey: string;
  valueKey: string;
  title?: string;
}

export interface AreaChartConfig {
  type: 'area';
  xAxisKey: string;
  yAxisKey: string;
  title?: string;
}

export interface TableConfig {
  type: 'table';
  columns?: string[];
  title?: string;
}

export type VisualizationConfig =
  | BarChartConfig
  | LineChartConfig
  | PieChartConfig
  | AreaChartConfig
  | TableConfig;

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  id: string;
  dashboardId: string;
  databricksQueryId: string;
  visualization: VisualizationConfig;
  layout: WidgetLayout;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWidgetDto {
  dashboardId: string;
  databricksQueryId: string;
  visualization: VisualizationConfig;
  layout: WidgetLayout;
}

export interface UpdateWidgetDto {
  visualization?: VisualizationConfig;
  layout?: WidgetLayout;
}

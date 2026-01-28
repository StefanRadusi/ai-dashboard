import { WidgetConfig } from './widget';

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDashboardDto {
  name: string;
  description?: string;
}

export interface UpdateDashboardDto {
  name?: string;
  description?: string;
}

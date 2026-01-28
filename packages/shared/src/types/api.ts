import { VisualizationConfig } from './widget';

// Genie API types
export interface GenieAskRequest {
  question: string;
  conversationId?: string;
}

export interface GenieAskResponse {
  conversationId: string;
  messageId: string;
  status: 'pending' | 'completed' | 'failed';
  sql?: string;
  description?: string;
  error?: string;
}

export interface GenieResultResponse {
  conversationId: string;
  messageId: string;
  status: 'pending' | 'completed' | 'failed';
  sql?: string;
  description?: string;
  data?: Record<string, unknown>[];
  columns?: ColumnInfo[];
  suggestedVisualization?: VisualizationConfig;
  error?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
}

// Query API types
export interface QueryExecuteRequest {
  sql: string;
}

export interface QueryExecuteResponse {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
}

export interface SavedQueryDataResponse {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
}

// Widget API types
export interface LockWidgetRequest {
  conversationId: string;
  messageId: string;
  dashboardId: string;
  visualization: VisualizationConfig;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface LockWidgetResponse {
  widgetId: string;
  databricksQueryId: string;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

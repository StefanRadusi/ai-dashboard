import { makeAssistantToolUI } from '@assistant-ui/react';
import { useState } from 'react';
import { BarChart } from '../visualizations/BarChart';
import { DataTable } from '../visualizations/DataTable';
import { LockButton } from '../actions/LockButton';
import type { ColumnInfo, VisualizationConfig } from '@ai-dashboard/shared';

interface DisplayDataArgs {
  conversationId: string;
  messageId: string;
  data: Record<string, unknown>[];
  columns?: ColumnInfo[];
  sql?: string;
}

type ViewMode = 'table' | 'chart';

export const DisplayDataToolUI = makeAssistantToolUI<DisplayDataArgs, undefined>({
  toolName: 'displayData',
  render: ({ args }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const { conversationId, messageId, data, columns, sql } = args;

    if (!data || data.length === 0) {
      return <div className="tool-ui-empty">No data to display</div>;
    }

    // Determine if data is suitable for charting (has numeric column)
    const columnNames = columns?.map((c) => c.name) || Object.keys(data[0]);
    const numericColumns = columnNames.filter((col) => {
      const firstValue = data[0][col];
      return typeof firstValue === 'number' || !isNaN(Number(firstValue));
    });
    const canChart = numericColumns.length > 0 && columnNames.length >= 2;

    // For chart, use first non-numeric column as X and first numeric as Y
    const xAxisKey = columnNames.find((col) => !numericColumns.includes(col)) || columnNames[0];
    const yAxisKey = numericColumns[0] || columnNames[1];

    // Build visualization config based on current view
    const getVisualizationConfig = (): VisualizationConfig => {
      if (viewMode === 'chart') {
        return {
          type: 'bar',
          xAxisKey,
          yAxisKey,
        };
      }
      return {
        type: 'table',
        columns: columnNames,
      };
    };

    return (
      <div className="tool-ui">
        <div className="tool-ui-header-row">
          <div className="tool-ui-controls">
            <button
              className={`tool-ui-tab ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            {canChart && (
              <button
                className={`tool-ui-tab ${viewMode === 'chart' ? 'active' : ''}`}
                onClick={() => setViewMode('chart')}
              >
                Chart
              </button>
            )}
          </div>

          {sql && (
            <LockButton
              conversationId={conversationId}
              messageId={messageId}
              sql={sql}
              data={data}
              columns={columns}
              visualization={getVisualizationConfig()}
            />
          )}
        </div>

        {sql && (
          <details className="tool-ui-sql">
            <summary>SQL Query</summary>
            <pre>{sql}</pre>
          </details>
        )}

        <div className="tool-ui-content">
          {viewMode === 'table' ? (
            <DataTable data={data} columns={columnNames} />
          ) : (
            <BarChart data={data} xAxisKey={xAxisKey} yAxisKey={yAxisKey} />
          )}
        </div>
      </div>
    );
  },
});

import { useState, useEffect } from 'react';
import type { WidgetConfig } from '@ai-dashboard/shared';
import { BarChart } from '../visualizations/BarChart';
import { DataTable } from '../visualizations/DataTable';

interface DashboardWidgetProps {
  widget: WidgetConfig;
  onRemove?: () => void;
}

interface WidgetData {
  data: Record<string, unknown>[];
  columns: { name: string; type: string }[];
}

export function DashboardWidget({ widget, onRemove }: DashboardWidgetProps) {
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Use widget.id - the query controller looks up the widget to get the SQL
        const response = await fetch(`/api/query/${widget.id}/data`);
        if (!response.ok) {
          throw new Error('Failed to fetch widget data');
        }
        const data = await response.json();
        setWidgetData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [widget.id]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/query/${widget.id}/data`);
      if (!response.ok) {
        throw new Error('Failed to refresh data');
      }
      const data = await response.json();
      setWidgetData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  };

  const renderVisualization = () => {
    if (!widgetData) return null;

    const { visualization } = widget;
    const columnNames = widgetData.columns.map((c) => c.name);

    switch (visualization.type) {
      case 'bar':
        return (
          <BarChart
            data={widgetData.data}
            xAxisKey={visualization.xAxisKey}
            yAxisKey={visualization.yAxisKey}
            title={visualization.title}
          />
        );
      case 'table':
        return (
          <DataTable
            data={widgetData.data}
            columns={visualization.columns || columnNames}
            title={visualization.title}
          />
        );
      default:
        return (
          <DataTable
            data={widgetData.data}
            columns={columnNames}
          />
        );
    }
  };

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <div className="widget-drag-handle">
          <DragIcon />
        </div>
        <div className="widget-actions">
          <button
            className="widget-action-btn"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh data"
          >
            <RefreshIcon />
          </button>
          <button
            className="widget-action-btn widget-action-remove"
            onClick={onRemove}
            title="Remove widget"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <div className="widget-content">
        {isLoading && <div className="widget-loading">Loading...</div>}
        {error && <div className="widget-error">{error}</div>}
        {!isLoading && !error && renderVisualization()}
      </div>
    </div>
  );
}

function DragIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

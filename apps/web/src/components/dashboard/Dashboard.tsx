import { useState, useEffect, useCallback } from 'react';
import type { WidgetConfig } from '@ai-dashboard/shared';
import { DashboardGrid } from './DashboardGrid';

export function Dashboard() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWidgets = useCallback(async () => {
    try {
      const response = await fetch('/api/widgets');
      if (!response.ok) {
        throw new Error('Failed to fetch widgets');
      }
      const data = await response.json();
      setWidgets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load widgets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  // Listen for widget lock events
  useEffect(() => {
    const handleWidgetLocked = () => {
      fetchWidgets();
    };

    window.addEventListener('widget-locked', handleWidgetLocked);
    return () => window.removeEventListener('widget-locked', handleWidgetLocked);
  }, [fetchWidgets]);

  const handleLayoutChange = async (widgetId: string, layout: { x: number; y: number; w: number; h: number }) => {
    try {
      await fetch(`/api/widgets/${widgetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });

      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, layout } : w))
      );
    } catch (err) {
      console.error('Failed to update widget layout:', err);
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    if (!confirm('Remove this widget from the dashboard?')) return;

    try {
      await fetch(`/api/widgets/${widgetId}`, { method: 'DELETE' });
      setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    } catch (err) {
      console.error('Failed to remove widget:', err);
    }
  };

  if (isLoading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <span className="dashboard-widget-count">
          {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
        </span>
      </div>
      <DashboardGrid
        widgets={widgets}
        onLayoutChange={handleLayoutChange}
        onRemoveWidget={handleRemoveWidget}
      />
    </div>
  );
}

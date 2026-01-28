import { useState, useRef, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { WidgetConfig } from '@ai-dashboard/shared';
import { DashboardWidget } from './DashboardWidget';

interface DashboardGridProps {
  widgets: WidgetConfig[];
  onLayoutChange?: (widgetId: string, layout: { x: number; y: number; w: number; h: number }) => void;
  onRemoveWidget?: (widgetId: string) => void;
}

export function DashboardGrid({ widgets, onLayoutChange, onRemoveWidget }: DashboardGridProps) {
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, []);

  const layout: Layout[] = widgets.map((widget) => ({
    i: widget.id,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: 2,
    minH: 2,
  }));

  const handleLayoutChange = (newLayout: Layout[]) => {
    if (!onLayoutChange) return;

    newLayout.forEach((item) => {
      const widget = widgets.find((w) => w.id === item.i);
      if (widget) {
        const hasChanged =
          widget.layout.x !== item.x ||
          widget.layout.y !== item.y ||
          widget.layout.w !== item.w ||
          widget.layout.h !== item.h;

        if (hasChanged) {
          onLayoutChange(item.i, { x: item.x, y: item.y, w: item.w, h: item.h });
        }
      }
    });
  };

  if (widgets.length === 0) {
    return (
      <div className="dashboard-empty">
        <p>No widgets yet</p>
        <p className="dashboard-empty-hint">
          Ask a question in the chat and click "Lock to Dashboard" to add widgets
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="dashboard-grid-container">
      <GridLayout
        className="dashboard-grid"
        layout={layout}
        cols={12}
        rowHeight={80}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        margin={[16, 16]}
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="dashboard-grid-item">
            <DashboardWidget widget={widget} onRemove={() => onRemoveWidget?.(widget.id)} />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

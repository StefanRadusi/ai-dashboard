import { useState } from 'react';
import type { ColumnInfo, VisualizationConfig } from '@ai-dashboard/shared';

interface LockButtonProps {
  conversationId: string;
  messageId: string;
  sql: string;
  data: Record<string, unknown>[];
  columns?: ColumnInfo[];
  visualization: VisualizationConfig;
  onLocked?: (widgetId: string) => void;
}

export function LockButton({
  conversationId,
  messageId,
  sql,
  visualization,
  onLocked,
}: LockButtonProps) {
  const [isLocking, setIsLocking] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handleLock = async () => {
    if (isLocking || isLocked) return;

    setIsLocking(true);
    try {
      const response = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageId,
          sql,
          visualization,
          layout: { x: 0, y: 0, w: 6, h: 4 },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to lock widget');
      }

      const result = await response.json();
      setIsLocked(true);
      onLocked?.(result.id);

      // Notify dashboard to refresh
      window.dispatchEvent(new CustomEvent('widget-locked', { detail: { widgetId: result.id } }));
    } catch (error) {
      console.error('Failed to lock widget:', error);
      alert('Failed to lock widget to dashboard');
    } finally {
      setIsLocking(false);
    }
  };

  if (isLocked) {
    return (
      <button className="lock-button locked" disabled>
        <LockIcon /> Locked
      </button>
    );
  }

  return (
    <button
      className="lock-button"
      onClick={handleLock}
      disabled={isLocking}
    >
      {isLocking ? (
        <>Locking...</>
      ) : (
        <>
          <LockIcon /> Lock to Dashboard
        </>
      )}
    </button>
  );
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

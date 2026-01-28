import { ReactNode } from 'react';

interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
}

export function SplitView({ left, right }: SplitViewProps) {
  return (
    <div className="split-view">
      <div className="split-view-left">{left}</div>
      <div className="split-view-right">{right}</div>
    </div>
  );
}

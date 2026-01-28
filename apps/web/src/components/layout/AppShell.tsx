import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">AI Dashboard</h1>
        <nav className="app-nav">
          <span className="nav-status">Connected to Databricks</span>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

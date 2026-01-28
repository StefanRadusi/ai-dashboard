# AI Dashboard

Dashboard app where users ask questions in natural language (Databricks Genie), see visualizations in chat, and "lock" them to a persistent dashboard. Locked widgets fetch data directly from Databricks without AI.

## Tech Stack

- **Monorepo**: npm workspaces + Turborepo
- **Frontend**: React + TypeScript + Vite (`apps/web`)
- **Backend**: NestJS + TypeScript (`apps/api`)
- **Chat UI**: assistant-ui (custom Tool UIs via `makeAssistantToolUI`)
- **Visualizations**: Recharts (charts), TanStack Table (tables)
- **Dashboard Grid**: react-grid-layout
- **Database**: PostgreSQL (widget configs, dashboards)
- **AI**: Databricks Genie API (natural language → SQL)
- **Data**: Databricks SQL API (query execution)

## Project Structure

```
ai-dashboard/
├── apps/
│   ├── web/                    # React frontend
│   │   └── src/
│   │       ├── components/
│   │       │   ├── layout/         # AppShell, SplitView
│   │       │   ├── chat/           # ChatPanel
│   │       │   ├── tools/          # BarChartToolUI, TableToolUI
│   │       │   ├── visualizations/ # BarChart, DataTable (shared)
│   │       │   ├── dashboard/      # Dashboard, DashboardGrid, DashboardWidget
│   │       │   └── actions/        # LockButton, RefreshButton
│   │       ├── hooks/
│   │       ├── pages/
│   │       └── lib/
│   └── api/                    # NestJS backend
│       └── src/
│           ├── modules/
│           │   ├── genie/          # Genie API integration
│           │   ├── query/          # Query execution
│           │   └── widget/         # Widget CRUD
│           └── entities/
├── packages/
│   └── shared/                 # Shared types (@ai-dashboard/shared)
│       └── src/types/
│           ├── widget.ts           # WidgetConfig, VisualizationConfig
│           ├── dashboard.ts
│           └── api.ts
├── package.json                # Root workspace config
├── turbo.json                  # Turborepo config
└── tsconfig.base.json
```

## Key Architecture Decisions

1. **SQL stored in Databricks, not app** - Only `databricksQueryId` reference stored in PostgreSQL. Actual SQL lives as Databricks Saved Query.

2. **Same component, two contexts** - `<BarChart>` renders in chat (via ToolUI wrapper) AND dashboard (via DashboardWidget wrapper).

3. **Lock flow**: User clicks Lock → Backend creates Saved Query in Databricks → Stores widget config in PostgreSQL → Widget appears in dashboard.

4. **Locked widget data**: Dashboard loads configs from DB → Widget calls backend with `databricksQueryId` → Backend executes saved query → Fresh data returned (no AI).

## Shared Types

```typescript
// Import in both frontend and backend:
import { WidgetConfig } from '@ai-dashboard/shared';
```

Key type: `WidgetConfig` with `databricksQueryId`, `visualization` config, and `layout` position.

## API Endpoints

- `POST /genie/ask` - Send question to Genie
- `POST /query/execute` - Execute a query
- `GET /query/:id/data` - Get data from saved query
- CRUD `/widgets` - Widget management

## Current Status

Foundation setup in progress (Week 1 of MVP).

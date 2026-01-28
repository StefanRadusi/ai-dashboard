# AI Dashboard Project - Handoff Document

> Paste this at the start of each new chat to continue where we left off.

---

## Project Overview

**What we're building:** A dashboard app where users can ask questions in natural language (powered by Databricks Genie), see visualizations in a chat interface, and "lock" those visualizations to a persistent dashboard. Once locked, widgets fetch data directly from Databricks without AI involvement.

**Key concept:** Same visualization component renders in both chat (during exploration) AND dashboard (when locked). The only difference is the data source.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  App (React)                                                            │
│                                                                         │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │  Chat (assistant-ui)         │  │  Dashboard                      │ │
│  │                              │  │                                 │ │
│  │  User: Show sales by region  │  │  ┌─────────┐  ┌─────────┐      │ │
│  │                              │  │  │ Chart A │  │ Table B │      │ │
│  │  ┌────────────────────────┐  │  │  │ 🔒      │  │ 🔒      │      │ │
│  │  │ <BarChartToolUI />     │  │  │  └─────────┘  └─────────┘      │ │
│  │  │ ┌──────────────────┐   │  │  │                                 │ │
│  │  │ │ YOUR <BarChart>  │   │  │  │                                 │ │
│  │  │ │ component        │   │  │  │                                 │ │
│  │  │ │        [🔒 Lock] │───┼──┼──▶  (same component, locked)       │ │
│  │  │ └──────────────────┘   │  │  │                                 │ │
│  │  └────────────────────────┘  │  │                                 │ │
│  └──────────────────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Monorepo | npm workspaces + Turborepo | Shared code, fast builds |
| Frontend | React + TypeScript | Main app |
| Chat UI | assistant-ui | Out-of-the-box chat with custom Tool UIs |
| Visualizations | Recharts | Charts (BarChart, LineChart, etc.) |
| Data Table | TanStack Table | Tables with sorting/pagination |
| Dashboard Grid | react-grid-layout | Drag/drop widget positioning |
| Backend | NestJS + TypeScript | API, business logic |
| Database | PostgreSQL | Widget configs, dashboards, users |
| AI | Databricks Genie API | Natural language → SQL |
| Data | Databricks SQL API | Query execution, saved queries |

---

## Monorepo Structure

```
ai-dashboard/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/         # AppShell, SplitView
│   │   │   │   ├── chat/           # ChatPanel
│   │   │   │   ├── tools/          # BarChartToolUI, TableToolUI
│   │   │   │   ├── visualizations/ # BarChart, DataTable (shared)
│   │   │   │   ├── dashboard/      # Dashboard, DashboardGrid, DashboardWidget
│   │   │   │   └── actions/        # LockButton, RefreshButton
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── lib/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── genie/          # GenieModule, Controller, Service
│       │   │   ├── query/          # QueryModule, Controller, Service
│       │   │   └── widget/         # WidgetModule, Controller, Service
│       │   ├── entities/
│       │   │   └── widget.entity.ts
│       │   └── main.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                 # Shared types & utilities
│       ├── src/
│       │   ├── types/
│       │   │   ├── widget.ts       # WidgetConfig, VisualizationConfig
│       │   │   ├── dashboard.ts    # DashboardConfig
│       │   │   ├── api.ts          # API request/response types
│       │   │   └── index.ts        # Barrel export
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                # Root workspace config (npm workspaces)
├── turbo.json                  # Turborepo config
└── tsconfig.base.json          # Shared TS config
```

### Why Monorepo?

1. **Shared TypeScript types** - `WidgetConfig`, `VisualizationConfig`, API types used in BOTH React and NestJS
2. **Single developer/small team** - No ownership boundaries needed
3. **Tight coupling** - Frontend and backend evolve together
4. **One PR = full feature** - API + frontend changes in one commit

### Import Example

```typescript
// In apps/web/src/components/DashboardWidget.tsx
import { WidgetConfig } from '@ai-dashboard/shared';

// In apps/api/src/services/widget.service.ts
import { WidgetConfig } from '@ai-dashboard/shared';
```

Same types, always in sync.

---

## Key Architecture Decisions

1. **SQL is NOT stored in your app** - Only a reference (`databricksQueryId`) is stored. The actual SQL lives in Databricks as a Saved Query. This is for security/governance.

2. **assistant-ui for chat** - Provides streaming, auto-scroll, markdown, etc. You register your visualizations as "Tool UIs" using `makeAssistantToolUI`.

3. **Same component, two contexts** - `<BarChart>` renders in chat (via ToolUI wrapper) AND in dashboard (via DashboardWidget wrapper).

4. **Lock flow:**
   - User happy with visualization in chat
   - Clicks "Lock" button
   - Backend creates Saved Query in Databricks
   - Backend stores widget config (with queryId reference) in PostgreSQL
   - Widget appears in dashboard

5. **Locked widget data flow:**
   - Dashboard loads widget configs from your DB
   - Each widget calls backend with its `databricksQueryId`
   - Backend executes the saved query in Databricks
   - Fresh data returned (no AI involved)

---

## Data Structures

### Widget Config (stored in PostgreSQL)

```typescript
interface WidgetConfig {
  id: string;
  dashboardId: string;
  databricksQueryId: string;      // Reference to Databricks saved query
  warehouseId: string;
  
  visualization: {
    type: 'bar' | 'line' | 'pie' | 'area' | 'table' | 'metric';
    xAxis?: string;
    yAxis?: string | string[];
    groupBy?: string;
    columns?: { field: string; header: string }[];
    title?: string;
    colors?: string[];
  };
  
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Component List (MVP)

### Frontend (12 components)

**Layout:**
- `<AppShell>` - Main wrapper
- `<SplitView>` - Chat + Dashboard side by side

**Chat:**
- `<ChatPanel>` - Wrapper around assistant-ui Thread
- `<Thread>` - From assistant-ui

**Tool UIs (render in chat):**
- `<BarChartToolUI>` - Wraps BarChart for chat
- `<TableToolUI>` - Wraps DataTable for chat

**Visualizations (shared):**
- `<BarChart>` - Recharts bar chart
- `<DataTable>` - TanStack table

**Dashboard:**
- `<Dashboard>` - Main container
- `<DashboardGrid>` - Grid layout
- `<DashboardWidget>` - Widget wrapper

**Actions:**
- `<LockButton>` - Save to dashboard
- `<RefreshButton>` - Refresh data

### Backend (10 items)

**Modules:** GenieModule, QueryModule, WidgetModule

**Controllers:**
- `GenieController` - POST /genie/ask
- `QueryController` - POST /query/execute, GET /query/:id/data
- `WidgetController` - CRUD /widgets

**Services:**
- `GenieService` - Call Databricks Genie API
- `DatabricksQueryService` - Create/execute saved queries
- `WidgetService` - Widget business logic

**Entities:**
- `Widget` - PostgreSQL entity

---

## Phase Breakdown

### MVP (Phase 1) - 4 Weeks

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Foundation | React + NestJS setup, assistant-ui working, Genie API connected |
| 2 | Visualizations in Chat | BarChart + Table render in chat via Tool UIs |
| 3 | Lock to Dashboard | Lock button saves to Databricks + DB, widget appears in dashboard |
| 4 | Dashboard Data Flow | Widgets fetch data without AI, refresh button, polish |

### Phase 2 - More Viz + Multi-Dashboard
- Add LineChart, PieChart, MetricCard
- Multiple dashboards per user
- Drag/drop positioning
- Basic auth

### Phase 3 - Polish
- Unlock/re-edit flow
- Delete widgets
- Widget settings
- Dashboard settings

### Phase 4 - Enterprise (Future)
- Sharing, permissions, scheduled refresh, export, embedding

---

## Current Status

**Completed (MVP Phase 1):**
- [x] Monorepo setup (npm workspaces + Turborepo)
- [x] Genie API integration (natural language → SQL)
- [x] Visualizations in chat (BarChart, DataTable with assistant-ui ToolUI)
- [x] Lock to Dashboard flow
- [x] Dashboard with draggable/resizable widgets (react-grid-layout)
- [x] Direct query execution for locked widgets (bypasses Genie AI)
- [x] PostgreSQL database with Drizzle ORM

**In Progress:**
- [ ] End-to-end testing of full flow
- [ ] Add Databricks connection env vars

---

## Database Setup

### PostgreSQL (Docker)

```bash
# Start the database
docker-compose up -d

# Verify it's running
docker exec ai-dashboard-db pg_isready -U postgres
```

Container: `ai-dashboard-db` on port 5432
Database: `ai_dashboard`
Credentials: `postgres:postgres`

### Drizzle ORM

Schema location: `apps/api/src/database/schema.ts`

```bash
# Push schema changes to DB (dev)
cd apps/api
npm run db:push

# Generate migrations (prod)
npm run db:generate
npm run db:migrate

# Open Drizzle Studio (DB GUI)
npm run db:studio
```

**Note:** The `db:*` scripts use `NODE_PATH=./node_modules` to handle monorepo module resolution.

### Environment Variables

`apps/api/.env`:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_dashboard

# Databricks (add your values)
DATABRICKS_HOST=
DATABRICKS_TOKEN=
DATABRICKS_WAREHOUSE_ID=
DATABRICKS_GENIE_SPACE_ID=
```

---

## Running the App

```bash
# From project root
npm run dev          # Starts both web and api via Turborepo

# Or individually
cd apps/api && npm run dev
cd apps/web && npm run dev
```

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/database/schema.ts` | Drizzle schema (widgets table) |
| `apps/api/src/database/database.provider.ts` | NestJS Drizzle provider |
| `apps/api/src/modules/widget/widget.service.ts` | Widget CRUD with Drizzle |
| `packages/shared/src/types/widget.ts` | WidgetConfig type (source of truth) |
| `docker-compose.yml` | PostgreSQL container |

---

## Next Steps

1. Add Databricks connection env vars to `.env`
2. Test full flow: Ask question → See visualization → Lock to dashboard → Refresh data
3. Add more visualization types (LineChart, PieChart)
4. Add error handling and loading states

---

## How to Continue

Start a new chat and paste this document, then say:

> "Let's test the full flow from chat to dashboard"

or

> "Add LineChart visualization support"

---

# AI Dashboard

A dashboard application that lets users ask questions in natural language, visualize the results in a chat interface, and pin visualizations to a persistent dashboard.

## Features

- **Natural Language Queries** - Ask questions using Databricks Genie, which converts them to SQL
- **Interactive Visualizations** - View charts and tables directly in the chat
- **Persistent Dashboard** - "Lock" visualizations from chat to a draggable dashboard grid
- **Live Data Refresh** - Locked widgets fetch fresh data directly from Databricks

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | npm workspaces + Turborepo |
| Frontend | React, TypeScript, Vite |
| Backend | NestJS, TypeScript |
| Chat UI | assistant-ui |
| Visualizations | Recharts, TanStack Table |
| Dashboard | react-grid-layout |
| Database | PostgreSQL |
| AI/Data | Databricks Genie & SQL APIs |

## Prerequisites

- Node.js >= 18.0.0
- npm >= 10.0.0
- PostgreSQL
- Databricks account with Genie API access

## Getting Started

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all packages and apps |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run linting across all packages |
| `npm run clean` | Clean build artifacts |

## Project Structure

```
ai-dashboard/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared types (@ai-dashboard/shared)
├── package.json
└── turbo.json
```

## License

Private

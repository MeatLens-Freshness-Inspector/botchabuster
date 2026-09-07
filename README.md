# MeatLens - Freshness Inspector

AI-powered meat freshness inspection for wet markets using computer vision and machine learning.

## Project Structure

This is a monorepo containing two main applications:

```
.
├── frontend/          # React + TypeScript UI
├── backend/           # Express.js + Node.js API
├── package.json       # Monorepo workspace config
└── MIGRATION_SUMMARY.md
```

## Quick Start

### Prerequisites
- Node.js 22.x (the supported runtime range is >=22 <25)
- npm v9+ (for workspace support)

### Installation

```bash
# Install all dependencies for both frontend and backend
npm install
```

### Development

**Start both services:**
```bash
npm run dev
```

**Or start individually:**
```bash
# Terminal 1 - Frontend (http://localhost:8080)
npm run dev:frontend

# Terminal 2 - Backend (http://localhost:3001)
npm run dev:backend
```

### Building

```bash
# Build both
npm run build

# Or individual builds
npm run build:frontend
npm run build:backend
```

## Environment Setup

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3001/api
```

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
TRANSPORT_KEY_ID=v1
TRANSPORT_RSA_PRIVATE_KEY=your_backend_only_rsa_private_key_with_escaped_newlines
PORT=3001
ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

`TRANSPORT_RSA_PRIVATE_KEY` belongs only in the backend environment. The
frontend needs no transport secret; application bodies are encrypted by the
shared API client using a fresh per-request AES-256-GCM key.

## Frontend

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Components:** shadcn-ui + Tailwind CSS
- **State:** React Context + React Query (planned)
- **API Client:** Custom HTTP clients in `src/integrations/api/`

Run from root:
```bash
npm run dev:frontend
npm run build:frontend
```

## Backend

- **Runtime:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Image Processing:** OpenCV4Nodejs
- **API:** RESTful with JSON

Run from root:
```bash
npm run dev:backend
npm run build:backend
```

### Backend API Routes

- `POST /api/analysis` - Analyze meat freshness from image
- `GET /api/profiles` - List user profiles
- `GET /api/profiles/:id` - Get user profile
- `GET /api/inspections` - List inspections
- `POST /api/inspections` - Create inspection record
- `GET /api/access-codes` - List access codes
- `GET /api/stats/landing-page` - Get statistics

## Scripts

```bash
# Root workspace scripts
npm run dev              # Dev both services
npm run dev:frontend    # Dev frontend only
npm run dev:backend     # Dev backend only
npm run build           # Build both
npm run build:frontend  # Build frontend only
npm run build:backend   # Build backend only
npm run lint            # Lint all workspaces
npm run test            # Test all workspaces
npm run test:scripts    # Test repository automation scripts
npm run test:unit       # Run frontend and backend unit tests
npm run test:integration # Run backend integration tests
npm run test:e2e        # Run frontend Playwright tests
npm run test:ci         # Local equivalent of the main CI test pipeline
npm run test:watch      # Watch tests
```

## CI

GitHub Actions uses [`.github/workflows/ci.yml`](.github/workflows/ci.yml) as the canonical automated testing pipeline.

- Pull requests and pushes to `master` run automated testing in GitHub Actions.
- The pipeline is path-aware, so frontend-only and backend-only changes run only the relevant test lanes.
- Docs-only changes record a lightweight skip instead of consuming the full test matrix.
- [`.github/workflows/preview.yml`](.github/workflows/preview.yml) reports preview relevance for pull requests and can optionally trigger Netlify or Render preview hooks when repository secrets are configured.
- [`.github/workflows/deploy-refresh.yml`](.github/workflows/deploy-refresh.yml) provides a manual preview refresh without needing a no-op commit.

### Playwright troubleshooting

Run the same bounded commands locally from a Node 22 checkout when diagnosing a
CI Playwright failure:

```bash
# Critical journeys (the pull-request gate)
CI=true timeout 110s npm run test:e2e:critical

# Full push/scheduled coverage, one deterministic shard at a time
CI=true timeout 110s npm run test:e2e:full -- --shard=1/4
CI=true timeout 110s npm run test:e2e:full -- --shard=2/4
CI=true timeout 110s npm run test:e2e:full -- --shard=3/4
CI=true timeout 110s npm run test:e2e:full -- --shard=4/4
```

Each Playwright lane is capped at 110 seconds in CI. A failing lane keeps its
`frontend/playwright-report` and `frontend/test-results` diagnostics as a GitHub
Actions artifact; the job summary also names the exact suite, shard, and command.

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn-ui
- Recharts (dashboards)
- Sonner (toast notifications)
- date-fns (date utilities)

### Backend
- Express.js
- TypeScript
- OpenCV4Nodejs
- Sharp (image processing)
- Supabase
- Multer (file uploads)
- CORS

## Project Documentation

See `MIGRATION_SUMMARY.md` for migration notes and architecture decisions.

For deployment steps, see `documentation/DEPLOYMENT.md`.

## License

This repository is available for public viewing as a portfolio project under the [Portfolio Viewing License](LICENSE.md). Public viewing does not grant rights to copy, clone, modify, execute, distribute, or otherwise reuse the code, assets, models, datasets, or documentation.

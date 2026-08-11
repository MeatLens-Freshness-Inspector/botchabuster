# MeatLens documentation

This directory documents the current MeatLens monorepo. The backend is a modular monolith; the frontend is a Vite/React application; Supabase provides PostgreSQL, authentication, and storage.

## Start here

- [Getting started](GETTING_STARTED.md) — local setup, environment variables, migrations, and verification.
- [Architecture](ARCHITECTURE.md) — module boundaries, MVC request flow, middleware, and persistence rules.
- [API reference](API_REFERENCE.md) — registered route namespaces, authentication requirements, and representative operations.
- [Security](SECURITY.md) — session cookies, bearer fallback, CSRF, CORS, rate limits, and secrets.
- [Deployment](DEPLOYMENT.md) — Netlify frontend and Render backend deployment.
- [Project overview](PROJECT_OVERVIEW.md) — product scope, stack, and repository map.

## Application guides

- [Backend documentation](application/backend_documentation.md)
- [Frontend documentation](application/frontend_documentation.md)
- [Frontend folder structure](frontend/folder-structure.md)

## Scope and source of truth

Documentation describes the code currently under `backend/src/modules`, `backend/src/bootstrap`, `backend/src/middleware`, and `frontend/src`. Route documentation must follow the module presentation routers and `backend/src/bootstrap/routes.ts`; the removed top-level `backend/src/routes`, `controllers`, `services`, and `models` directories are not valid import locations.

The project deliberately uses only the services already present in the repository and Supabase. Redis, Grafana, BullMQ, Prometheus, and other additional infrastructure are not required.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server (webpack)
npm run dev-turbopack    # Start dev server (turbopack - experimental)

# Production
npm run build            # Build (uses 4096MB memory limit)
npm start                # Start production server

# Linting
npm run lint             # Run ESLint
```

## Architecture Overview

This is a Next.js 16 (App Router) dealership management SaaS built with React 19, TypeScript, Tailwind CSS v4, and Supabase.

### Route Groups & Access Control

Routes are organized into route groups with role-based access enforced in `src/middleware.ts`:

| Group | Path | Roles |
|---|---|---|
| `(home)` | `/home`, `/buyCar`, `/sellCar`, `/creditCar`, `/simulador`, `/aboutUs` | Public |
| `(auth)` | `/login`, `/register`, `/forgetpassword` | Unauthenticated |
| `(seller)` | `/showroom`, `/leads`, `/contracts`, `/inventory`, `/agenda`, `/tareas`, `/finance` | Seller roles |
| `(accounting)` | `/dashboard`, `/wallet`, `/treasury`, `/insurance`, `/employee`, `/cobros`, `/notasdeventas` | Accounting roles |
| `(admin)` | Admin features | Admin only |
| `/taller` | Workshop module | `taller` role |
| `/legal` | Legal module | `abogado`/`abogada` roles |
| `/marketing` | Marketing (incl. Videos) | `marketing`/`contable` roles |
| `/rastreadores` | GPS tracking | Authorized roles |
| `/seguros` | Insurance policies | Authorized roles |

Unauthenticated users are redirected to `/login?redirect=[pathname]`. Role `cliente` always goes to `/home`.

### Supabase Integration

Two client instances — always use the correct one:
- `src/lib/supabase/client.ts` — browser/client components
- `src/lib/supabase/server.ts` — server components, API routes, middleware

Auth state is managed globally via `src/contexts/AuthContext.tsx`, which exposes `{ supabase, session, user, profile, role, isLoading }`. Use the `useAuth()` hook to access these anywhere in client components.

### State Management

React Context API only — no Redux or Zustand. Global auth state is in `AuthContext`. Feature-level state lives in custom hooks under `src/hooks/` (organized by domain: `accounting/`, `credit/`, `taller/`, `userProfile/`, `Homeksi/`).

### Service Layer

API calls to Supabase are abstracted in `src/services/`:
- `leads.service.ts` — lead management
- `inventario.service.ts` — vehicle inventory
- `contratos.service.ts` — contracts

The accounting/cartera module also calls a separate backend at `NEXT_PUBLIC_API_URL` (a local Node.js service, not Supabase).

### External Integrations

- **Videos** — AssemblyAI, Creatomate, Gemini; rutas en `src/app/api/videos/` y UI en `src/app/marketing/videos/`
- **Google Gemini AI** (`GEMINI_API_KEY`) — content analysis in marketing/scraper modules and Videos
- **Custom accounting backend** (`NEXT_PUBLIC_API_URL`) — separate service for financial operations
- **Automation backend** (`AUTOMATION_API_URL` / `NEXT_PUBLIC_AUTOMATION_API_URL`, default `https://auto.ksinuevos.com`) — guiones vía proxy `/api/scripts/*` → `auto.ksinuevos.com` (solo `scripts.service.ts`)
- **Métricas Meta (alertas / pausa)** — proxy `/api/marketing/metrics/*` → `{METRICS_INTERNAL_API_URL o AUTOMATION_API_URL}/internal/metrics/...` con header `x-internal-secret` = `INTERNAL_API_SECRET` o `METRICS_INTERNAL_SECRET` (mismo valor en `.env`)

### Key Conventions

- Path alias `@/*` maps to `src/*`
- UI primitives follow a shadcn-like pattern in `src/components/ui/`
- PDF export uses `jspdf` + `jspdf-autotable`; Excel export uses `xlsx`
- Toast notifications use `sonner`
- Drag & drop (e.g., kanban boards) uses `@dnd-kit`
- Supabase TypeScript types are auto-generated in `src/types/supabase.ts` (do not edit manually)

### Database Schema

See `supabase-schema.md` at the repo root for the full database schema. Additional domain-specific documentation is in `/docs/`.

# Project Allotment Portal

A full-stack web application for college final-year project allocation. Four student batches (A–D) select from a pool of ~980 proposed project titles, with admin-controlled selection windows and atomic project claiming to prevent race conditions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Routing | React Router v6 |
| Backend | Supabase (Postgres, Auth, RLS, Realtime) |
| Data fetching | TanStack React Query |
| Forms | react-hook-form + zod |
| Hosting | Vercel (frontend) + Supabase free tier |

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- Excel source files (see Data Import below)

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For the import script, also add (never expose in frontend):

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run database migration

Open the Supabase SQL Editor and run the contents of:

```
supabase/migrations/0001_init.sql
```

This creates all tables, RLS policies, the `claim_project` RPC, `admin_force_unlock` RPC, and enables Realtime on `projects`, `teams`, and `batches`.

### 4. Import data

Place your Excel files in the `data/` directory:

```
data/
  IV_A_-_Project_Batches.xlsx
  IV_B_-_Project_Batches.xlsx
  IV_C_-_Project_Batches.xlsx
  IV_D_-_Project_Batches.xlsx
  Fixed_Supervisors.xlsx
  List_of_Proposed_Project_Titles.xlsx
```

Then run:

```bash
npm run import-data
```

The script creates teams, members, projects, and pre-provisioned auth accounts.

**Default credentials** (change after first login in production):

| Role | Login | Password |
|------|-------|----------|
| Admin | `admin@portal.local` | `Portal@2026` |
| Student | Registration number (e.g. `27A01`) | `Portal@2026` |
| Teacher | Email derived from supervisor name | `Portal@2026` |

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173`

## Deployment (Vercel)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. **Before or right after first deploy**, set environment variables under **Project → Settings → Environment Variables**:
   - `VITE_SUPABASE_URL` — e.g. `https://xxxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` — anon/public key from Supabase → Settings → API

   **Important:** Names must start with `VITE_` (not `SUPABASE_URL` alone). Vite bakes these in at **build time**, so after adding or changing them click **Deployments → Redeploy**.

4. In **Supabase → Authentication → URL configuration**, set Site URL and Redirect URLs to your Vercel URL (e.g. `https://your-app.vercel.app/**`).
5. Deploy / redeploy

```bash
npm run build   # verify build passes locally
```

## Application Roles

### Admin (`/admin`)
- Toggle selection open/closed per batch
- Live team allotment table (Realtime)
- Filter by batch, supervisor, domain
- Force unlock teams
- Export allotments to Excel

### Student (`/student`)
- View team info and selection status
- Browse/search/paginate projects when batch is open
- Atomic project claim via `claim_project` RPC
- Live updates when projects are taken

### Teacher (`/teacher`)
- Read-only view of supervised teams
- Expandable project abstracts
- Optional comments per team

## Architecture Notes

- **Race condition safety**: Project claiming uses the `claim_project` Postgres function (security definer) — never client-side check-then-write
- **RLS**: All tables have Row Level Security; students see only their team, teachers see supervised teams, admin sees all
- **Realtime**: `projects`, `teams`, and `batches` are in the `supabase_realtime` publication

## Project Structure

```
src/
  components/     # Shared UI components
  hooks/          # useAuth and other hooks
  lib/            # Supabase client
  pages/          # Login, Admin, Student, Teacher dashboards
  types/          # TypeScript types
scripts/
  import-data.ts  # One-time Excel import
supabase/
  migrations/     # SQL schema + RLS + RPCs
data/             # Excel source files (not committed)
```

## License

MIT

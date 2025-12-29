# Architecture Overview

## System
- Frontend: React + Tailwind
- Backend API: Express (TypeScript)
- Platform services: Supabase

## Principles
- Multi-tenant by default
- Tenant data isolation
- Frontend = no elevated privileges
- Express = secure boundary

## Responsibilities
Frontend:
- UI
- Auth
- Public booking flows

Backend:
- Webhooks
- Admin impersonation
- Membership logic

# Vilo

Vilo is a lightweight SaaS that helps accommodation businesses manage
bookings, payments, calendars, reviews, websites, and analytics —
without high commission fees.

## Tech Stack
- React + Tailwind
- Node.js + Express + TypeScript
- Supabase

## Setup

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Get your credentials from Settings → API
3. Provide credentials to AI assistant - `.env` files will be created automatically

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3001/api
```

**Backend** (`backend/.env`):
```env
PORT=3001
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Run the database schema:
   - Go to Supabase Dashboard → SQL Editor
   - Copy and run `backend/src/db/schema.sql`

5. Verify setup:
```bash
npm run check:supabase
```

📖 **Detailed setup guide**: See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 3. Development
```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

### 4. Test the connection

Visit http://localhost:3001/api/health/db to verify database connection.

## Project Structure

```
vilo/
├── frontend/          # React + Tailwind frontend
├── backend/           # Express + TypeScript backend
└── docs/              # Project documentation
```

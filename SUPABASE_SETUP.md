# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `vilo` (or your preferred name)
   - Database password: (save this securely)
   - Region: Choose closest to you
5. Wait for project to be created (~2 minutes)

## 2. Get Your Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (for frontend)
   - **service_role key** (for backend - keep this secret!)

## 3. Set Up Environment Variables

**Note:** The AI assistant will automatically create `.env` files when you provide Supabase credentials. You should never need to manually create or edit these files.

### Frontend (.env file in `frontend/` directory)

The `frontend/.env` file contains:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_URL=http://localhost:3001/api
```

### Backend (.env file in `backend/` directory)

The `backend/.env` file contains:

```env
PORT=3001
SUPABASE_URL=your_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

⚠️ **IMPORTANT**: Never commit `.env` files to git! They're already in `.gitignore`.

## 4. Create Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Copy the contents of `backend/src/db/schema.sql`
3. Paste and run it in the SQL Editor
4. This will create:
   - `bookings` table
   - Indexes for performance
   - Row Level Security (RLS) policies
   - Auto-update triggers

## 5. Verify Setup

### Test Backend Connection

```bash
cd backend
npm run dev
```

Check console for any Supabase connection errors.

### Test Frontend Connection

```bash
cd frontend
npm run dev
```

Open browser console and check for any Supabase errors.

## 6. Test the API

1. Start both frontend and backend servers
2. Navigate to `/bookings` page
3. Try creating a new booking
4. Check Supabase dashboard → **Table Editor** → `bookings` to see your data

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` files exist in both `frontend/` and `backend/` directories
- Restart your dev servers after creating `.env` files
- Check that variable names match exactly (case-sensitive)

### "Failed to fetch bookings"
- Check that backend server is running on port 3001
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not the anon key!)
- Check Supabase dashboard for any error logs

### RLS Policy Errors
- Make sure you've run the schema.sql file
- Check that tenant_id is being sent in request headers
- For testing, you can temporarily disable RLS (not recommended for production)

## Security Notes

- ✅ Frontend uses `anon` key (limited permissions)
- ✅ Backend uses `service_role` key (full access, server-side only)
- ✅ RLS policies enforce multi-tenant isolation
- ❌ Never expose `service_role` key to frontend
- ❌ Never commit `.env` files


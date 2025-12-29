# ✅ Supabase Connection Setup Complete

## What's Been Configured

### Frontend
- ✅ Supabase client created at `frontend/src/lib/supabase.ts`
- ✅ Uses `anon` key (safe for frontend)
- ✅ Environment variables configured

### Backend
- ✅ Supabase client created at `backend/src/lib/supabase.ts`
- ✅ Uses `service_role` key (server-side only)
- ✅ API routes updated to use Supabase
- ✅ Error handling for missing configuration
- ✅ Health check endpoint at `/api/health/db`

### Database Schema
- ✅ Schema file ready at `backend/src/db/schema.sql`
- ✅ Includes bookings table, indexes, RLS policies

## Next Steps

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for setup to complete

2. **Get Credentials**
   - Settings → API
   - Copy Project URL and keys

3. **Environment Files**

   **Note:** The AI assistant automatically creates `.env` files when you provide credentials. No manual editing required.

   **`frontend/.env`:**
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   VITE_API_URL=http://localhost:3001/api
   ```

   **`backend/.env`:**
   ```env
   PORT=3001
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

4. **Run Database Schema**
   - Supabase Dashboard → SQL Editor
   - Copy `backend/src/db/schema.sql`
   - Paste and run

5. **Verify Connection**
   ```bash
   # Start backend
   npm run dev:backend
   
   # In another terminal, test connection
   curl http://localhost:3001/api/health/db
   ```

6. **Test the App**
   - Start both servers: `npm run dev`
   - Go to http://localhost:3000/bookings
   - Create a booking
   - Check Supabase dashboard to see the data

## Files Created/Modified

- `frontend/src/lib/supabase.ts` - Frontend Supabase client
- `backend/src/lib/supabase.ts` - Backend Supabase client  
- `backend/src/routes/bookings.ts` - Updated to use Supabase
- `backend/src/index.ts` - Added health check endpoint
- `SUPABASE_SETUP.md` - Detailed setup guide
- `scripts/check-supabase.js` - Connection verification script

## Security Notes

✅ **Correct Setup:**
- Frontend uses `anon` key (limited permissions)
- Backend uses `service_role` key (full access, server-side only)
- RLS policies enforce tenant isolation

❌ **Never:**
- Expose `service_role` key to frontend
- Commit `.env` files to git
- Disable RLS in production

## Troubleshooting

**"Database not configured" error:**
- Check `.env` files exist in both `frontend/` and `backend/`
- Verify variable names are correct (case-sensitive)
- Restart dev servers after creating `.env` files

**"Table does not exist" error:**
- Run the schema.sql file in Supabase SQL Editor
- Check for any SQL errors in Supabase dashboard

**Connection timeout:**
- Verify Supabase project is active
- Check network/firewall settings
- Verify URL is correct (should start with `https://`)


# Verify Supabase Setup

## ✅ Schema Status
- ✅ Database schema successfully created in Supabase

## Next: Verify Connection

### 1. Check .env Files Exist

Make sure you created both files:

**`frontend/.env`** should contain:
```
VITE_SUPABASE_URL=https://hscvxenodqrhogxfamph.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Gr8iITlO1hU6FIvbPGpeRg_yw8rjuIr
VITE_API_URL=http://localhost:3001/api
```

**`backend/.env`** should contain:
```
PORT=3001
SUPABASE_URL=https://hscvxenodqrhogxfamph.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_EY8PA7dWgGAEf5up35mD6A_a2HifMjy
```

### 2. Verify Key Format

The keys you provided have an unusual format. Standard Supabase keys are long JWT tokens.

**To get the correct keys:**
1. Go to Supabase Dashboard
2. Settings → API
3. Look for:
   - **Project URL**: `https://hscvxenodqrhogxfamph.supabase.co` ✅ (you have this)
   - **anon public key**: Should be a long JWT token (starts with `eyJ...`)
   - **service_role key**: Should be a long JWT token (starts with `eyJ...`)

If your keys don't start with `eyJ`, they might be from a different service or API version.

### 3. Test Backend Connection

Start the backend:
```bash
cd backend
npm run dev
```

You should see:
```
🚀 Vilo backend running on http://localhost:3001
```

If you see warnings about Supabase variables, check your `.env` file.

### 4. Test Database Connection

Once backend is running, test:
```bash
# In browser or Postman
GET http://localhost:3001/api/health/db
```

Expected response:
```json
{
  "status": "ok",
  "message": "Database connection successful",
  "supabase_configured": true
}
```

### 5. Verify Table Exists

In Supabase Dashboard:
1. Go to **Table Editor**
2. You should see the `bookings` table
3. It should have columns: id, tenant_id, guest_name, etc.

### 6. Test Creating a Booking

1. Start both servers: `npm run dev`
2. Go to http://localhost:3000/bookings
3. Click "New Booking"
4. Fill in the form and submit
5. Check Supabase Table Editor to see if the booking appears

## Troubleshooting

**If keys don't work:**
- The `sb_publishable_` and `sb_secret_` format suggests these might be from Supabase's newer API
- Try using the JWT tokens from Settings → API instead
- Make sure you're using the **anon** key for frontend and **service_role** key for backend

**If connection fails:**
- Verify `.env` files are in the correct directories
- Restart the backend server after creating/editing `.env` files
- Check for typos in the URL (should end with `.supabase.co`)

**If RLS errors occur:**
- The schema includes RLS policies that require tenant_id
- For testing, you might need to temporarily adjust the policies
- Check the `x-tenant-id` header is being sent in API requests




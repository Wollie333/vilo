#!/usr/bin/env node

/**
 * Quick script to verify Supabase configuration
 * Run: npm run check:supabase
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load backend .env
const envPath = join(__dirname, '../backend/.env')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n🔍 Checking Supabase Configuration...\n')

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set in backend/.env')
  process.exit(1)
}

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in backend/.env')
  process.exit(1)
}

console.log('✅ Environment variables found')
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`)

// Test connection
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log('\n🔌 Testing database connection...')

supabase
  .from('bookings')
  .select('count')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ Table "bookings" does not exist')
        console.log('\n💡 Run the schema.sql file in Supabase SQL Editor:')
        console.log('   backend/src/db/schema.sql\n')
      } else {
        console.error('❌ Connection failed:', error.message)
      }
      process.exit(1)
    } else {
      console.log('✅ Database connection successful!')
      console.log('✅ Bookings table exists\n')
      console.log('🎉 Supabase is ready to use!\n')
      process.exit(0)
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  })


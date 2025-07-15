'use strict';

/**
 * Supabase Client Utility Module
 *
 * Provides a configured Supabase client for server-side data and auth access.
 * Exposes a singleton supabase object for use across the backend.
 * 
 * Usage example:
 *   const { supabase } = require('./supabase');
 *   // Now use supabase.from(...), supabase.auth, etc.
 *
 * Environment variables required (see .env):
 *   - SUPABASE_URL: Base URL of your Supabase instance
 *   - SUPABASE_KEY: Service role or anon public key for backend client
 *
 * SECURITY: Do NOT hardcode keys or project URLs in source code. Always use environment variables.
 */

// PUBLIC_INTERFACE
const { createClient } = require('@supabase/supabase-js');

// Load environment variables (make sure dotenv is initialized in app entrypoint)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Validate required env vars
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in environment. Please set these in your .env file.');
}

/**
 * Singleton Supabase client for backend use.
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }, // Session is managed per-request/api, not global to process
});

module.exports = { supabase };

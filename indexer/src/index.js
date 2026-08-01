import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required — refusing to start without them.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function pollEvents() {
  console.log('Comeback Soroban Indexer running... polling testnet events.');
  // Poll Horizon / Soroban RPC for contract events and sync to Postgres
}

setInterval(pollEvents, 10000);
console.log('Indexer started successfully.');

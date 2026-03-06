import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // Maybe try SERVICE_ROLE_KEY if you have one?

const client = createClient(supabaseUrl, supabaseKey);
console.log("Checking RLS...");

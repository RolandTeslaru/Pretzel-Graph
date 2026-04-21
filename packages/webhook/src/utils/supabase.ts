import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';

if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

export const createServiceClient = () => {
    return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });
};

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
}

// Context-aware client (User context)
export const createAuthenticatedClient = (accessToken: string) => {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
};

export const createServiceClient = () => {
    return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!,{
        auth: { persistSession: false }
    })
}

export const getUserId = async (supabase: SupabaseClient) => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type EmailLog = {
    id: string;
    email: string;
    campaign_id: string;
    status: 'READY' | 'SENDING_NOW' | 'SENT' | 'FAILED';
    scheduled_at: string | null;
    sent_at: string | null;
    started_at: string | null;
};

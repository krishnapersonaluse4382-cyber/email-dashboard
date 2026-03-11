
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data: opens } = await supabase.from('email_opens').select('*').limit(1);
    console.log('Open row:', opens);
    const { data: clicks } = await supabase.from('email_clicks').select('*').limit(1);
    console.log('Click row:', clicks);
}

checkSchema();

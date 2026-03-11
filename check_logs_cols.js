
import { supabase } from './lib/supabase.js';

async function check() {
    const { data } = await supabase.from('email_logs').select('*').limit(1);
    console.log('Log row columns:', Object.keys(data?.[0] || {}));
}
check();

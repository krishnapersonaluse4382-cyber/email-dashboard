
import { supabase } from './lib/supabase.js';

async function test() {
    const { data, error } = await supabase.from('email_opens').select('*').limit(1);
    console.log('Open row keys:', data ? Object.keys(data[0] || {}) : 'No data');
    console.log('Open row sample:', data ? data[0] : 'No data');
}
test();

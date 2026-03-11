const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function check() {
    const { data, count, error } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact' })
        .eq('campaign_id', 'DASHBOARD_OPEN_TEST_V2');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('Campaign: DASHBOARD_OPEN_TEST_V2');
    console.log('Total Logs:', count);
    data.forEach(d => {
        console.log(`- ID: ${d.id}, Status: ${d.status}, Sent: ${d.sent_at}`);
    });

    const { data: opens } = await supabase
        .from('email_opens')
        .select('*')
        .in('email_id', data.map(d => d.id));
    
    console.log('\nOpens recorded:');
    opens.forEach(o => {
        console.log(`- EmailID: ${o.email_id}, OpenedAt: ${o.opened_at}, UA: ${o.user_agent}`);
    });
}

check();

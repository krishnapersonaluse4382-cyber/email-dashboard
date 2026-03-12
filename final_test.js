const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');

const envFile = fs.readFileSync('C:\\Users\\praja\\.gemini\\antigravity\\My projects\\Workspace - 2\\cold email automation\\test email for supabase new approach\\.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

async function run() {
    const supabase = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS }
    });

    const id = crypto.randomUUID();
    const campaign = 'DASHBOARD_LIVE_TEST_V4';
    const target = 'prajapatijyoti66607@gmail.com';
    const baseUrl = 'https://email-dashboard-app.vercel.app';
    const trackUrl = `${baseUrl}/api/track?id=${id}`;

    console.log(`Sending test email to ${target}...`);

    // 1. Log to DB
    const dbRes = await supabase.from('email_logs').insert({
        id,
        campaign_id: campaign,
        email: target,
        status: 'SENT',
        sent_at: new Date().toISOString()
    });
    console.log('DB Response:', JSON.stringify(dbRes, null, 2));

    // 2. Send email
    await transporter.sendMail({
        from: env.EMAIL_USER,
        to: target,
        subject: 'DASHBOARD FINAL FIX V4',
        html: `
            <div style="font-family: sans-serif; padding: 20px; background: #f9f9f9; border-radius: 10px;">
                <h2 style="color: #7C3AED;">DASHBOARD FINAL FIX V4</h2>
                <p>Hello, this is a final verification test for the new <b>Strict Open Tracking</b>.</p>
                <p style="background: #fff; padding: 15px; border-left: 4px solid #7C3AED;">
                    <b>INSTRUCTIONS:</b><br/>
                    1. Check your Dashboard for campaign "DASHBOARD LIVE TEST V4". It should show 0% Open Rate.<br/>
                    2. <b>WAIT 30 SECONDS</b> before opening this email.<br/>
                    3. After 30 seconds, open it. The open rate should stay accurate and not inflate.
                </p>
                <p style="color: #94A3B8; font-size: 0.8rem;">Tracking ID: ${id}</p>
                <img src="${trackUrl}" width="1" height="1" style="display:none" />
            </div>
        `
    });

    console.log('Done! Check the dashboard now.');
}

run().catch(console.error);

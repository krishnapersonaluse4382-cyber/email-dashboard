import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// A transparent 1x1 GIF base64 string
const PIXEL = Buffer.from('R0lGODlhAQABAJAAAP8AAAAAACH5BAUQAAAALAAAAAABAAEAAAICBAEAOw==', 'base64');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userAgent = request.headers.get('user-agent') || '';
    
    // Bot detection: Block generic crawlers and headless browsers
    // We REMOVED googleimageproxy and ggpht to allow Gmail/Outlook opens to track
    const isBot = /bot|crawler|spider|headless|inspect|preview|whatsapp|bing|slurp|duckduckgo|lighthouse|pagespeed/i.test(userAgent);

    if (id && !isBot) {
        try {
            console.log(`[TRACK] Attempting to log open for ID: ${id}`);
            
            const { data: logEntry, error: fetchError } = await supabase
                .from('email_logs')
                .select('sent_at')
                .eq('id', id)
                .single();

            if (fetchError) {
                console.error(`[TRACK] Could not find ID ${id} in DB:`, fetchError.message);
            } else if (logEntry && logEntry.sent_at) {
                const sentTime = new Date(logEntry.sent_at).getTime();
                const now = Date.now();
                const diffSeconds = (now - sentTime) / 1000;

                // 🛡️ SCAN GUARD: Ignore hits that happen within 5 seconds of sending
                // These are almost always security bots (GoogleImageProxy) scanning the mail
                if (diffSeconds < 5) {
                    console.log(`[TRACK] 🛡️ Scan Guard: Ignoring hit for ID ${id} (Sent ${diffSeconds.toFixed(1)}s ago)`);
                    return new NextResponse(PIXEL, { headers: { 'Content-Type': 'image/gif' } });
                }

                console.log(`[TRACK] ID: ${id} | Sent ${diffSeconds.toFixed(1)}s ago | Agent: ${userAgent.substring(0, 50)}`);

                // Always record the open if it exists. 
                // We trust our strict bot filter at the top level to handle crawlers.
                const { error: insertError } = await supabase.from('email_opens').insert({ 
                    email_id: id,
                    user_agent: userAgent,
                    ip: request.headers.get('x-forwarded-for')?.split(',')[0] || null
                });

                if (insertError) {
                    console.error(`[TRACK] Insert failed:`, insertError.message);
                } else {
                    console.log(`[TRACK] ✅ Recorded open for ${id}`);
                }
            } else {
                console.warn(`[TRACK] ⚠️ Found entry for ${id} but sent_at is NULL or missing.`);
            }
        } catch (e: any) {
            console.error(`[TRACK] UNEXPECTED SYSTEM ERROR:`, e.message);
        }
    }

    // Helper to parse Supabase ISO string responsibly
    function btimestampToMs(ts: string) {
        return new Date(ts).getTime();
    }

    return new NextResponse(PIXEL, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        }
    });
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// A transparent 1x1 GIF base64 string
const PIXEL = Buffer.from('R0lGODlhAQABAJAAAP8AAAAAACH5BAUQAAAALAAAAAABAAEAAAICBAEAOw==', 'base64');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userAgent = request.headers.get('user-agent') || '';
    
    // Bot detection: Block generic crawlers and headlless browsers + common mail proxies
    const isBot = /bot|crawler|spider|headless|inspect|preview|whatsapp|bing|slurp|duckduckgo|lighthouse|pagespeed|googleimageproxy|ggpht|outlook-com-extensions|yahoo-mail-proxy|camo/i.test(userAgent);

    if (id && !isBot) {
        // PER BLUEPRINT: The "60-Second Rule" / "Guard Window"
        // We fetch the log to check when it was sent.
        const { data: logEntry } = await supabase
            .from('email_logs')
            .select('sent_at')
            .eq('id', id)
            .single();

        if (logEntry && logEntry.sent_at) {
            const sentTime = btimestampToMs(logEntry.sent_at);
            const now = Date.now();
            const diffSeconds = (now - sentTime) / 1000;

            // If it's less than 60 seconds, it's almost certainly a scanner hitting the link as it's sent
            if (diffSeconds > 60) {
                // Determine if this is a repeat open from same UA for same ID in last 5 mins to deduplicate
                const { data: recentOpen } = await supabase
                    .from('email_opens')
                    .select('id')
                    .eq('email_id', id)
                    .eq('user_agent', userAgent)
                    .gt('opened_at', new Date(Date.now() - 300000).toISOString())
                    .limit(1);

                if (!recentOpen?.length) {
                    await supabase.from('email_opens').insert({ 
                        email_id: id,
                        user_agent: userAgent
                    });
                }
            }
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

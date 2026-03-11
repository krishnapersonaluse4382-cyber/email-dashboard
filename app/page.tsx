'use client';

import { useState, useEffect } from 'react';
import { supabase, EmailLog } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const INITIAL_PLATFORMS = [
    { name: 'YouTube', icon: '🌐', key: 'YouTube' },
    { name: 'Direct', icon: '🔵', key: 'Direct' },
    { name: 'LinkedIn', icon: '📍', key: 'LinkedIn' },
];

const INITIAL_INDUSTRIES = [
    { name: 'Real Estate', icon: '🏠', key: 'RealEstate' },
    { name: 'Healthcare', icon: '🏥', key: 'Healthcare' },
];

const AGENTS = [
    { name: 'System Agent', key: 'system', patterns: ['SYSTEM', 'CLOUD', 'AUTO', 'HEADLESS'], color: '#7C3AED', emoji: '🤖', bg: 'linear-gradient(135deg, #475569, #1E293B)' },
    { name: 'Rik Agent', key: 'rik', patterns: ['RIK'], color: '#A78BFA', emoji: '🔥', bg: 'linear-gradient(135deg, #7C3AED, #4C1D95)' },
    { name: 'Ryan Agent', key: 'ryan', patterns: ['RYAN'], color: '#3B82F6', emoji: '⚡', bg: 'linear-gradient(135deg, #2563EB, #1E3A8A)' },
    { name: 'Krishna Agent', key: 'krishna', patterns: ['KRISHNA', 'EXCEL', 'MULTI', 'VARIABLE', 'SCHEDULED', 'PC_OFF', 'ANTIGRAVITY', 'TEST', 'CLOUDLOCK', 'HEADLESS', 'VERCEL', 'RIK INSTANT'], color: '#EC4899', emoji: '🌸', bg: 'linear-gradient(135deg, #DB2777, #831843)' },
];

function getDNADesc(dna: string | undefined): string {
    if (dna === 'A') return 'Interest Hook + Result (Casual)';
    if (dna === 'B') return 'Pain-Point + Social Proof (Pro)';
    if (dna === 'C') return 'Question + Emotional (Punchy)';
    return 'Standard Outreach';
}

function agentOf(row: EmailLog) {
    if (row.assigned_agent) {
        const a = AGENTS.find(x => x.name.toLowerCase().includes(row.assigned_agent?.toLowerCase() || ''));
        if (a) return a;
    }
    const u = (row.campaign_id || '').toUpperCase();
    for (const a of AGENTS) {
        if (a.key === 'krishna') continue;
        if (a.patterns.some(p => u.includes(p))) return a;
    }
    return AGENTS[3];
}

export default function Dashboard() {
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [interactions, setInteractions] = useState<{opens: any[], clicks: any[], replies: any[]}>({ opens: [], clicks: [], replies: [] });
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('all');
    const [filter, setFilter] = useState<{ campaign?: string; agent?: string; platform?: string; industry?: string }>({});
    const [search, setSearch] = useState('');
    const [showExplorer, setShowExplorer] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS);
    const [industries, setIndustries] = useState(INITIAL_INDUSTRIES);

    async function load() {
        setLoading(true);
        try {
            const { data: logData } = await supabase.from('email_logs').select('*').order('sent_at', { ascending: false, nullsFirst: false });
            const { data: openData } = await supabase.from('email_opens').select('*').limit(5000);
            const { data: clickData } = await supabase.from('email_clicks').select('*').limit(5000);
            const { data: replyData } = await supabase.from('email_replies').select('*').limit(5000);

            setLogs((logData as EmailLog[]) || []);
            setInteractions({ 
                opens: (openData as any[]) || [], 
                clicks: (clickData as any[]) || [],
                replies: (replyData as any[]) || []
            });
        } catch (e) {
            console.error('Data sync failed:', e);
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
        
        // Load custom platforms/industries from storage
        const savedPlatforms = localStorage.getItem('email_os_platforms');
        if (savedPlatforms) setPlatforms(JSON.parse(savedPlatforms));
        
        const savedIndustries = localStorage.getItem('email_os_industries');
        if (savedIndustries) setIndustries(JSON.parse(savedIndustries));

        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowExplorer(false); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const getInteractions = (row: EmailLog) => {
        const opens = interactions.opens.filter(o => o.email_id === row.id || o.recipient === row.email || o.email === row.email).length;
        const clicks = interactions.clicks.filter(c => c.email_id === row.id || c.recipient === row.email || c.email === row.email).length;
        const replies = interactions.replies.filter(r => r.email_id === row.id || r.recipient === row.email || r.email === row.email || r.from_email === row.email).length;
        return { opens, clicks, replies };
    };

    const applyFilters = (row: EmailLog) => {
        const { opens, clicks, replies } = getInteractions(row);
        if (view === 'opened' && opens === 0) return false;
        if (view === 'clicked' && clicks === 0) return false;
        if (view === 'replies' && replies === 0) return false;
        
        if (filter.campaign && row.campaign_id !== filter.campaign) return false;
        if (filter.agent && agentOf(row).key !== filter.agent) return false;
        if (filter.platform && !(row.campaign_id || '').toLowerCase().includes(filter.platform.toLowerCase())) return false;
        if (filter.industry && !(row.campaign_id || '').toLowerCase().includes(filter.industry.toLowerCase())) return false;
        
        if (search) {
            const s = search.toLowerCase();
            return row.email.toLowerCase().includes(s) || (row.campaign_id || '').toLowerCase().includes(s);
        }
        return true;
    };

    const visibleLogs = logs.filter(applyFilters);
    const totalSent = logs.filter(l => l.status === 'SENT').length;
    
    const uniqueOpened = new Set(interactions.opens.map(o => o.email_id || o.recipient || o.email)).size;
    const uniqueClicked = new Set(interactions.clicks.map(c => c.email_id || c.recipient || c.email)).size;
    const uniqueReplied = new Set(interactions.replies.map(r => r.email_id || r.recipient || r.email || r.from_email)).size;

    const openRate = totalSent > 0 ? ((uniqueOpened / totalSent) * 100).toFixed(1) : '0.0';
    const clickRate = totalSent > 0 ? ((uniqueClicked / totalSent) * 100).toFixed(1) : '0.0';
    const replyRate = totalSent > 0 ? ((uniqueReplied / totalSent) * 100).toFixed(1) : '0.0';

    const campaignMap: Record<string, EmailLog[]> = {};
    logs.forEach(l => { 
        const c = l.campaign_id || 'GENERAL'; 
        (campaignMap[c] = campaignMap[c] || []).push(l); 
    });
    const campaignsList = Object.entries(campaignMap).sort((a, b) => b[1].length - a[1].length);

    const groupedByMonth: Record<string, [string, EmailLog[]][]> = {};
    const monthsToShow = ["March 2026", "April 2026", "May 2026"];
    monthsToShow.forEach(m => groupedByMonth[m] = []);

    campaignsList.forEach(([cid, rows]) => {
        const date = rows[0]?.sent_at ? new Date(rows[0].sent_at) : new Date();
        const monthKey = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
        groupedByMonth[monthKey].push([cid, rows]);
    });

    const handleExport = (format: 'xlsx' | 'csv' | 'pdf' | 'html') => {
        const exportData = visibleLogs.map(l => {
            const { opens, clicks, replies } = getInteractions(l);
            return {
                Recipient: l.email,
                Campaign: l.campaign_id,
                Agent: agentOf(l).name,
                Strategy: getDNADesc(l.dna_type),
                Status: l.status,
                Opens: opens,
                Clicks: clicks,
                Replies: replies,
                SentAt: l.sent_at ? new Date(l.sent_at).toLocaleString() : '—'
            };
        });

        if (format === 'xlsx' || format === 'csv') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Engagement Log");
            XLSX.writeFile(wb, `EmailOS_Report_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`);
        } else if (format === 'pdf') {
            const doc = new jsPDF() as any;
            doc.text("Email OS - Engagement Report", 14, 15);
            doc.autoTable({
                startY: 20,
                head: [['Recipient', 'Campaign', 'Agent', 'Strategy', 'Status', 'Opens', 'Replies']],
                body: exportData.map(d => [d.Recipient, d.Campaign, d.Agent, d.Strategy, d.Status, d.Opens, d.Replies]),
                theme: 'striped',
                headStyles: { fillColor: [124, 58, 237] }
            });
            doc.save(`EmailOS_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } else if (format === 'html') {
            const htmlContent = `
                <html>
                <head><title>Email OS Report</title><style>body{font-family:sans-serif;background:#030407;color:#fff;padding:40px;} table{width:100%;border-collapse:collapse;} th,td{padding:12px;border-bottom:1px solid #222;text-align:left;} th{color:#7C3AED;text-transform:uppercase;font-size:12px;}</style></head>
                <body>
                <h1>Email OS - Command Center Report</h1>
                <table>
                    <thead><tr><th>Recipient</th><th>Campaign</th><th>Agent</th><th>Strategy</th><th>Opens</th><th>Replies</th></tr></thead>
                    <tbody>${exportData.map(d => `<tr><td>${d.Recipient}</td><td>${d.Campaign}</td><td>${d.Agent}</td><td>${d.Strategy}</td><td>${d.Opens}</td><td>${d.Replies}</td></tr>`).join('')}</tbody>
                </table>
                </body>
                </html>
            `;
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `EmailOS_Report_${new Date().toISOString().split('T')[0]}.html`;
            a.click();
        }
        setShowExportMenu(false);
    };

    const addPlatform = () => {
        const name = window.prompt("Enter Platform Name (e.g. TikTok, Reddit):");
        if (name) {
            const icon = window.prompt("Enter Emoji/Icon:") || '🌐';
            const newList = [...platforms, { name, icon, key: name.replace(/\s+/g, '') }];
            setPlatforms(newList);
            localStorage.setItem('email_os_platforms', JSON.stringify(newList));
        }
    };

    const addIndustry = () => {
        const name = window.prompt("Enter Industry Name (e.g. SaaS, Fintech):");
        if (name) {
            const icon = window.prompt("Enter Emoji/Icon:") || '💼';
            const newList = [...industries, { name, icon, key: name.replace(/\s+/g, '') }];
            setIndustries(newList);
            localStorage.setItem('email_os_industries', JSON.stringify(newList));
        }
    };

    const resetFilters = () => { setView('all'); setFilter({}); setSearch(''); };

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030407', color: '#7C3AED', fontSize: '1.2rem', fontWeight: 800 }}>Initializing Command Center...</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#030407', color: '#F8FAFC', overflow: 'hidden' }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
                * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>

            <aside style={{ width: 280, background: '#08090D', borderRight: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, cursor: 'pointer' }} onClick={resetFilters}>
                    <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚡</div>
                    <div>
                        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Email OS</h1>
                        <p style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Command Center</p>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, margin: '24px 0 12px 10px', fontWeight: 700 }}>General</div>
                    <NavAction label="All Activity" active={view === 'all'} onClick={() => setView('all')} badge={logs.length} />
                    <NavAction label="Opened" active={view === 'opened'} onClick={() => setView('opened')} badge={uniqueOpened} />
                    <NavAction label="Clicked" active={view === 'clicked'} onClick={() => setView('clicked')} badge={uniqueClicked} />
                    <NavAction label="Replies" active={view === 'replies'} onClick={() => setView('replies')} badge={uniqueReplied} color="#10B981" />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 12px 10px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Campaigns</span>
                        <span onClick={() => setShowExplorer(true)} style={{ fontSize: '0.6rem', color: '#7C3AED', cursor: 'pointer', fontWeight: 800 }}>EXPLORER ➔</span>
                    </div>
                    {campaignsList.slice(0, 5).map(([cid, rows]) => (
                        <NavAction key={cid} label={`📂 ${cid.replace(/_/g, ' ').substring(0, 20)}...`} active={filter.campaign === cid} onClick={() => setFilter({ campaign: cid })} badge={rows.length} />
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 12px 10px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Platforms</span>
                        <span onClick={addPlatform} style={{ fontSize: '0.8rem', color: '#7C3AED', cursor: 'pointer', fontWeight: 700 }}>+</span>
                    </div>
                    {platforms.map(p => (
                        <NavAction key={p.key} label={`${p.icon} ${p.name}`} active={filter.platform === p.key} onClick={() => setFilter({ platform: p.key })} badge={logs.filter(l => (l.campaign_id || '').toLowerCase().includes(p.key.toLowerCase())).length} />
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 12px 10px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Industries</span>
                        <span onClick={addIndustry} style={{ fontSize: '0.8rem', color: '#7C3AED', cursor: 'pointer', fontWeight: 700 }}>+</span>
                    </div>
                    {industries.map(i => (
                        <NavAction key={i.key} label={`${i.icon} ${i.name}`} active={filter.industry === i.key} onClick={() => setFilter({ industry: i.key })} badge={logs.filter(l => (l.campaign_id || '').toLowerCase().includes(i.key.toLowerCase())).length} />
                    ))}
                </div>

                <button onClick={load} style={{ marginTop: 24, padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94A3B8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>🔄 Sync Dashboard</button>
            </aside>

            <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{filter.campaign || (filter.agent ? `${filter.agent.toUpperCase()} Node` : (filter.platform || filter.industry || 'Global Insight'))}</h2>
                        <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Real-time telemetry and interaction matrix.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ background: '#08090D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, width: 350, display: 'flex', alignItems: 'center', padding: '0 18px' }}>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." style={{ background: 'transparent', border: 'none', padding: '12px', color: '#fff', outline: 'none', width: '100%', fontSize: '0.85rem' }} />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Export Report</button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '120%', right: 0, width: 220, background: '#12141D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100 }}>
                                    <ExportItem icon="📊" label="Microsoft Excel (.xlsx)" onClick={() => handleExport('xlsx')} />
                                    <ExportItem icon="📄" label="Standard CSV (.csv)" onClick={() => handleExport('csv')} />
                                    <ExportItem icon="📕" label="Document PDF (.pdf)" onClick={() => handleExport('pdf')} />
                                    <ExportItem icon="🌐" label="Web Report (.html)" onClick={() => handleExport('html')} />
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 20, marginBottom: 32 }}>
                    <SummaryCard label="Sent Volume" value={totalSent} sub="Total emails" />
                    <SummaryCard label="Reach" value={openRate + '%'} sub={`${uniqueOpened} Opens`} color="#8B5CF6" />
                    <SummaryCard label="Engagement" value={clickRate + '%'} sub={`${uniqueClicked} Clicks`} color="#3B82F6" />
                    <SummaryCard label="Success" value={replyRate + '%'} sub={`${uniqueReplied} Replies`} color="#10B981" />
                    <SummaryCard label="Interactions" value={interactions.opens.length + interactions.clicks.length} sub="Total events" />
                    <SummaryCard label="Active Nodes" value={4} sub="Cluster healthy" color="#10B981" />
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                    {AGENTS.map(a => {
                        const agentLogs = logs.filter(l => agentOf(l).key === a.key);
                        const sNum = new Set(interactions.opens.filter(o => agentLogs.some(l => l.id === o.email_id || l.email === (o.recipient || o.email))).map(o => o.email_id || o.recipient || o.email)).size;
                        return (
                            <div key={a.key} style={{ background: '#08090D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{a.emoji}</div>
                                    <div><h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{a.name}</h3></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <AccountStat val={agentLogs.length} label="Sent" />
                                    <AccountStat val={sNum} label="Open" color="#8B5CF6" />
                                </div>
                            </div>
                        );
                    })}
                </section>

                <section style={{ background: 'rgba(18, 20, 29, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 24, overflow: 'hidden' }}>
                    <div style={{ padding: 20, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700 }}>Telemetry Stream</span>
                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{visibleLogs.length} Records</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase' }}>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Prospect</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Strategy</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Campaign</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Agent</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Interactions</th>
                                    <th style={{ padding: 16, textAlign: 'right' }}>Sent At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleLogs.map(log => {
                                    const { opens, clicks, replies } = getInteractions(log);
                                    const agent = agentOf(log);
                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                                            <td style={{ padding: 16 }}>{log.email}</td>
                                            <td style={{ padding: 16 }}><span style={{ color: '#A78BFA' }}>{getDNADesc(log.dna_type)}</span></td>
                                            <td style={{ padding: 16 }}>{log.campaign_id}</td>
                                            <td style={{ padding: 16 }}>{agent.name.split(' ')[0]}</td>
                                            <td style={{ padding: 16, fontFamily: 'monospace', color: '#7C3AED' }}>{opens}👁️ {clicks}🖱️ {replies}💬</td>
                                            <td style={{ padding: 16, textAlign: 'right', color: '#94A3B8' }}>{log.sent_at ? new Date(log.sent_at).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {showExplorer && (
                <div onClick={() => setShowExplorer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)', zIndex: 1000, padding: 60, overflowY: 'auto' }}>
                    <div onClick={e => e.stopPropagation()} style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Campaign Explorer</h2>
                            <button onClick={() => setShowExplorer(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 12, cursor: 'pointer' }}>Close (Esc)</button>
                        </div>
                        
                        {Object.entries(groupedByMonth).sort((a,b) => b[0].localeCompare(a[0])).map(([month, camps]) => (
                            <div key={month} style={{ marginBottom: 60 }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 2, borderBottom: '2px solid rgba(124, 58, 237, 0.2)', paddingBottom: 15, marginBottom: 25 }}>{month}</div>
                                {camps.length === 0 ? (
                                    <div style={{ padding: 40, background: 'rgba(255,255,255,0.02)', borderRadius: 20, textAlign: 'center', color: '#475569', fontSize: '0.9rem' }}>No campaigns launched for this period yet.</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                                        {camps.map(([cid, rows]) => {
                                            const sCount = rows.filter(r => r.status === 'SENT').length;
                                            const cOpens = new Set(interactions.opens.filter(o => rows.some(r => r.id === o.email_id || r.email === (o.recipient || o.email))).map(o => o.email_id || o.recipient || o.email)).size;
                                            const cReplies = new Set(interactions.replies.filter(r => rows.some(row => row.id === r.email_id || row.email === (r.recipient || r.email))).map(r => r.email_id || r.recipient || r.email)).size;
                                            return (
                                                <div key={cid} onClick={() => { setFilter({ campaign: cid }); setShowExplorer(false); }} style={{ background: '#12141D', border: '1px solid rgba(255,255,255,0.1)', padding: 24, borderRadius: 20, cursor: 'pointer', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20, color: '#F8FAFC' }}>{cid.replace(/_/g, ' ')}</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                                        <ExplorerMetric label="Delivered" val={sCount} />
                                                        <ExplorerMetric label="Open Rate" val={((cOpens/sCount || 0)*100).toFixed(1) + '%'} color="#8B5CF6" />
                                                        <ExplorerMetric label="Replies" val={cReplies} color="#10B981" />
                                                        <ExplorerMetric label="List size" val={rows.length} />
                                                    </div>
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, background: '#7C3AED', width: `${(cOpens/sCount || 0)*100}%` }}></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function NavAction({ label, active, onClick, badge, color }: any) {
    return (
        <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: active ? 'rgba(124, 58, 237, 0.1)' : 'transparent', color: active ? '#fff' : '#94A3B8', marginBottom: 2, transition: 'all 0.2s' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '0.7rem', color: color || '#7C3AED', fontWeight: 700 }}>{badge}</span>
        </div>
    );
}

function SummaryCard({ label, value, sub, color }: any) {
    return (
        <div style={{ background: '#08090D', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 20, padding: 20 }}>
            <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '5px 0', color: color || '#fff' }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: '#475569' }}>{sub}</div>
        </div>
    );
}

function AccountStat({ val, label, color }: any) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: color || '#fff' }}>{val}</div>
            <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600 }}>{label}</div>
        </div>
    );
}

function ExplorerMetric({ label, val, color }: any) {
    return (
        <div>
            <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: color || '#fff' }}>{val}</div>
        </div>
    );
}

function ExportItem({ icon, label, onClick }: any) {
    return (
        <div onClick={onClick} style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 12 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: '1.1rem' }}>{icon}</span>
            <span style={{ fontWeight: 600 }}>{label}</span>
        </div>
    );
}

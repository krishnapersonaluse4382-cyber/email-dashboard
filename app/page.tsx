'use client';

import { useState, useEffect } from 'react';
import { supabase, EmailLog } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
// @ts-ignore
import autoTable from 'jspdf-autotable';

const INITIAL_PLATFORMS = [
    { name: 'YouTube', icon: '🌐', key: 'YouTube' },
    { name: 'Direct', icon: '🔵', key: 'Direct' },
    { name: 'LinkedIn', icon: '📍', key: 'LinkedIn' },
    { name: 'Instagram', icon: '📸', key: 'Instagram' },
];

const INITIAL_INDUSTRIES = [
    { name: 'Real Estate', icon: '🏠', key: 'RealEstate' },
    { name: 'Healthcare', icon: '🏥', key: 'Healthcare' },
    { name: 'Crypto', icon: '💎', key: 'Crypto' },
    { name: 'SAAS', icon: '🚀', key: 'SAAS' },
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

// Sub-components defined inside or exported properly
function NavAction({ label, active, onClick, badge, color, onDelete, onEdit }: any) {
    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: active ? 'rgba(124, 58, 237, 0.1)' : 'transparent', color: active ? '#fff' : '#94A3B8', marginBottom: 2, transition: 'all 0.2s' }}>
            <div style={{flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}} onClick={onClick}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{label}</span>
                {badge !== undefined && <span style={{ fontSize: '0.7rem', color: color || '#7C3AED', fontWeight: 700, marginLeft: 8 }}>{badge}</span>}
            </div>
            
            <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                {onEdit && (
                    <div onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{ padding: '2px', color: 'rgba(59, 130, 246, 0.6)', fontSize: '0.7rem', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#3B82F6'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(59, 130, 246, 0.6)'}>
                        ✎
                    </div>
                )}
                {onDelete && (
                    <div onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ padding: '4px', color: 'rgba(239, 68, 68, 0.4)', fontSize: '0.55rem', transition: 'all 0.2s', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '4px', lineHeight: 1 }} onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'rgba(239, 68, 68, 0.4)'; e.currentTarget.style.background = 'transparent'; }}>
                        ✕
                    </div>
                )}
            </div>
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
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'platform' | 'industry' | 'campaign', key: string } | null>(null);
    const [deleteStep, setDeleteStep] = useState<1 | 2 | 0>(0);
    const [hiddenCampaigns, setHiddenCampaigns] = useState<string[]>([]);

    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [editCampaignName, setEditCampaignName] = useState<string>('');
    const [explorerView, setExplorerView] = useState<'grid' | 'list'>('grid');
    const [explorerSearch, setExplorerSearch] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'openRate' | 'size'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [groupByMonth, setGroupByMonth] = useState(true);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);

    async function load() {
        setIsSyncing(true);
        try {
            const { data: logData } = await supabase.from('email_logs').select('*').order('sent_at', { ascending: false });
            const { data: openData } = await supabase.from('email_opens').select('*').limit(5000);
            const { data: clickData } = await supabase.from('email_clicks').select('*').limit(5000);
            const { data: replyData } = await supabase.from('email_replies').select('*').limit(5000);

            setLogs((logData as EmailLog[]) || []);
            setInteractions({ 
                opens: (openData as any[]) || [], 
                clicks: (clickData as any[]) || [],
                replies: (replyData as any[]) || []
            });
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 3000);
        } catch (e) {
            console.error('Data sync failed:', e);
        }
        setLoading(false);
        setIsSyncing(false);
    }

    useEffect(() => {
        load();
        
        const savedPlatforms = localStorage.getItem('email_os_platforms');
        if (savedPlatforms) setPlatforms(JSON.parse(savedPlatforms));
        
        const savedIndustries = localStorage.getItem('email_os_industries');
        if (savedIndustries) setIndustries(JSON.parse(savedIndustries));

        const savedHidden = localStorage.getItem('email_os_hidden_camps');
        if (savedHidden) setHiddenCampaigns(JSON.parse(savedHidden));

        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowExplorer(false); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const getInteractions = (row: EmailLog) => {
        // STRICT ID MATCHING: interactions MUST belong to the specific email send (ID)
        // This prevents cross-campaign contamination (e.g., old replies showing up in new campaigns)
        const opens = interactions.opens.filter(o => o.email_id === row.id).length;
        const clicks = interactions.clicks.filter(c => c.email_id === row.id).length;
        const replies = interactions.replies.filter(r => r.email_id === row.id).length;
        
        return { opens, clicks, replies };
    };

    const updateFilter = (key: keyof typeof filter, value: string) => {
        setFilter(prev => {
            const next = { ...prev };
            if (next[key] === value) delete next[key];
            else next[key] = value;
            return next;
        });
    };

    // Helper to extract clean campaign name (strips metadata tunnel)
    const getCleanName = (name: string) => {
        if (!name) return 'Unknown Campaign';
        return name.split('|')[0].trim();
    };

    const applyBaseFilters = (logsToFilter: EmailLog[]) => {
        return logsToFilter.filter(row => {
            const cleanCampId = getCleanName(row.campaign_id || '');
            
            if (filter.campaign && cleanCampId !== getCleanName(filter.campaign)) return false;
            if (filter.agent && agentOf(row).key !== filter.agent) return false;
        
        // Advanced Attribute Filtering with Fuzzy Matching (ignores spaces/case)
        const clean = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (filter.platform) {
            const p = clean(filter.platform);
            const rowP = clean(row.platform || '');
            const fullCampId = row.campaign_id || '';
            if (!rowP.includes(p) && !clean(fullCampId).includes(p)) return false;
        }
        
        if (filter.industry) {
            const i = clean(filter.industry);
            const rowI = clean(row.industry || '');
            const fullCampId = row.campaign_id || '';
            if (!rowI.includes(i) && !clean(fullCampId).includes(i)) return false;
        }
        
        if (search) {
            const s = search.toLowerCase();
            const email = (row.email || '').toLowerCase();
            const camp = cleanCampId.toLowerCase();
            const plat = (row.platform || '').toLowerCase();
            const ind = (row.industry || '').toLowerCase();
            if (!email.includes(s) && !camp.includes(s) && !plat.includes(s) && !ind.includes(s)) return false;
        }

        return true;
        });
    };

    const applyViewFilters = (row: EmailLog) => {
        const { opens, clicks, replies } = getInteractions(row);
        if (view === 'opened' && opens === 0) return false;
        if (view === 'clicked' && clicks === 0) return false;
        if (view === 'replies' && replies === 0) return false;
        return true;
    };

    const baseLogs = applyBaseFilters(logs);
    const visibleLogs = baseLogs.filter(applyViewFilters);
    const totalSent = baseLogs.filter(l => l.status === 'SENT').length;

    const baseLogIds = new Set(baseLogs.map(l => l.id));
    const baseLogEmails = new Set(baseLogs.map(l => l.email));

    const visibleOpens = interactions.opens.filter(o => baseLogIds.has(o.email_id));
    const visibleClicks = interactions.clicks.filter(c => baseLogIds.has(c.email_id));
    const visibleReplies = interactions.replies.filter(r => baseLogIds.has(r.email_id));
    
    // Summary cards use unique IDs from these strictly-filtered interactions
    const uniqueOpened = new Set(visibleOpens.map(o => o.email_id)).size;
    const uniqueClicked = new Set(visibleClicks.map(c => c.email_id)).size;
    const uniqueReplied = new Set(visibleReplies.map(r => r.email_id)).size;

    const openRate = totalSent > 0 ? Math.min((uniqueOpened / totalSent) * 100, 100).toFixed(1) : '0.0';
    const clickRate = totalSent > 0 ? Math.min((uniqueClicked / totalSent) * 100, 100).toFixed(1) : '0.0';
    const replyRate = totalSent > 0 ? Math.min((uniqueReplied / totalSent) * 100, 100).toFixed(1) : '0.0';

    const campaignMap: Record<string, EmailLog[]> = {};
    logs.forEach(l => { 
        const c = getCleanName(l.campaign_id || 'GENERAL'); 
        (campaignMap[c] = campaignMap[c] || []).push(l); 
    });

    const campaignsList = Object.entries(campaignMap)
        .filter(([cid]) => !hiddenCampaigns.includes(cid))
        .map(([cid, rows]): [string, EmailLog[], number, number, number] => {
            const sCount = rows.filter(r => r.status === 'SENT').length;
            const rIds = new Set(rows.map(r => r.id));
            
            // Strictly match interactions to these specific row IDs
            const cOpens = new Set(interactions.opens.filter(o => rIds.has(o.email_id)).map(o => o.email_id)).size;
            
            const oRate = sCount > 0 ? (cOpens / sCount) * 100 : 0;
            const time = rows[0]?.sent_at ? new Date(rows[0].sent_at).getTime() : 0;
            return [cid, rows, oRate, time, rows.length];
        })
        .sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') comparison = a[0].localeCompare(b[0]);
            else if (sortBy === 'date') comparison = a[3] - b[3];
            else if (sortBy === 'openRate') comparison = a[2] - b[2];
            else if (sortBy === 'size') comparison = a[4] - b[4];
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    // Grouping for Explorer
    const groupedCampaigns: Record<string, [string, EmailLog[], number, number, number][]> = {};
    if (groupByMonth) {
        campaignsList.forEach(item => {
            const date = item[3] ? new Date(item[3]) : new Date();
            const monthKey = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            if (!groupedCampaigns[monthKey]) groupedCampaigns[monthKey] = [];
            groupedCampaigns[monthKey].push(item);
        });
    } else {
        groupedCampaigns['All Campaigns'] = campaignsList;
    }

    const handleExport = (format: 'xlsx' | 'csv' | 'pdf' | 'html') => {
        const exportData = visibleLogs.map(l => {
            const { opens, clicks, replies } = getInteractions(l);
            return {
                Recipient: l.email,
                Source: l.platform || 'Direct',
                Industry: l.industry || 'General',
                Campaign: getCleanName(l.campaign_id),
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
            autoTable(doc, {
                startY: 20,
                head: [['Recipient', 'Source', 'Industry', 'Campaign', 'Agent', 'Strategy', 'Status', 'Opens', 'Replies']],
                body: exportData.map(d => [d.Recipient, d.Source, d.Industry, d.Campaign, d.Agent, d.Strategy, d.Status, d.Opens, d.Replies]),
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
                    <thead><tr><th>Recipient</th><th>Source</th><th>Industry</th><th>Campaign</th><th>Agent</th><th>Strategy</th><th>Opens</th><th>Replies</th></tr></thead>
                    <tbody>${exportData.map(d => `<tr><td>${d.Recipient}</td><td>${d.Source}</td><td>${d.Industry}</td><td>${d.Campaign}</td><td>${d.Agent}</td><td>${d.Strategy}</td><td>${d.Opens}</td><td>${d.Replies}</td></tr>`).join('')}</tbody>
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
        const name = window.prompt("Enter Platform Name:");
        if (name) {
            const icon = window.prompt("Enter Emoji/Icon:") || '🌐';
            const newList = [...platforms, { name, icon, key: name.replace(/\s+/g, '') }];
            setPlatforms(newList);
            localStorage.setItem('email_os_platforms', JSON.stringify(newList));
        }
    };

    const addIndustry = () => {
        const name = window.prompt("Enter Industry Name:");
        if (name) {
            const icon = window.prompt("Enter Emoji/Icon:") || '💼';
            const newList = [...industries, { name, icon, key: name.replace(/\s+/g, '') }];
            setIndustries(newList);
            localStorage.setItem('email_os_industries', JSON.stringify(newList));
        }
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        if (deleteStep === 1) {
            setDeleteStep(2);
            return;
        }
        if (deleteStep === 2) {
            if (deleteTarget.type === 'platform') {
                const newList = platforms.filter(p => p.key !== deleteTarget.key);
                setPlatforms(newList);
                localStorage.setItem('email_os_platforms', JSON.stringify(newList));
                if (filter.platform === deleteTarget.key) setFilter({});
            } else if (deleteTarget.type === 'industry') {
                const newList = industries.filter(i => i.key !== deleteTarget.key);
                setIndustries(newList);
                localStorage.setItem('email_os_industries', JSON.stringify(newList));
                if (filter.industry === deleteTarget.key) setFilter({});
            } else if (deleteTarget.type === 'campaign') {
                const newList = [...hiddenCampaigns, deleteTarget.key];
                setHiddenCampaigns(newList);
                localStorage.setItem('email_os_hidden_camps', JSON.stringify(newList));
                if (filter.campaign === deleteTarget.key) setFilter({});
            }
            setDeleteTarget(null);
            setDeleteStep(0);
        }
    };

    const startDelete = (type: 'platform' | 'industry' | 'campaign', key: string) => {
        setDeleteTarget({ type, key });
        setDeleteStep(1);
    };

    const handleRenameCampaign = async (oldName: string, newName: string) => {
        if (!newName || !newName.trim() || newName === oldName) {
            setEditingCampaignId(null);
            return;
        }
        try {
            // Update all logs where the cleaned campaign_id matches oldName
            const logsToUpdate = logs.filter(log => getCleanName(log.campaign_id || '') === oldName);
            for (const log of logsToUpdate) {
                const originalCampaignId = log.campaign_id || '';
                const metadata = originalCampaignId.includes('|') ? originalCampaignId.split('|').slice(1).join('|') : '';
                const newFullCampaignId = metadata ? `${newName.trim()}|${metadata}` : newName.trim();
                await supabase.from('email_logs').update({ campaign_id: newFullCampaignId }).eq('id', log.id);
            }
            
            setLogs(logs.map(log => {
                if (getCleanName(log.campaign_id || '') === oldName) {
                    const originalCampaignId = log.campaign_id || '';
                    const metadata = originalCampaignId.includes('|') ? originalCampaignId.split('|').slice(1).join('|') : '';
                    const newFullCampaignId = metadata ? `${newName.trim()}|${metadata}` : newName.trim();
                    return { ...log, campaign_id: newFullCampaignId };
                }
                return log;
            }));
            if (getCleanName(filter.campaign || '') === oldName) setFilter({ ...filter, campaign: newName.trim() });
            setEditingCampaignId(null);
        } catch (err) {
            console.error('Rename failed', err);
        }
    };

    const resetFilters = () => { setView('all'); setFilter({}); setSearch(''); };

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030407', color: '#7C3AED', fontSize: '1.2rem', fontWeight: 800 }}>Initializing Command Center...</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#030407', color: '#F8FAFC', overflow: 'hidden' }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
                * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
                ::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.4); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(124, 58, 237, 0.7); }
                .custom-scroll { scrollbar-width: thin; scrollbar-color: rgba(124, 58, 237, 0.4) transparent; }
            `}</style>

            <aside style={{ width: 280, background: '#08090D', borderRight: '1px solid rgba(255, 255, 255, 0.1)', padding: '24px', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, cursor: 'pointer', flexShrink: 0 }} onClick={resetFilters}>
                    <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚡</div>
                    <div>
                        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Email OS</h1>
                        <p style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Command Center</p>
                    </div>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, margin: '10px 0 10px 10px', fontWeight: 700, flexShrink: 0 }}>General</div>
                    <div style={{ flexShrink: 0 }}>
                        <NavAction label="All Activity" active={view === 'all'} onClick={() => setView('all')} badge={baseLogs.length} />
                        <NavAction label="Opened" active={view === 'opened'} onClick={() => setView('opened')} badge={uniqueOpened} />
                        <NavAction label="Clicked" active={view === 'clicked'} onClick={() => setView('clicked')} badge={uniqueClicked} />
                        <NavAction label="Replies" active={view === 'replies'} onClick={() => setView('replies')} badge={uniqueReplied} color="#10B981" />
                    </div>

                    <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', marginTop: 16, paddingRight: 8, display: 'flex', flexDirection: 'column' }}>
                        {/* Campaigns Section - 40% Proportional Height */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 40%', minHeight: 200, marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 10px', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Campaigns</span>
                                    {filter.campaign && <span onClick={() => updateFilter('campaign', filter.campaign!)} style={{ fontSize: '0.6rem', color: '#EF4444', cursor: 'pointer', fontWeight: 700, opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>RESET</span>}
                                </div>
                                <span onClick={() => setShowExplorer(true)} style={{ fontSize: '0.6rem', color: '#7C3AED', cursor: 'pointer', fontWeight: 800 }}>EXPLORER ➔</span>
                            </div>
                            <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                                {campaignsList.map(([cid, rows]) => {
                                    if (editingCampaignId === cid) {
                                        return (
                                            <div key={cid} style={{ padding: '8px 12px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: 12, marginBottom: 4 }}>
                                                <input 
                                                    autoFocus
                                                    value={editCampaignName}
                                                    onChange={e => setEditCampaignName(e.target.value)}
                                                    onBlur={() => handleRenameCampaign(cid, editCampaignName)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleRenameCampaign(cid, editCampaignName);
                                                        if (e.key === 'Escape') setEditingCampaignId(null);
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600, width: '100%', outline: 'none' }}
                                                />
                                            </div>
                                        );
                                    }
                                    return (
                                        <NavAction 
                                            key={cid}
                                            label={`📂 ${cid.replace(/_/g, ' ')}`} 
                                            active={filter.campaign === cid} 
                                            onClick={() => updateFilter('campaign', cid)} 
                                            badge={rows.length} 
                                            onEdit={() => { setEditingCampaignId(cid); setEditCampaignName(cid); }}
                                            onDelete={() => startDelete('campaign', cid)}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Platforms Section - 30% Proportional Height */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 30%', minHeight: 180, marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 10px', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Platforms</span>
                                    {filter.platform && <span onClick={() => updateFilter('platform', filter.platform!)} style={{ fontSize: '0.6rem', color: '#EF4444', cursor: 'pointer', fontWeight: 700, opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>RESET</span>}
                                </div>
                                <span onClick={addPlatform} style={{ fontSize: '1rem', color: '#7C3AED', cursor: 'pointer' }}>+</span>
                            </div>
                            <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                                {platforms.map(p => {
                                    const pk = p.key.toLowerCase().replace(/\s/g, '');
                                    const filteredLogs = logs.filter(l => {
                                        if (filter.campaign && getCleanName(l.campaign_id || '') !== getCleanName(filter.campaign)) return false;
                                        if (filter.agent && agentOf(l).key !== filter.agent) return false;
                                        return true;
                                    });
                                    const count = filteredLogs.filter(l => {
                                        const lp = (l.platform || '').toLowerCase().replace(/\s/g, '');
                                        const lc = (l.campaign_id || '').toLowerCase().replace(/\s/g, '');
                                        return lp.includes(pk) || lc.includes(pk);
                                    }).length;
                                    return (
                                        <NavAction key={p.key} label={`${p.icon} ${p.name}`} active={filter.platform === p.key} onClick={() => updateFilter('platform', p.key)} badge={count} onDelete={() => startDelete('platform', p.key)} />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Industries Section - 30% Proportional Height */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 30%', minHeight: 180, paddingBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 10px', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Industries</span>
                                    {filter.industry && <span onClick={() => updateFilter('industry', filter.industry!)} style={{ fontSize: '0.6rem', color: '#EF4444', cursor: 'pointer', fontWeight: 700, opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>RESET</span>}
                                </div>
                                <span onClick={addIndustry} style={{ fontSize: '1rem', color: '#7C3AED', cursor: 'pointer' }}>+</span>
                            </div>
                            <div className="custom-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                                {industries.map(i => {
                                    const ik = i.key.toLowerCase().replace(/\s/g, '');
                                    const filteredLogs = logs.filter(l => {
                                        if (filter.campaign && getCleanName(l.campaign_id || '') !== getCleanName(filter.campaign)) return false;
                                        if (filter.agent && agentOf(l).key !== filter.agent) return false;
                                        return true;
                                    });
                                    const count = filteredLogs.filter(l => {
                                        const li = (l.industry || '').toLowerCase().replace(/\s/g, '');
                                        const lc = (l.campaign_id || '').toLowerCase().replace(/\s/g, '');
                                        return li.includes(ik) || lc.includes(ik);
                                    }).length;
                                    return (
                                        <NavAction key={i.key} label={`${i.icon} ${i.name}`} active={filter.industry === i.key} onClick={() => updateFilter('industry', i.key)} badge={count} onDelete={() => startDelete('industry', i.key)} />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </nav>

                <button 
                    disabled={isSyncing}
                    onClick={load} 
                    style={{ 
                        marginTop: 24, 
                        padding: '12px', 
                        background: isSyncing ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.03)', 
                        border: `1px solid ${syncSuccess ? '#10B981' : 'rgba(255,255,255,0.1)'}`, 
                        borderRadius: 12, 
                        color: syncSuccess ? '#10B981' : (isSyncing ? '#64748B' : '#94A3B8'), 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        cursor: isSyncing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {isSyncing ? '⌛ Syncing Data...' : (syncSuccess ? '✅ Dashboard Updated' : '🔄 Sync Dashboard')}
                </button>
            </aside>

            <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>Command</span>
                            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED', letterSpacing: 1, textTransform: 'uppercase' }}>
                                {filter.campaign ? filter.campaign.replace(/_/g, ' ') : 'GLOBAL'}
                            </span>
                            {(filter.platform || filter.industry) && (
                                <>
                                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3B82F6', letterSpacing: 1, textTransform: 'uppercase' }}>
                                        {filter.platform || filter.industry}
                                    </span>
                                </>
                            )}
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
                            {filter.campaign ? filter.campaign.replace(/_/g, ' ') : (filter.platform || filter.industry || 'Global Insight')}
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 4 }}>Analyzing {visibleLogs.length} total outreach vectors.</p>
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

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                    <SummaryCard label="Sent Volume" value={totalSent} sub="Total emails" />
                    <SummaryCard label="Reach" value={openRate + '%'} sub={`${uniqueOpened} Opens`} color="#8B5CF6" />
                    <SummaryCard label="Engagement" value={clickRate + '%'} sub={`${uniqueClicked} Clicks`} color="#3B82F6" />
                    <SummaryCard label="Success" value={replyRate + '%'} sub={`${uniqueReplied} Replies`} color="#10B981" />
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
                                    <AccountStat val={Math.min(sNum, agentLogs.length)} label="Open" color="#8B5CF6" />
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
                                    <th style={{ padding: 16, textAlign: 'left' }}>Source</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Industry</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Campaign</th>
                                    <th style={{ padding: 16, textAlign: 'left' }}>Agent</th>
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
                                            <td style={{ padding: 16 }}>
                                                <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(37, 99, 235, 0.1)', color: '#60A5FA', borderRadius: 6, textTransform: 'uppercase', fontWeight: 700 }}>
                                                    {log.platform || 'Direct'}
                                                </span>
                                            </td>
                                            <td style={{ padding: 16 }}>
                                                <span style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#34D399', borderRadius: 6, textTransform: 'uppercase', fontWeight: 700 }}>
                                                    {log.industry || 'General'}
                                                </span>
                                            </td>
                                            <td style={{ padding: 16 }}>{getCleanName(log.campaign_id)}</td>
                                            <td style={{ padding: 16 }}>{agent.name.split(' ')[0]}</td>
                                            <td style={{ padding: 16, textAlign: 'right', color: '#94A3B8', fontSize: '0.75rem' }}>
                                                {(() => {
                                                    const date = log.sent_at || log.started_at || log.scheduled_at;
                                                    return date ? new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {showExplorer && (
                <div onClick={() => setShowExplorer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)', zIndex: 1000, padding: 60, display: 'flex', flexDirection: 'column' }}>
                    <div onClick={e => e.stopPropagation()} style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexShrink: 0 }}>
                            <div>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, color: '#F8FAFC' }}>Campaign Explorer</h2>
                                <p style={{ color: '#94A3B8', marginTop: 8, fontSize: '1rem' }}>Search and analyze historical performance.</p>
                            </div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <div style={{ position: 'relative' }}>
                                    <button onClick={() => setShowSortMenu(!showSortMenu)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>Sort/Group By</button>
                                    {showSortMenu && (
                                        <div style={{ position: 'absolute', top: '120%', right: 0, width: 220, background: '#12141D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1100 }}>
                                            <div style={{ padding: '8px 16px', fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Sort Criteria</div>
                                            <div onClick={() => setSortBy('name')} style={{ padding: '12px 16px', cursor: 'pointer', background: sortBy === 'name' ? 'rgba(124, 58, 237, 0.2)' : 'transparent' }}>Name {sortBy === 'name' && '✓'}</div>
                                            <div onClick={() => setSortBy('date')} style={{ padding: '12px 16px', cursor: 'pointer', background: sortBy === 'date' ? 'rgba(124, 58, 237, 0.2)' : 'transparent' }}>Date {sortBy === 'date' && '✓'}</div>
                                            <div onClick={() => setSortBy('openRate')} style={{ padding: '12px 16px', cursor: 'pointer', background: sortBy === 'openRate' ? 'rgba(124, 58, 237, 0.2)' : 'transparent' }}>Open Rate {sortBy === 'openRate' && '✓'}</div>
                                            <div onClick={() => setSortBy('size')} style={{ padding: '12px 16px', cursor: 'pointer', background: sortBy === 'size' ? 'rgba(124, 58, 237, 0.2)' : 'transparent' }}>List Size {sortBy === 'size' && '✓'}</div>
                                            
                                            <div style={{ padding: '8px 16px', fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', marginTop: 8 }}>Order</div>
                                            <div onClick={() => setSortOrder('asc')} style={{ padding: '12px 16px', cursor: 'pointer', background: sortOrder === 'asc' ? 'rgba(34, 197, 94, 0.2)' : 'transparent' }}>Ascending {sortOrder === 'asc' && '✓'}</div>
                                            <div onClick={() => setSortOrder('desc')} style={{ padding: '12px 16px', cursor: 'pointer', background: sortOrder === 'desc' ? 'rgba(34, 197, 94, 0.2)' : 'transparent' }}>Descending {sortOrder === 'desc' && '✓'}</div>
                                            
                                            <div style={{ padding: '8px 16px', fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', marginTop: 8 }}>Grouping</div>
                                            <div onClick={() => setGroupByMonth(!groupByMonth)} style={{ padding: '12px 16px', cursor: 'pointer' }}>Group by Month {groupByMonth ? '✓' : ''}</div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <button onClick={() => setExplorerView('grid')} style={{ padding: '10px 20px', borderRadius: 10, background: explorerView === 'grid' ? '#7C3AED' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>Grid View</button>
                                    <button onClick={() => setExplorerView('list')} style={{ padding: '10px 20px', borderRadius: 10, background: explorerView === 'list' ? '#7C3AED' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>List View</button>
                                </div>
                                <button onClick={() => setShowExplorer(false)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 24px', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>Close (Esc)</button>
                            </div>
                        </div>

                        {/* HIGH VISIBILITY SEARCH BAR */}
                        <div style={{ marginBottom: 40, flexShrink: 0 }}>
                            <div style={{ background: '#12141D', border: '3px solid #7C3AED', borderRadius: 16, display: 'flex', alignItems: 'center', padding: '4px 24px', boxShadow: '0 0 30px rgba(124, 58, 237, 0.3)' }}>
                                <span style={{ fontSize: '1.5rem', marginRight: 15 }}>🔍</span>
                                <input 
                                    autoFocus 
                                    value={explorerSearch} 
                                    onChange={e => setExplorerSearch(e.target.value)} 
                                    placeholder="TYPE CAMPAIGN NAME TO SEARCH..." 
                                    style={{ background: 'transparent', border: 'none', padding: '16px 0', color: '#fff', outline: 'none', width: '100%', fontSize: '1.1rem', fontWeight: 800, letterSpacing: 1 }} 
                                />
                                {explorerSearch && <button onClick={() => setExplorerSearch('')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>}
                            </div>
                        </div>

                        <div className="custom-scroll" style={{ overflowY: 'auto', flex: 1, paddingRight: 20 }}>
                            {Object.entries(groupedCampaigns).map(([group, camps]) => {
                                const filteredCamps = camps.filter(([cid]) => cid.toLowerCase().includes(explorerSearch.toLowerCase()));
                                if (filteredCamps.length === 0) return null;

                                return (
                                    <div key={group} style={{ marginBottom: 60 }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 2, borderBottom: '2px solid rgba(124, 58, 237, 0.2)', paddingBottom: 15, marginBottom: 25 }}>{group}</div>
                                        
                                        {explorerView === 'grid' ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                                                {filteredCamps.map(([cid, rows, oRate, time, size]) => {
                                                    const sCount = rows.filter(r => r.status === 'SENT').length;
                                                    const cReplies = new Set(interactions.replies.filter(r => rows.some(row => row.id === r.email_id)).map(r => r.email_id)).size;
                                                    return (
                                                        <div key={cid} onClick={() => { updateFilter('campaign', cid); setShowExplorer(false); }} style={{ background: '#12141D', border: '1px solid rgba(255,255,255,0.1)', padding: 24, borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.5)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                                                            <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 20, color: '#F8FAFC' }}>{cid.replace(/_/g, ' ')}</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                                                 <ExplorerMetric label="Delivered" val={sCount} />
                                                                 <ExplorerMetric label="Open Rate" val={Math.min(oRate, 100).toFixed(1) + '%'} color="#8B5CF6" />
                                                                 <ExplorerMetric label="Replies" val={cReplies} color="#10B981" />
                                                                 <ExplorerMetric label="Launched" val={new Date(time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                                                            </div>
                                                            <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, background: '#7C3AED', width: `${Math.min(oRate, 100)}%` }}></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {filteredCamps.map(([cid, rows, oRate, time, size]) => {
                                                    const sCount = rows.filter(r => r.status === 'SENT').length;
                                                    const cReplies = new Set(interactions.replies.filter(r => rows.some(row => row.id === r.email_id)).map(r => r.email_id)).size;
                                                    return (
                                                        <div key={cid} onClick={() => { updateFilter('campaign', cid); setShowExplorer(false); }} style={{ background: '#12141D', border: '1px solid rgba(255,255,255,0.05)', padding: '16px 24px', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${oRate > 0 ? '#7C3AED' : '#334155'}`, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = '#12141D'}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#F8FAFC' }}>{cid.replace(/_/g, ' ')}</div>
                                                                <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                                                                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>DELIVERED: <b style={{color:'#fff'}}>{sCount}</b></span>
                                                                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>LIST: <b style={{color:'#fff'}}>{size}</b></span>
                                                                    <span style={{ fontSize: '0.7rem', color: '#64748B' }}>LAUNCHED: <b style={{color:'#fff'}}>{new Date(time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</b></span>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#8B5CF6' }}>{Math.min(oRate, 100).toFixed(1)}%</div>
                                                                    <div style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase' }}>Open Rate</div>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10B981' }}>{cReplies}</div>
                                                                    <div style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase' }}>Replies</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && deleteStep > 0 && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#12141D', padding: 32, borderRadius: 16, width: 400, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                        <h3 style={{marginTop: 0, fontSize: '1.4rem', color: deleteStep === 2 ? '#EF4444' : '#fff'}}>{deleteStep === 1 ? 'Warning ⚠️' : '🚨 Final Warning 🚨'}</h3>
                        <p style={{ color: '#94A3B8', fontSize: '0.95rem', marginBottom: 24, lineHeight: 1.5 }}>
                            {deleteStep === 1 
                                ? `Are you sure you wanna perform this action? This will cause you to lose all the data inside that ${deleteTarget.type}.` 
                                : `This is the last time you can ever see this panel. Make sure there is nothing important inside it. Do you really wanna delete it?`}
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => { setDeleteTarget(null); setDeleteStep(0); }} style={{ flex: 1, padding: '14px', background: '#fff', color: '#000', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>No</button>
                            <button onClick={confirmDelete} style={{ flex: 1, padding: '14px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>Yes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

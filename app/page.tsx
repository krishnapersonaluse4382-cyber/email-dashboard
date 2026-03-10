'use client';

import { useState, useEffect } from 'react';
import { supabase, EmailLog } from '@/lib/supabase';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getBadge(status: string) {
  switch (status) {
    case 'SENT': return <span className="badge badge-sent">✓ Delivered</span>;
    case 'READY': return <span className="badge badge-ready">⏳ Scheduled</span>;
    case 'SENDING_NOW': return <span className="badge badge-sending">⟳ Sending</span>;
    default: return <span className="badge badge-failed">✕ Failed</span>;
  }
}

function getCampaignEmoji(campaign: string) {
  const u = (campaign || '').toUpperCase();
  if (u.includes('RIK')) return { emoji: '⚡', color: '#a78bfa' };
  if (u.includes('RYAN')) return { emoji: '🎯', color: '#38bdf8' };
  if (u.includes('SYSTEM') || u.includes('AUTO')) return { emoji: '🤖', color: '#7aa2f7' };
  return { emoji: '✉', color: '#f472b6' };
}

const AGENTS = [
  { name: 'System Agent', emoji: '🤖', bg: '#1a2744', color: '#7aa2f7', patterns: ['SYSTEM', 'AUTO', 'CLOUD', 'HEADLESS'] },
  { name: 'Rik Agent', emoji: '⚡', bg: '#4c1d95', color: '#a78bfa', patterns: ['RIK'] },
  { name: 'Ryan Agent', emoji: '🎯', bg: '#1e3a5f', color: '#38bdf8', patterns: ['RYAN'] },
  { name: 'Krishna Agent', emoji: '✉', bg: '#1c1a2e', color: '#f472b6', patterns: ['KRISHNA', 'EXCEL', 'MULTI', 'VARIABLE', 'SCHEDULED', 'PC_OFF', 'ANTIGRAVITY', 'TEST', 'CLOUDLOCK', 'HEADLESS', 'VERCEL', 'RIK INSTANT'] },
];

export default function Dashboard() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'scheduled'>('all');

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false, nullsFirst: false });
    setLogs((data as EmailLog[]) || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filtered = logs.filter(l => {
    const matchCampaign = selectedCampaign ? l.campaign_id === selectedCampaign : true;
    const matchTab = activeTab === 'all' ? true
      : activeTab === 'sent' ? l.status === 'SENT'
        : l.status === 'READY';
    return matchCampaign && matchTab;
  });

  const sentLogs = logs.filter(l => l.status === 'SENT');
  const readyLogs = logs.filter(l => l.status === 'READY');

  // Campaign map
  const campaignMap: Record<string, number> = {};
  logs.forEach(l => {
    const cid = l.campaign_id || 'UNKNOWN';
    campaignMap[cid] = (campaignMap[cid] || 0) + 1;
  });
  const campaigns = Object.entries(campaignMap).sort((a, b) => b[1] - a[1]);

  function agentCount(patterns: string[], status?: string) {
    return logs.filter(l => {
      const match = patterns.some(p => (l.campaign_id || '').toUpperCase().includes(p));
      return match && (status ? l.status === status : true);
    }).length;
  }

  const displayLogs = loading ? [] : filtered;

  return (
    <div className="shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">E</div>
          <div>
            <div className="logo-text">EmailOS</div>
            <div className="logo-sub">Command Center</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">General</div>
          <button
            className={`sidebar-item ${activeTab === 'all' && !selectedCampaign ? 'active' : ''}`}
            onClick={() => { setSelectedCampaign(null); setActiveTab('all'); }}>
            <span>📊</span> All Activity
            <span className="sidebar-badge">{logs.length}</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'sent' && !selectedCampaign ? 'active' : ''}`}
            onClick={() => { setSelectedCampaign(null); setActiveTab('sent'); }}>
            <span>📬</span> Sent
            <span className="sidebar-badge">{sentLogs.length}</span>
          </button>
          <button
            className={`sidebar-item ${activeTab === 'scheduled' && !selectedCampaign ? 'active' : ''}`}
            onClick={() => { setSelectedCampaign(null); setActiveTab('scheduled'); }}>
            <span>⏳</span> Scheduled
            <span className="sidebar-badge">{readyLogs.length}</span>
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Campaigns</div>
          {campaigns.map(([cid, count]) => {
            const { emoji } = getCampaignEmoji(cid);
            return (
              <button
                key={cid}
                className={`sidebar-item ${selectedCampaign === cid ? 'active' : ''}`}
                onClick={() => { setSelectedCampaign(cid); setActiveTab('all'); }}>
                <span>{emoji}</span>
                <span style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                  {cid.replace(/_/g, ' ').toLowerCase()}
                </span>
                <span className="sidebar-badge">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-bottom">
          <button className="sidebar-item" onClick={fetchData}>
            <span>↻</span> Sync Real-time
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div>
            <div className="page-title">
              {selectedCampaign
                ? selectedCampaign.replace(/_/g, ' ').toLowerCase()
                : 'Market Intelligence Overview'}
            </div>
            <div className="page-subtitle">
              <span className="live-dot" />
              Live data from Supabase · {logs.length} total records
              {selectedCampaign && <span> · filtered to <strong>{selectedCampaign.replace(/_/g, ' ')}</strong></span>}
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={fetchData}>↻ Refresh</button>
            {selectedCampaign && (
              <button className="btn btn-ghost" onClick={() => setSelectedCampaign(null)}>✕ Clear Filter</button>
            )}
            <button className="btn btn-primary">Export Report ▾</button>
          </div>
        </div>

        <div className="content">
          {/* Stats bar */}
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-label">Sent Volume</div>
              <div className="stat-value">{sentLogs.length}</div>
              <div className="stat-sub">Total deliveries</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Scheduled</div>
              <div className="stat-value">{readyLogs.length}</div>
              <div className="stat-sub">Pending sends</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Campaigns</div>
              <div className="stat-value">{campaigns.length}</div>
              <div className="stat-sub">Total campaigns</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Engagement</div>
              <div className="stat-value" style={{ color: '#6b6b90', fontSize: '18px', paddingTop: '4px' }}>Open tracking</div>
              <div className="stat-sub">Coming soon</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Activity</div>
              <div className="stat-value">{logs.length}</div>
              <div className="stat-sub">Total touchpoints</div>
            </div>
          </div>

          {/* Agent cards */}
          <div className="agents-row">
            {AGENTS.map(agent => {
              const sent = agentCount(agent.patterns, 'SENT');
              const total = agentCount(agent.patterns);
              const perf = total > 0 ? Math.round((sent / total) * 100) : 0;
              return (
                <div key={agent.name} className="agent-card">
                  <div className="agent-header">
                    <div className="agent-avatar" style={{ background: agent.bg }}>
                      {agent.emoji}
                    </div>
                    <div>
                      <div className="agent-name">{agent.name}</div>
                      <div className="agent-perf">{perf}% Performance</div>
                    </div>
                  </div>
                  <div className="agent-stats">
                    {['SENT', 'OPEN', 'CLICK', 'REPLY'].map((label, i) => (
                      <div key={label}>
                        <div className="agent-stat-label">{label}</div>
                        <div className="agent-stat-value" style={{ color: i === 0 ? agent.color : '#4a4a6a' }}>
                          {i === 0 ? sent : 0}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div className="table-section">
            <div className="table-header">
              <div>
                <div className="table-title">Engagement Log</div>
                <div className="table-subtitle">
                  {selectedCampaign
                    ? `Filtered: ${selectedCampaign.replace(/_/g, ' ')} — ${displayLogs.length} records`
                    : `Complete delivery history — ${displayLogs.length} records`}
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Recipient</th>
                  <th>Campaign</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Signals</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="loading-row"><td colSpan={7}>Loading...</td></tr>
                ) : displayLogs.length === 0 ? (
                  <tr className="loading-row"><td colSpan={7}>No records found</td></tr>
                ) : (
                  displayLogs.map((log, i) => {
                    const { emoji, color } = getCampaignEmoji(log.campaign_id);
                    return (
                      <tr key={log.id}>
                        <td className="row-num">{String(i + 1).padStart(2, '0')}</td>
                        <td>
                          <div className="email-cell">
                            <span className="email-primary">{log.email.split('@')[0]}</span>
                            <span className="email-secondary">{log.email}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            className="campaign-tag"
                            style={{ cursor: 'pointer', border: 'none' }}
                            onClick={() => setSelectedCampaign(log.campaign_id)}>
                            <span>{emoji}</span>
                            <span style={{ color }}>{log.campaign_id?.replace(/_/g, ' ').toLowerCase() || '—'}</span>
                          </button>
                        </td>
                        <td className="timestamp">{formatDate(log.scheduled_at)}</td>
                        <td>{getBadge(log.status)}</td>
                        <td>
                          <div className="signals-cell">
                            <span>0 opens</span>
                            <span>0 clicks</span>
                          </div>
                        </td>
                        <td className="timestamp">{formatDate(log.sent_at || log.started_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

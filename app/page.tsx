import { supabase, EmailLog } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getData() {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    return [];
  }
  return data as EmailLog[];
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ' ' +
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

function getAgentAvatar(campaign: string) {
  if (!campaign) return { bg: '#1e293b', emoji: '?', name: 'Unknown' };
  const upper = campaign.toUpperCase();
  if (upper.includes('RIK')) return { bg: '#4c1d95', emoji: '⚡', name: 'Rik' };
  if (upper.includes('RYAN')) return { bg: '#1e3a5f', emoji: '🎯', name: 'Ryan' };
  if (upper.includes('SYSTEM') || upper.includes('AUTO')) return { bg: '#1a2744', emoji: '🤖', name: 'System' };
  return { bg: '#1c1a2e', emoji: '✉', name: 'Krishna' };
}

export default async function Dashboard() {
  const logs = await getData();

  const sentLogs = logs.filter(l => l.status === 'SENT');
  const readyLogs = logs.filter(l => l.status === 'READY');

  // Per campaign stats
  const campaignMap: Record<string, { sent: number; total: number }> = {};
  logs.forEach(l => {
    const cid = l.campaign_id || 'UNKNOWN';
    if (!campaignMap[cid]) campaignMap[cid] = { sent: 0, total: 0 };
    campaignMap[cid].total++;
    if (l.status === 'SENT') campaignMap[cid].sent++;
  });

  const campaigns = Object.entries(campaignMap);

  // Agent summary (group by sender pattern)
  const agents = [
    { name: 'System Agent', emoji: '🤖', bg: '#1a2744', color: '#7aa2f7', pattern: ['SYSTEM', 'AUTO', 'CLOUD', 'HEADLESS'] },
    { name: 'Rik Agent', emoji: '⚡', bg: '#4c1d95', color: '#a78bfa', pattern: ['RIK'] },
    { name: 'Ryan Agent', emoji: '🎯', bg: '#1e3a5f', color: '#38bdf8', pattern: ['RYAN'] },
    { name: 'Krishna Agent', emoji: '✉', bg: '#1c1a2e', color: '#f472b6', pattern: ['KRISHNA', 'EXCEL', 'MULTI', 'VARIABLE', 'SCHEDULED', 'PC_OFF', 'ANTIGRAVITY', 'TEST', 'CLOUDLOCK'] },
  ];

  function agentSent(patterns: string[]) {
    return sentLogs.filter(l => patterns.some(p => (l.campaign_id || '').toUpperCase().includes(p))).length;
  }

  function agentTotal(patterns: string[]) {
    return logs.filter(l => patterns.some(p => (l.campaign_id || '').toUpperCase().includes(p))).length;
  }

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
          <a className="sidebar-item active">
            <span>📊</span> All Activity
            <span className="sidebar-badge">{logs.length}</span>
          </a>
          <a className="sidebar-item">
            <span>📬</span> Sent
            <span className="sidebar-badge">{sentLogs.length}</span>
          </a>
          <a className="sidebar-item">
            <span>⏳</span> Scheduled
            <span className="sidebar-badge">{readyLogs.length}</span>
          </a>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Campaigns</div>
          {campaigns.slice(0, 5).map(([cid, stats]) => (
            <a key={cid} className="sidebar-item">
              <span>📁</span>
              <span style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cid.replace(/_/g, ' ').toLowerCase()}
              </span>
              <span className="sidebar-badge">{stats.total}</span>
            </a>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div>
            <div className="page-title">Market Intelligence Overview</div>
            <div className="page-subtitle">
              <span className="live-dot" />
              Live data from Supabase · {logs.length} total records
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={undefined}>↻ Refresh</button>
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
              <div className="stat-value" style={{ color: '#6b6b90' }}>—</div>
              <div className="stat-sub">Open tracking soon</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Activity</div>
              <div className="stat-value">{logs.length}</div>
              <div className="stat-sub">Total touchpoints</div>
            </div>
          </div>

          {/* Agent cards */}
          <div className="agents-row">
            {agents.map(agent => {
              const sent = agentSent(agent.pattern);
              const total = agentTotal(agent.pattern);
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

          {/* Engagement log table */}
          <div className="table-section">
            <div className="table-header">
              <div>
                <div className="table-title">Engagement Log</div>
                <div className="table-subtitle">Complete delivery history from Supabase</div>
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
                {logs.length === 0 ? (
                  <tr className="loading-row">
                    <td colSpan={7}>No records found</td>
                  </tr>
                ) : (
                  logs.map((log, i) => {
                    const agent = getAgentAvatar(log.campaign_id);
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
                          <span className="campaign-tag">
                            <span>{agent.emoji}</span>
                            {log.campaign_id?.replace(/_/g, ' ').toLowerCase() || '—'}
                          </span>
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

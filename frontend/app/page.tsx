'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api, getUser } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { LoadingState, EmptyState } from '@/components/LoadingState';

export default function DashboardPage() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [recentPAs, setRecentPAs] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const user = getUser();
    const role = user?.role || '';

    useEffect(() => {
        const promises: Promise<any>[] = [
            api.analytics().catch(() => null),
            api.listPARequests().catch(() => []),
        ];
        // Also load clinical notes for providers 
        if (role === 'provider' || role === 'admin') {
            promises.push(api.listNotes().catch(() => []));
        }

        Promise.all(promises)
            .then(([a, pas, nts]) => {
                setAnalytics(a);
                setRecentPAs(pas || []);
                if (nts) setNotes(nts);
            })
            .catch(err => {
                const msg = err.message || 'Failed to load dashboard data';
                setError(msg);
                showToast(msg, 'error');
            })
            .finally(() => setLoading(false));
    }, []);

    const statusLabel = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const pendingPAs = recentPAs.filter(pa => ['draft', 'pending_review'].includes(pa.status));
    const submittedPAs = recentPAs.filter(pa => pa.status === 'submitted');
    const approvedPAs = recentPAs.filter(pa => pa.status === 'approved');
    const deniedPAs = recentPAs.filter(pa => ['denied', 'appeal_denied'].includes(pa.status));

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const roleTitle = () => {
        switch (role) {
            case 'nurse_coordinator': return 'Nurse Coordinator Dashboard';
            case 'provider': return 'Provider Dashboard';
            case 'manager': return 'Operations Dashboard';
            case 'admin': return 'Admin Dashboard';
            default: return 'Dashboard';
        }
    };

    const roleSubtitle = () => {
        switch (role) {
            case 'nurse_coordinator': return 'Track PA requests, manage submissions, and monitor your authorization queue';
            case 'provider': return 'Review clinical notes, sign off on authorizations, and track patient outcomes';
            case 'manager': return 'Monitor team performance, analyze denial trends, and optimize workflows';
            case 'admin': return 'Full platform overview and administration';
            default: return 'Prior Authorization & Clinical Documentation Overview';
        }
    };

    if (loading) return <AppShell><div className="page-body"><LoadingState type="page" count={4} /></div></AppShell>;
    if (error) return <AppShell><div className="page-body"><EmptyState icon="&#9888;" title="Error loading dashboard" text={error} action={{ label: 'Retry', onClick: () => window.location.reload() }} /></div></AppShell>;

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{roleTitle()}</h1>
                    <p className="page-subtitle">{greeting()}, {user?.full_name?.split(',')[0]?.split(' ')[0] || 'User'} — {roleSubtitle()}</p>
                </div>
                <div className="page-actions">
                    {(role === 'nurse_coordinator' || role === 'admin') && (
                        <a href="/pa-workbench" className="btn btn-primary">+ New PA Request</a>
                    )}
                    {(role === 'provider' || role === 'admin') && (
                        <a href="/clinical-notes" className="btn btn-secondary">📝 Clinical Notes</a>
                    )}
                </div>
            </div>
            <div className="page-body animate-fade">
                {/* ── KPI Cards ──────────────────────────────────── */}
                <div className="kpi-grid">
                    {(role === 'nurse_coordinator' || role === 'admin') && (
                        <>
                            <div className="kpi-card">
                                <div className="kpi-label">My Queue</div>
                                <div className="kpi-value" style={{ color: 'var(--warning)' }}>{pendingPAs.length}</div>
                                <div className="kpi-change">Pending review</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Submitted</div>
                                <div className="kpi-value" style={{ color: 'var(--info)' }}>{submittedPAs.length}</div>
                                <div className="kpi-change">Awaiting decision</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Approved</div>
                                <div className="kpi-value" style={{ color: 'var(--success)' }}>{approvedPAs.length}</div>
                                <div className="kpi-change positive">{analytics?.approval_rate?.toFixed(1) || 0}% rate</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Denied</div>
                                <div className="kpi-value" style={{ color: 'var(--danger)' }}>{deniedPAs.length}</div>
                                <div className="kpi-change negative">{analytics?.denial_rate?.toFixed(1) || 0}% rate</div>
                            </div>
                        </>
                    )}
                    {role === 'provider' && (
                        <>
                            <div className="kpi-card">
                                <div className="kpi-label">Active PA Requests</div>
                                <div className="kpi-value">{recentPAs.length}</div>
                                <div className="kpi-change">Total requests</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Needs Attention</div>
                                <div className="kpi-value" style={{ color: 'var(--warning)' }}>{pendingPAs.length}</div>
                                <div className="kpi-change">Review & sign off</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Clinical Notes</div>
                                <div className="kpi-value" style={{ color: 'var(--info)' }}>{notes.length}</div>
                                <div className="kpi-change">Documentation</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Approval Rate</div>
                                <div className="kpi-value" style={{ color: 'var(--success)' }}>{analytics?.approval_rate?.toFixed(1) || 0}%</div>
                                <div className="kpi-change positive">{approvedPAs.length} approved</div>
                            </div>
                        </>
                    )}
                    {role === 'manager' && (
                        <>
                            <div className="kpi-card">
                                <div className="kpi-label">Total PA Requests</div>
                                <div className="kpi-value">{analytics?.total_pa_requests || 0}</div>
                                <div className="kpi-change">All time</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Approval Rate</div>
                                <div className="kpi-value" style={{ color: 'var(--success)' }}>{analytics?.approval_rate?.toFixed(1) || 0}%</div>
                                <div className="kpi-change positive">{analytics?.approved || 0} approved</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Denial Rate</div>
                                <div className="kpi-value" style={{ color: 'var(--danger)' }}>{analytics?.denial_rate?.toFixed(1) || 0}%</div>
                                <div className="kpi-change negative">{analytics?.denied || 0} denied</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-label">Avg Turnaround</div>
                                <div className="kpi-value">{analytics?.avg_turnaround_days?.toFixed(1) || 0}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}> days</span></div>
                                <div className="kpi-change">{analytics?.pending || 0} pending</div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Nurse Coordinator View ──────────────────────── */}
                {(role === 'nurse_coordinator' || role === 'admin') && (
                    <div className="grid-2">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">⚡ PA Queue — Needs Action</h3>
                                <a href="/pa-workbench" className="btn btn-sm btn-secondary">View All</a>
                            </div>
                            {pendingPAs.length === 0 ? (
                                <div className="card-body"><EmptyState icon="✅" title="All caught up!" text="No pending PA requests requiring action" /></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>Reference</th><th>Patient</th><th>Procedure</th><th>Priority</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {pendingPAs.slice(0, 8).map(pa => (
                                                <tr key={pa.id} className="clickable-row" onClick={() => window.location.href = `/pa-requests/${pa.id}`}>
                                                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{pa.reference_number}</td>
                                                    <td>{pa.patient ? `${pa.patient.first_name} ${pa.patient.last_name}` : `#${pa.patient_id}`}</td>
                                                    <td>{pa.procedure_name}</td>
                                                    <td><span className={`status-badge ${pa.priority}`}>{pa.priority}</span></td>
                                                    <td><span className={`status-badge ${pa.status}`}>{statusLabel(pa.status)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📊 Recent Decisions</h3>
                                <a href="/analytics" className="btn btn-sm btn-secondary">Analytics</a>
                            </div>
                            {[...approvedPAs, ...deniedPAs].length === 0 ? (
                                <div className="card-body"><EmptyState icon="📋" title="No decisions yet" text="Submitted requests will appear here once resolved" /></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>Reference</th><th>Procedure</th><th>Payer</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {[...approvedPAs, ...deniedPAs].slice(0, 8).map(pa => (
                                                <tr key={pa.id} className="clickable-row" onClick={() => window.location.href = `/pa-requests/${pa.id}`}>
                                                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{pa.reference_number}</td>
                                                    <td>{pa.procedure_name}</td>
                                                    <td>{pa.payer_name}</td>
                                                    <td><span className={`status-badge ${pa.status}`}>{statusLabel(pa.status)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Provider View ──────────────────────────────── */}
                {role === 'provider' && (
                    <div className="grid-2">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🩺 Pending Reviews</h3>
                                <a href="/pa-workbench" className="btn btn-sm btn-secondary">PA Workbench</a>
                            </div>
                            {pendingPAs.length === 0 ? (
                                <div className="card-body"><EmptyState icon="✅" title="No pending reviews" text="No PA requests currently need your review" /></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>Reference</th><th>Patient</th><th>Procedure</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {pendingPAs.slice(0, 6).map(pa => (
                                                <tr key={pa.id} className="clickable-row" onClick={() => window.location.href = `/pa-requests/${pa.id}`}>
                                                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{pa.reference_number}</td>
                                                    <td>{pa.patient ? `${pa.patient.first_name} ${pa.patient.last_name}` : `#${pa.patient_id}`}</td>
                                                    <td>{pa.procedure_name}</td>
                                                    <td><span className={`status-badge ${pa.status}`}>{statusLabel(pa.status)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📝 Recent Clinical Notes</h3>
                                <a href="/clinical-notes" className="btn btn-sm btn-secondary">View All</a>
                            </div>
                            {notes.length === 0 ? (
                                <div className="card-body"><EmptyState icon="📝" title="No clinical notes yet" text="Create your first clinical note" action={{ label: '+ New Note', onClick: () => window.location.href = '/clinical-notes' }} /></div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>Type</th><th>Patient</th><th>Status</th><th>Created</th></tr></thead>
                                        <tbody>
                                            {notes.slice(0, 6).map(n => (
                                                <tr key={n.id} className="clickable-row" onClick={() => window.location.href = `/clinical-notes/${n.id}`}>
                                                    <td><span className={`status-badge ${n.note_type?.toLowerCase()}`}>{n.note_type}</span></td>
                                                    <td>Patient #{n.patient_id}</td>
                                                    <td><span className={`status-badge ${n.status}`}>{statusLabel(n.status || 'draft')}</span></td>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Manager View ───────────────────────────────── */}
                {role === 'manager' && (
                    <div className="grid-2">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📈 Denial Reasons Breakdown</h3>
                                <a href="/analytics" className="btn btn-sm btn-secondary">Full Report</a>
                            </div>
                            <div className="card-body">
                                {analytics?.denial_by_reason?.map((d: any, i: number) => (
                                    <div key={i} style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.reason.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{d.count} ({d.percentage}%)</span>
                                        </div>
                                        <div style={{ background: 'var(--bg-input)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                            <div style={{ width: `${d.percentage}%`, height: '100%', background: i === 0 ? 'var(--danger)' : i === 1 ? 'var(--warning)' : 'var(--info)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                                        </div>
                                    </div>
                                ))}
                                {(!analytics?.denial_by_reason || analytics.denial_by_reason.length === 0) && (
                                    <EmptyState icon="📊" title="No denial data yet" />
                                )}
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🏥 Team PA Activity</h3>
                                <a href="/pa-workbench" className="btn btn-sm btn-secondary">View All</a>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 8, textAlign: 'center' }}>
                                        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)' }}>{pendingPAs.length}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>In Queue</div>
                                    </div>
                                    <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 8, textAlign: 'center' }}>
                                        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--info)' }}>{submittedPAs.length}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Submitted</div>
                                    </div>
                                    <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 8, textAlign: 'center' }}>
                                        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>{approvedPAs.length}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Approved</div>
                                    </div>
                                    <div style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 8, textAlign: 'center' }}>
                                        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--danger)' }}>{deniedPAs.length}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Denied</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: 20 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Recent Denials</h4>
                                    {deniedPAs.length === 0 ? (
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No denials — great work! 🎉</div>
                                    ) : (
                                        deniedPAs.slice(0, 4).map(pa => (
                                            <div key={pa.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{pa.procedure_name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pa.payer_name} • {pa.reference_number}</div>
                                                </div>
                                                <span className="status-badge denied" style={{ fontSize: 11 }}>{pa.denial_reason?.replace(/_/g, ' ') || 'Denied'}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Quick access actions ────────────────────────── */}
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header">
                        <h3 className="card-title">🚀 Quick Actions</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <a href="/pa-workbench" className="btn btn-secondary" style={{ flex: '1 1 200px', justifyContent: 'center', padding: '14px 20px' }}>
                                📋 PA Workbench
                            </a>
                            <a href="/clinical-notes" className="btn btn-secondary" style={{ flex: '1 1 200px', justifyContent: 'center', padding: '14px 20px' }}>
                                📝 Clinical Notes
                            </a>
                            <a href="/analytics" className="btn btn-secondary" style={{ flex: '1 1 200px', justifyContent: 'center', padding: '14px 20px' }}>
                                📈 Denial Analytics
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

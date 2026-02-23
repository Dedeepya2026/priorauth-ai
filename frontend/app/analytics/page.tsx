'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { LoadingState, EmptyState } from '@/components/LoadingState';

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        api.analytics()
            .then(setData)
            .catch(err => { setError(err.message || 'Failed to load analytics'); showToast(err.message || 'Failed to load analytics', 'error'); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <AppShell><div className="page-body"><LoadingState type="page" count={4} /></div></AppShell>;
    if (error) return <AppShell><div className="page-body"><EmptyState icon="&#9888;" title="Error loading analytics" text={error} action={{ label: 'Retry', onClick: () => window.location.reload() }} /></div></AppShell>;

    const maxDenials = Math.max(...(data?.denial_by_reason?.map((d: any) => d.count) || [1]));

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Denial Analytics</h1>
                    <p className="page-subtitle">Track denial reasons, turnaround times, and root-cause trends</p>
                </div>
            </div>

            <div className="page-body animate-fade">
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-label">Total PA Requests</div>
                        <div className="kpi-value">{data?.total_pa_requests || 0}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Approved</div>
                        <div className="kpi-value" style={{ color: 'var(--success)' }}>{data?.approved || 0}</div>
                        <div className="kpi-change positive">{data?.approval_rate?.toFixed(1)}% rate</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Denied</div>
                        <div className="kpi-value" style={{ color: 'var(--danger)' }}>{data?.denied || 0}</div>
                        <div className="kpi-change negative">{data?.denial_rate?.toFixed(1)}% rate</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Avg Turnaround</div>
                        <div className="kpi-value">{data?.avg_turnaround_days?.toFixed(1) || 0}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}> days</span></div>
                    </div>
                </div>

                <div className="grid-2">
                    {/* Denial by Reason */}
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Denial Reasons Breakdown</h3></div>
                        <div className="card-body">
                            {data?.denial_by_reason?.length > 0 ? data.denial_by_reason.map((d: any, i: number) => {
                                const colors = ['#FF4757', '#FFB800', '#54A0FF', '#6C63FF', '#00D4AA', '#FF6B6B', '#48DBFB', '#FF9FF3'];
                                return (
                                    <div key={i} style={{ marginBottom: 18 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{d.reason.replace(/_/g, ' ')}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{d.count} ({d.percentage}%)</span>
                                        </div>
                                        <div style={{ background: 'var(--bg-input)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                                            <div style={{ width: `${(d.count / maxDenials) * 100}%`, height: '100%', background: colors[i % colors.length], borderRadius: 6, transition: 'width 0.8s ease' }} />
                                        </div>
                                    </div>
                                );
                            }) : <EmptyState icon="&#128200;" title="No denial data" />}
                        </div>
                    </div>

                    {/* Turnaround Trend */}
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Monthly Turnaround Trend</h3></div>
                        <div className="card-body">
                            {data?.turnaround_trend?.length > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, padding: '0 10px', overflowX: 'auto' }}>
                                    {data.turnaround_trend.map((t: any, i: number) => {
                                        const maxDays = Math.max(...data.turnaround_trend.map((x: any) => x.avg_days || 1));
                                        const h = Math.max(((t.avg_days / maxDays) * 160), 20);
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 32 }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{t.avg_days?.toFixed(1)}d</span>
                                                <div style={{ width: '100%', height: h, background: 'linear-gradient(180deg, var(--primary), var(--secondary))', borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease', minWidth: 24 }} />
                                                <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.month}</span>
                                                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t.total_requests} req</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <EmptyState icon="&#128200;" title="No turnaround data" />}
                        </div>
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: 20 }}>
                    {/* Top Denied Procedures */}
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Top Denied Procedures</h3></div>
                        <div className="card-body">
                            {data?.top_denied_procedures?.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>Procedure Code</th><th>Denials</th></tr></thead>
                                        <tbody>
                                            {data.top_denied_procedures.map((p: any, i: number) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{p.procedure_code}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{p.count}</span>
                                                            <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                                                                <div style={{ width: `${(p.count / (data.top_denied_procedures[0]?.count || 1)) * 100}%`, height: '100%', background: 'var(--danger)', borderRadius: 3 }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <EmptyState icon="&#128200;" title="No denial data" />}
                        </div>
                    </div>

                    {/* Denial by Payer */}
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Denials by Payer</h3></div>
                        <div className="card-body">
                            {data?.denial_by_payer?.length > 0 ? (
                                <div>
                                    {data.denial_by_payer.map((p: any, i: number) => {
                                        const maxP = data.denial_by_payer[0]?.count || 1;
                                        const colors = ['#FF4757', '#FFB800', '#54A0FF', '#6C63FF', '#00D4AA'];
                                        return (
                                            <div key={i} style={{ marginBottom: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.payer_name}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.count}</span>
                                                </div>
                                                <div style={{ background: 'var(--bg-input)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                                                    <div style={{ width: `${(p.count / maxP) * 100}%`, height: '100%', background: colors[i % colors.length], borderRadius: 6, transition: 'width 0.8s ease' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <EmptyState icon="&#128200;" title="No payer denial data" />}
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

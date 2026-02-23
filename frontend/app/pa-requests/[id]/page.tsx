'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { LoadingState, EmptyState } from '@/components/LoadingState';

export default function PADetailPage() {
    const params = useParams();
    const id = Number(params.id);
    const [pa, setPA] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [appealing, setAppealing] = useState(false);
    const [tab, setTab] = useState('overview');
    const { showToast } = useToast();

    const load = () => {
        api.getPARequest(id)
            .then(setPA)
            .catch(err => { setError(err.message || 'Failed to load PA request'); showToast(err.message || 'Failed to load PA request', 'error'); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [id]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await api.generatePacket(id);
            setPA(res);
            setTab('packet');
            showToast('PA packet generated successfully', 'success');
        } catch (e: any) {
            showToast(e.message || 'Failed to generate packet', 'error');
        }
        setGenerating(false);
    };

    const handleAppeal = async () => {
        setAppealing(true);
        try {
            const res = await api.generateAppeal(id);
            setPA(res);
            setTab('appeal');
            showToast('Appeal letter generated successfully', 'success');
        } catch (e: any) {
            showToast(e.message || 'Failed to generate appeal', 'error');
        }
        setAppealing(false);
    };

    const handleStatusChange = async (status: string) => {
        try {
            const res = await api.updatePARequest(id, { status });
            setPA(res);
            showToast(`Status updated to ${status.replace(/_/g, ' ')}`, 'success');
        } catch (e: any) {
            showToast(e.message || 'Failed to update status', 'error');
        }
    };

    const statusLabel = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    if (loading) return <AppShell><div className="page-body"><LoadingState type="page" count={2} /></div></AppShell>;
    if (error || !pa) return <AppShell><div className="page-body"><EmptyState icon="&#9888;" title={error || 'PA Request not found'} action={{ label: 'Back to Workbench', onClick: () => window.location.href = '/pa-workbench' }} /></div></AppShell>;

    let checklist: any[] = [];
    try { checklist = JSON.parse(pa.completeness_checklist || '[]'); } catch { }
    let missing: string[] = [];
    try { missing = JSON.parse(pa.missing_evidence || '[]'); } catch { }

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <div style={{ marginBottom: 8 }}><a href="/pa-workbench" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>&larr; Back to Workbench</a></div>
                    <h1 className="page-title">{pa.reference_number}</h1>
                    <p className="page-subtitle">{pa.procedure_code} &mdash; {pa.procedure_name}</p>
                </div>
                <div className="page-actions">
                    <span className={`status-badge ${pa.status}`} style={{ fontSize: 14, padding: '6px 16px' }}>{statusLabel(pa.status)}</span>
                    {pa.status === 'draft' && <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>{generating ? <><span className="loading-spinner" /> Generating...</> : 'Generate PA Packet'}</button>}
                    {pa.status === 'pending_review' && <button className="btn btn-success" onClick={() => handleStatusChange('submitted')}>Submit to Payer</button>}
                    {(pa.status === 'denied' || pa.status === 'appeal_denied') && <button className="btn btn-secondary" onClick={handleAppeal} disabled={appealing}>{appealing ? <><span className="loading-spinner" /> Generating...</> : 'Generate Appeal'}</button>}
                </div>
            </div>

            <div className="page-body animate-fade">
                <div className="tabs" style={{ flexWrap: 'wrap' }}>
                    {['overview', 'packet', 'appeal', 'documents', 'checklist'].map(t => (
                        <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                    ))}
                </div>

                {tab === 'overview' && (
                    <div className="grid-2">
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Request Details</h3></div>
                            <div className="card-body">
                                <table style={{ width: '100%' }}>
                                    <tbody>
                                        {[
                                            ['Patient', pa.patient ? `${pa.patient.first_name} ${pa.patient.last_name}` : `#${pa.patient_id}`],
                                            ['Procedure', `${pa.procedure_code} - ${pa.procedure_name}`],
                                            ['Diagnosis', `${pa.diagnosis_code} - ${pa.diagnosis_name || 'N/A'}`],
                                            ['Payer', pa.payer_name],
                                            ['Priority', pa.priority],
                                            ['Created', pa.created_at ? new Date(pa.created_at).toLocaleDateString() : 'N/A'],
                                            ['Turnaround', pa.turnaround_days ? `${pa.turnaround_days} days` : 'In progress'],
                                        ].map(([label, val]) => (
                                            <tr key={label as string}>
                                                <td style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: 13, width: 120 }}>{label}</td>
                                                <td style={{ padding: '8px 0', fontSize: 14, color: 'var(--text)' }}>{val}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Clinical Rationale</h3></div>
                            <div className="card-body">
                                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{pa.clinical_rationale || 'No clinical rationale provided yet.'}</p>
                                {pa.denial_reason && (
                                    <div style={{ marginTop: 16, padding: 14, background: 'rgba(255,71,87,0.1)', borderRadius: 8, border: '1px solid rgba(255,71,87,0.2)' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>DENIAL REASON</div>
                                        <div style={{ fontSize: 14, color: 'var(--text)' }}>{pa.denial_reason.replace(/_/g, ' ')}</div>
                                        {pa.denial_details && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{pa.denial_details}</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'packet' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Generated PA Packet</h3>
                            {!pa.generated_packet && <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={generating}>{generating ? <><span className="loading-spinner" /> Generating...</> : 'Generate Now'}</button>}
                        </div>
                        <div className="card-body">
                            {pa.generated_packet ? (
                                <div className="doc-preview">{pa.generated_packet}</div>
                            ) : (
                                <EmptyState icon="&#128196;" title="No packet generated yet" text='Click "Generate PA Packet" to create an AI-drafted authorization packet' />
                            )}
                        </div>
                    </div>
                )}

                {tab === 'appeal' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Appeal Letter</h3>
                            {(pa.status === 'denied' || pa.status === 'appeal_denied') && !pa.appeal_letter && <button className="btn btn-primary btn-sm" onClick={handleAppeal} disabled={appealing}>Generate Appeal</button>}
                        </div>
                        <div className="card-body">
                            {pa.appeal_letter ? (
                                <div className="doc-preview">{pa.appeal_letter}</div>
                            ) : (
                                <EmptyState icon="&#9993;" title="No appeal letter" text="Appeal letters can be generated for denied requests" />
                            )}
                        </div>
                    </div>
                )}

                {tab === 'documents' && (
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Attached Documents</h3></div>
                        <div className="card-body">
                            {pa.documents && pa.documents.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>File</th><th>Type</th><th>Size</th><th>Uploaded</th></tr></thead>
                                        <tbody>
                                            {pa.documents.map((doc: any) => (
                                                <tr key={doc.id}>
                                                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{doc.original_filename}</td>
                                                    <td>{doc.content_type}</td>
                                                    <td>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}</td>
                                                    <td>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState icon="&#128206;" title="No documents attached" />
                            )}
                        </div>
                    </div>
                )}

                {tab === 'checklist' && (
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">PA Completeness Checklist</h3></div>
                        <div className="card-body">
                            {checklist.length > 0 ? (
                                <>
                                    <ul className="checklist">
                                        {checklist.map((item: any, i: number) => (
                                            <li key={i} className="checklist-item">
                                                <span className={`checklist-icon ${item.complete ? 'complete' : 'incomplete'}`}>
                                                    {item.complete ? '\u2713' : '\u2717'}
                                                </span>
                                                <span style={{ flex: 1 }}>{item.item}</span>
                                                <span className="tag">{item.source}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {missing.length > 0 && (
                                        <div style={{ marginTop: 20, padding: 14, background: 'rgba(255,184,0,0.1)', borderRadius: 8, border: '1px solid rgba(255,184,0,0.2)' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 8 }}>MISSING EVIDENCE</div>
                                            {missing.map((m, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0' }}>&bull; {m}</div>)}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <EmptyState icon="&#9989;" title="Generate a PA packet first" text="The checklist is created when you generate the PA packet" />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}

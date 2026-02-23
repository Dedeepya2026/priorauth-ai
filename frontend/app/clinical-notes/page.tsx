'use client';
import { useEffect, useState, useRef } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { LoadingState, EmptyState } from '@/components/LoadingState';

type FormErrors = Record<string, string>;

export default function ClinicalNotesPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selected, setSelected] = useState<any>(null);
    const [assisting, setAssisting] = useState(false);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const patientDropdownRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    const [form, setForm] = useState({ patient_id: '', note_type: 'SOAP', subjective: '', objective: '', assessment: '', plan: '' });

    const loadData = () => {
        Promise.all([api.listNotes(), api.listPatients()])
            .then(([n, p]) => { setNotes(n); setPatients(p); })
            .catch(err => showToast(err.message || 'Failed to load notes', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, []);

    // Close patient dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
                setShowPatientDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const validateForm = (): boolean => {
        const e: FormErrors = {};
        if (!form.patient_id) e.patient_id = 'Patient is required';
        if (!form.subjective?.trim() && !form.objective?.trim() && !form.assessment?.trim() && !form.plan?.trim()) {
            e.subjective = 'At least one section must be filled';
        }
        setFormErrors(e);
        return Object.keys(e).length === 0;
    };

    const clearFieldError = (field: string) => {
        if (formErrors[field]) setFormErrors(p => { const next = { ...p }; delete next[field]; return next; });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) { showToast('Please fix the form errors', 'warning'); return; }
        setCreating(true);
        try {
            const res = await api.createNote({ ...form, patient_id: Number(form.patient_id) });
            setShowCreate(false);
            setSelected(res);
            setForm({ patient_id: '', note_type: 'SOAP', subjective: '', objective: '', assessment: '', plan: '' });
            setPatientSearch('');
            setFormErrors({});
            showToast('Clinical note created successfully', 'success');
            loadData();
        } catch (err: any) {
            showToast(err.message || 'Failed to create note', 'error');
        }
        setCreating(false);
    };

    const handleAIAssist = async (noteId: number) => {
        setAssisting(true);
        try {
            const res = await api.aiAssist(noteId);
            setSelected(res);
            showToast('AI suggestions generated successfully', 'success');
            loadData();
        } catch (e: any) {
            showToast(e.message || 'AI assist failed', 'error');
        }
        setAssisting(false);
    };

    let suggestedCodes: any[] = [];
    try { suggestedCodes = JSON.parse(selected?.suggested_codes || '[]'); } catch { }
    let aiSuggestions: any[] = [];
    try { aiSuggestions = JSON.parse(selected?.ai_suggestions || '[]'); } catch { }

    // Filter patients based on search
    const filteredPatients = patients.filter(p => {
        const search = patientSearch.toLowerCase();
        return !search || `${p.first_name} ${p.last_name} ${p.mrn}`.toLowerCase().includes(search);
    });

    // Get selected patient name
    const selectedPatient = patients.find(p => String(p.id) === form.patient_id);
    const selectedPatientLabel = selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name} (${selectedPatient.mrn})` : '';

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Clinical Documentation Assistant</h1>
                    <p className="page-subtitle">AI-assisted SOAP/H&P note drafting with code suggestions</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Clinical Note</button>
            </div>

            <div className="page-body animate-fade">
                {loading ? (
                    <LoadingState type="skeleton-table" count={4} />
                ) : (
                    <div className="clinical-grid" style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
                        {/* Notes list */}
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">Clinical Notes</h3></div>
                            {notes.length === 0 ? (
                                <div className="card-body">
                                    <EmptyState icon="&#128221;" title="No clinical notes yet" text="Create a new note to get started" action={{ label: '+ New Note', onClick: () => setShowCreate(true) }} />
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead><tr><th>Patient</th><th>Type</th><th>Status</th><th className="hide-mobile">Created</th></tr></thead>
                                        <tbody>
                                            {notes.map(n => {
                                                const pt = patients.find(p => p.id === n.patient_id);
                                                return (
                                                    <tr key={n.id} className="clickable-row" onClick={() => setSelected(n)} style={{ background: selected?.id === n.id ? 'var(--bg-card-hover)' : '' }}>
                                                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{pt ? `${pt.first_name} ${pt.last_name}` : `Patient #${n.patient_id}`}</td>
                                                        <td><span className="tag">{n.note_type}</span></td>
                                                        <td><span className={`status-badge ${n.status}`}>{n.status}</span></td>
                                                        <td className="hide-mobile" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Note detail */}
                        {selected && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">Note Detail &mdash; {selected.note_type}</h3>
                                        <button className="btn btn-sm btn-primary" onClick={() => handleAIAssist(selected.id)} disabled={assisting}>
                                            {assisting ? <><span className="loading-spinner" /> Processing...</> : 'AI Assist'}
                                        </button>
                                    </div>
                                    <div className="card-body">
                                        {selected.full_note ? (
                                            <div className="doc-preview">{selected.full_note}</div>
                                        ) : (
                                            <EmptyState icon="&#129302;" title="Click AI Assist to generate note" />
                                        )}
                                    </div>
                                </div>

                                {/* Suggested Codes */}
                                {suggestedCodes.length > 0 && (
                                    <div className="card">
                                        <div className="card-header"><h3 className="card-title">Suggested Codes</h3></div>
                                        <div className="card-body">
                                            {suggestedCodes.map((c: any, i: number) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                                                    <span className="tag" style={{ background: c.type === 'CPT' ? 'rgba(0,102,255,0.15)' : 'rgba(0,212,170,0.15)', color: c.type === 'CPT' ? 'var(--primary)' : 'var(--accent)', borderColor: c.type === 'CPT' ? 'rgba(0,102,255,0.2)' : 'rgba(0,212,170,0.2)' }}>
                                                        {c.type}
                                                    </span>
                                                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{c.code}</span>
                                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Suggestions */}
                                {aiSuggestions.length > 0 && (
                                    <div className="card">
                                        <div className="card-header"><h3 className="card-title">AI Improvement Suggestions</h3></div>
                                        <div className="card-body">
                                            {aiSuggestions.map((s: any, i: number) => (
                                                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>{s.section}</div>
                                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.suggestion}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Create Note Modal ───────────────────────────── */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">New Clinical Note</h2>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreate} noValidate>
                            <div className="modal-body">
                                <div className="grid-2">
                                    <div className="form-group" ref={patientDropdownRef}>
                                        <label className="form-label">Patient <span className="form-required">*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className={`form-input ${formErrors.patient_id ? 'form-input-error' : ''}`}
                                                type="text"
                                                value={form.patient_id ? selectedPatientLabel : patientSearch}
                                                onChange={e => {
                                                    setPatientSearch(e.target.value);
                                                    setForm({ ...form, patient_id: '' });
                                                    setShowPatientDropdown(true);
                                                    clearFieldError('patient_id');
                                                }}
                                                onFocus={() => setShowPatientDropdown(true)}
                                                placeholder="Type to search patients..."
                                                autoComplete="off"
                                            />
                                            {showPatientDropdown && (
                                                <div className="patient-dropdown">
                                                    {filteredPatients.length === 0 ? (
                                                        <div className="patient-dropdown-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                                                            No patients found
                                                        </div>
                                                    ) : (
                                                        filteredPatients.map(p => (
                                                            <div
                                                                key={p.id}
                                                                className={`patient-dropdown-item ${String(p.id) === form.patient_id ? 'selected' : ''}`}
                                                                onClick={() => {
                                                                    setForm({ ...form, patient_id: String(p.id) });
                                                                    setPatientSearch('');
                                                                    setShowPatientDropdown(false);
                                                                    clearFieldError('patient_id');
                                                                }}
                                                            >
                                                                <span style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</span>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>MRN: {p.mrn}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {formErrors.patient_id && <span className="form-error">{formErrors.patient_id}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Note Type</label>
                                        <select className="form-select" value={form.note_type} onChange={e => setForm({ ...form, note_type: e.target.value })}>
                                            <option value="SOAP">SOAP Note</option>
                                            <option value="H&P">History & Physical</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subjective / Chief Complaint <span className="form-required">*</span></label>
                                    <textarea className={`form-textarea ${formErrors.subjective ? 'form-input-error' : ''}`} value={form.subjective}
                                        onChange={e => { setForm({ ...form, subjective: e.target.value }); clearFieldError('subjective'); }}
                                        placeholder="Patient reports..." rows={3} />
                                    {formErrors.subjective && <span className="form-error">{formErrors.subjective}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Objective / Physical Exam</label>
                                    <textarea className="form-textarea" value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })}
                                        placeholder="Vitals, exam findings..." rows={3} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Assessment</label>
                                    <textarea className="form-textarea" value={form.assessment} onChange={e => setForm({ ...form, assessment: e.target.value })}
                                        placeholder="Diagnosis, clinical impression..." rows={3} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Plan</label>
                                    <textarea className="form-textarea" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}
                                        placeholder="Treatment plan, follow-up..." rows={3} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? <><span className="loading-spinner" /> Creating...</> : 'Create & Get AI Suggestions'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

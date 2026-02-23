'use client';
import { useEffect, useState, useRef } from 'react';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { LoadingState, EmptyState } from '@/components/LoadingState';

type FormErrors = Record<string, string>;

export default function PAWorkbench() {
    const [paRequests, setPARequests] = useState<any[]>([]);
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadTarget, setUploadTarget] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [filter, setFilter] = useState('');
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [generatingId, setGeneratingId] = useState<number | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const patientDropdownRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const [form, setForm] = useState({
        patient_id: '',
        patient_name: '', // free text patient name
        procedure_code: '',
        procedure_name: '',
        diagnosis_code: '',
        diagnosis_name: '',
        payer_name: '',
        priority: 'standard',
        clinical_rationale: ''
    });

    const loadData = () => {
        Promise.all([api.listPARequests(filter || undefined), api.listPatients()])
            .then(([pas, pts]) => { setPARequests(pas); setPatients(pts); })
            .catch(err => showToast(err.message || 'Failed to load PA requests', 'error'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [filter]);

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

    // ── Form validation ──────────────────────────────────
    const validateForm = (): boolean => {
        const e: FormErrors = {};
        // Either patient_id (selected existing) or patient_name (free text) required
        if (!form.patient_id && !form.patient_name.trim()) e.patient_name = 'Patient name is required';
        if (!form.procedure_code.trim()) e.procedure_code = 'Procedure code is required';
        else if (form.procedure_code.trim().length > 20) e.procedure_code = 'Must be under 20 characters';
        if (!form.procedure_name.trim()) e.procedure_name = 'Procedure name is required';
        if (!form.diagnosis_code.trim()) e.diagnosis_code = 'Diagnosis code is required';
        else if (form.diagnosis_code.trim().length > 20) e.diagnosis_code = 'Must be under 20 characters';
        if (!form.payer_name.trim()) e.payer_name = 'Payer name is required';
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
            let patientId = form.patient_id ? Number(form.patient_id) : null;

            // If no existing patient selected, create one from the typed name
            if (!patientId && form.patient_name.trim()) {
                const nameParts = form.patient_name.trim().split(/\s+/);
                const firstName = nameParts[0] || form.patient_name.trim();
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

                const newPatient = await api.quickCreatePatient(firstName, lastName, form.payer_name.trim() || undefined);
                patientId = newPatient.id;
            }

            if (!patientId) {
                showToast('Could not create patient', 'error');
                setCreating(false);
                return;
            }

            await api.createPARequest({
                patient_id: patientId,
                procedure_code: form.procedure_code,
                procedure_name: form.procedure_name,
                diagnosis_code: form.diagnosis_code,
                diagnosis_name: form.diagnosis_name,
                payer_name: form.payer_name,
                priority: form.priority,
                clinical_rationale: form.clinical_rationale,
            });
            setShowCreate(false);
            setForm({ patient_id: '', patient_name: '', procedure_code: '', procedure_name: '', diagnosis_code: '', diagnosis_name: '', payer_name: '', priority: 'standard', clinical_rationale: '' });
            setPatientSearch('');
            setFormErrors({});
            showToast('PA Request created successfully', 'success');
            loadData();
        } catch (err: any) {
            showToast(err.message || 'Failed to create PA request', 'error');
        }
        setCreating(false);
    };

    const handleUpload = async (file: File) => {
        if (!file) return;
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) { showToast('File size must be under 10MB', 'warning'); return; }
        const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
        if (!allowed.includes(file.type)) { showToast('Only PDF, PNG, JPG, and TIFF files are accepted', 'warning'); return; }
        setUploading(true);
        try {
            await api.uploadDocument(file, uploadTarget || undefined);
            setShowUpload(false);
            setUploadTarget(null);
            showToast(`${file.name} uploaded successfully`, 'success');
            loadData();
        } catch (err: any) {
            showToast(err.message || 'Upload failed', 'error');
        }
        setUploading(false);
    };

    const handleGenerate = async (id: number) => {
        setGeneratingId(id);
        try {
            await api.generatePacket(id);
            showToast('PA packet generated successfully', 'success');
            loadData();
        } catch (err: any) {
            showToast(err.message || 'Failed to generate packet', 'error');
        }
        setGeneratingId(null);
    };

    const handleStatusUpdate = async (id: number, newStatus: string) => {
        setUpdatingId(id);
        try {
            await api.updatePARequest(id, { status: newStatus });
            const label = newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            showToast(`Status updated to ${label}`, 'success');
            loadData();
        } catch (err: any) {
            showToast(err.message || 'Failed to update status', 'error');
        }
        setUpdatingId(null);
    };

    const statusLabel = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const statuses = ['', 'draft', 'pending_review', 'submitted', 'approved', 'denied'];

    // Filter patients based on search
    const filteredPatients = patients.filter(p => {
        const search = patientSearch.toLowerCase();
        return !search || `${p.first_name} ${p.last_name} ${p.mrn}`.toLowerCase().includes(search);
    });

    // Get selected patient name
    const selectedPatient = patients.find(p => String(p.id) === form.patient_id);
    const selectedPatientLabel = selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name} (${selectedPatient.mrn})` : '';

    // Display value for patient field:
    // - If a patient is selected from dropdown, show their label
    // - Otherwise show the free-text name the user typed
    const patientDisplayValue = form.patient_id ? selectedPatientLabel : (form.patient_name || patientSearch);

    // Get the next action button for a given status
    const getActionButton = (pa: any) => {
        const isUpdating = updatingId === pa.id;
        const isGenerating = generatingId === pa.id;

        switch (pa.status) {
            case 'draft':
                return (
                    <>
                        <button className="btn btn-sm btn-primary" onClick={() => handleGenerate(pa.id)} disabled={isGenerating}>
                            {isGenerating ? 'Gen...' : 'Generate'}
                        </button>
                        <button className="btn btn-sm btn-success" onClick={() => handleStatusUpdate(pa.id, 'submitted')} disabled={isUpdating}>
                            {isUpdating ? '...' : '✓ Complete'}
                        </button>
                    </>
                );
            case 'pending_review':
                return (
                    <button className="btn btn-sm btn-success" onClick={() => handleStatusUpdate(pa.id, 'submitted')} disabled={isUpdating}>
                        {isUpdating ? '...' : '✓ Submit'}
                    </button>
                );
            case 'submitted':
                return (
                    <>
                        <button className="btn btn-sm btn-success" onClick={() => handleStatusUpdate(pa.id, 'approved')} disabled={isUpdating}>
                            {isUpdating ? '...' : '✓ Approve'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleStatusUpdate(pa.id, 'denied')} disabled={isUpdating}>
                            {isUpdating ? '...' : '✗ Deny'}
                        </button>
                    </>
                );
            case 'denied':
            case 'appeal_denied':
                return (
                    <button className="btn btn-sm btn-secondary" onClick={() => window.location.href = `/pa-requests/${pa.id}`}>
                        Appeal
                    </button>
                );
            default:
                return null;
        }
    };

    return (
        <AppShell>
            <div className="page-header">
                <div>
                    <h1 className="page-title">PA Workbench</h1>
                    <p className="page-subtitle">Manage prior authorization requests, upload documents, and generate packets</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={() => { setShowUpload(true); setUploadTarget(null); }}>Upload Document</button>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New PA Request</button>
                </div>
            </div>

            <div className="page-body animate-fade">
                <div className="actions-row">
                    {statuses.map(s => (
                        <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
                            {s ? statusLabel(s) : 'All'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <LoadingState type="skeleton-table" count={6} />
                ) : paRequests.length === 0 ? (
                    <div className="card"><div className="card-body">
                        <EmptyState icon="&#128203;" title="No PA requests found" text="Create a new PA request to get started" action={{ label: '+ New PA Request', onClick: () => setShowCreate(true) }} />
                    </div></div>
                ) : (
                    <div className="card">
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Reference</th><th>Patient</th><th>Procedure</th><th>Payer</th><th className="hide-mobile">Priority</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {paRequests.map(pa => (
                                        <tr key={pa.id} className="clickable-row">
                                            <td style={{ fontWeight: 600, color: 'var(--primary)' }} onClick={() => window.location.href = `/pa-requests/${pa.id}`}>{pa.reference_number}</td>
                                            <td>{pa.patient ? `${pa.patient.first_name} ${pa.patient.last_name}` : `Patient #${pa.patient_id}`}</td>
                                            <td><span style={{ color: 'var(--text)' }}>{pa.procedure_code}</span><br /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pa.procedure_name}</span></td>
                                            <td>{pa.payer_name}</td>
                                            <td className="hide-mobile"><span className={`status-badge ${pa.priority}`}>{pa.priority}</span></td>
                                            <td><span className={`status-badge ${pa.status}`}>{statusLabel(pa.status)}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <button className="btn btn-sm btn-secondary" onClick={() => window.location.href = `/pa-requests/${pa.id}`}>View</button>
                                                    {getActionButton(pa)}
                                                    <button className="btn btn-sm btn-secondary" onClick={() => { setUploadTarget(pa.id); setShowUpload(true); }}>Upload</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create PA Modal ─────────────────────────────── */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">New PA Request</h2>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreate} noValidate>
                            <div className="modal-body">
                                <div className="grid-2">
                                    <div className="form-group" ref={patientDropdownRef}>
                                        <label className="form-label">Patient <span className="form-required">*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className={`form-input ${formErrors.patient_name ? 'form-input-error' : ''}`}
                                                type="text"
                                                value={patientDisplayValue}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setPatientSearch(val);
                                                    setForm({ ...form, patient_id: '', patient_name: val });
                                                    setShowPatientDropdown(true);
                                                    clearFieldError('patient_name');
                                                }}
                                                onFocus={() => setShowPatientDropdown(true)}
                                                placeholder="Type patient name (e.g. Siri, John Smith)..."
                                                autoComplete="off"
                                            />
                                            {showPatientDropdown && (
                                                <div className="patient-dropdown">
                                                    {filteredPatients.length > 0 && (
                                                        <>
                                                            <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border)' }}>
                                                                Existing Patients
                                                            </div>
                                                            {filteredPatients.map(p => (
                                                                <div
                                                                    key={p.id}
                                                                    className={`patient-dropdown-item ${String(p.id) === form.patient_id ? 'selected' : ''}`}
                                                                    onClick={() => {
                                                                        setForm({ ...form, patient_id: String(p.id), patient_name: `${p.first_name} ${p.last_name}` });
                                                                        setPatientSearch('');
                                                                        setShowPatientDropdown(false);
                                                                        clearFieldError('patient_name');
                                                                    }}
                                                                >
                                                                    <span style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</span>
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>MRN: {p.mrn}</span>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                    {patientSearch.trim() && (
                                                        <div
                                                            className="patient-dropdown-item"
                                                            style={{ color: 'var(--primary)', fontWeight: 600, borderTop: filteredPatients.length > 0 ? '1px solid var(--border)' : 'none' }}
                                                            onClick={() => {
                                                                setForm({ ...form, patient_id: '', patient_name: patientSearch.trim() });
                                                                setShowPatientDropdown(false);
                                                                clearFieldError('patient_name');
                                                            }}
                                                        >
                                                            ➕ Create new patient: &quot;{patientSearch.trim()}&quot;
                                                        </div>
                                                    )}
                                                    {filteredPatients.length === 0 && !patientSearch.trim() && (
                                                        <div className="patient-dropdown-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                                                            Start typing to search or create a patient
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {form.patient_name && !form.patient_id && (
                                            <span style={{ fontSize: 11, color: 'var(--info)', marginTop: 4, display: 'block' }}>
                                                ✨ New patient &quot;{form.patient_name}&quot; will be created automatically
                                            </span>
                                        )}
                                        {formErrors.patient_name && <span className="form-error">{formErrors.patient_name}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Payer <span className="form-required">*</span></label>
                                        <input className={`form-input ${formErrors.payer_name ? 'form-input-error' : ''}`} value={form.payer_name}
                                            onChange={e => { setForm({ ...form, payer_name: e.target.value }); clearFieldError('payer_name'); }}
                                            placeholder="e.g. Blue Cross Blue Shield" required />
                                        {formErrors.payer_name && <span className="form-error">{formErrors.payer_name}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Procedure Code (CPT) <span className="form-required">*</span></label>
                                        <input className={`form-input ${formErrors.procedure_code ? 'form-input-error' : ''}`} value={form.procedure_code}
                                            onChange={e => { setForm({ ...form, procedure_code: e.target.value }); clearFieldError('procedure_code'); }}
                                            placeholder="e.g. 27447" required maxLength={20} />
                                        {formErrors.procedure_code && <span className="form-error">{formErrors.procedure_code}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Procedure Name <span className="form-required">*</span></label>
                                        <input className={`form-input ${formErrors.procedure_name ? 'form-input-error' : ''}`} value={form.procedure_name}
                                            onChange={e => { setForm({ ...form, procedure_name: e.target.value }); clearFieldError('procedure_name'); }}
                                            placeholder="e.g. Total Knee Arthroplasty" required />
                                        {formErrors.procedure_name && <span className="form-error">{formErrors.procedure_name}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Diagnosis Code (ICD-10) <span className="form-required">*</span></label>
                                        <input className={`form-input ${formErrors.diagnosis_code ? 'form-input-error' : ''}`} value={form.diagnosis_code}
                                            onChange={e => { setForm({ ...form, diagnosis_code: e.target.value }); clearFieldError('diagnosis_code'); }}
                                            placeholder="e.g. M17.11" required maxLength={20} />
                                        {formErrors.diagnosis_code && <span className="form-error">{formErrors.diagnosis_code}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Diagnosis Name</label>
                                        <input className="form-input" value={form.diagnosis_name} onChange={e => setForm({ ...form, diagnosis_name: e.target.value })}
                                            placeholder="e.g. Primary osteoarthritis, right knee" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        <option value="standard">Standard</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Clinical Rationale</label>
                                    <textarea className="form-textarea" value={form.clinical_rationale} onChange={e => setForm({ ...form, clinical_rationale: e.target.value })}
                                        placeholder="Describe the medical necessity and clinical rationale..." rows={4} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? <><span className="loading-spinner" /> Creating...</> : 'Create PA Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Upload Modal ────────────────────────────────── */}
            {showUpload && (
                <div className="modal-overlay" onClick={() => setShowUpload(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Upload Document</h2>
                            <button className="modal-close" onClick={() => setShowUpload(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {uploadTarget && <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>Attaching to PA Request #{uploadTarget}</p>}
                            <div className="file-upload-zone" onClick={() => fileRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
                                onDragLeave={e => e.currentTarget.classList.remove('dragging')}
                                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('dragging'); if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); }}>
                                <div className="file-upload-icon">&#128196;</div>
                                <div className="file-upload-text">{uploading ? 'Uploading...' : 'Click or drag & drop to upload'}</div>
                                <div className="file-upload-subtext">PDF, PNG, JPG, TIFF &middot; Max 10MB</div>
                                <input ref={fileRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.tiff" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

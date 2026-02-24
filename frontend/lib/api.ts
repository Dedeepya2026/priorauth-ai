const API_BASE = '/api';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

export function setToken(token: string) {
    localStorage.setItem('token', token);
}

export function clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

export function setUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
}

export function getUser(): any {
    if (typeof window === 'undefined') return null;
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
}

async function request(path: string, options: RequestInit = {}) {
    const token = getToken();
    const headers: any = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    // Ensure trailing slash to prevent FastAPI 307 redirects that drop auth headers
    let normalizedPath = path;
    const qIdx = normalizedPath.indexOf('?');
    if (qIdx === -1) {
        if (!normalizedPath.endsWith('/')) normalizedPath += '/';
    } else {
        const basePath = normalizedPath.substring(0, qIdx);
        const query = normalizedPath.substring(qIdx);
        if (!basePath.endsWith('/')) normalizedPath = basePath + '/' + query;
    }
    const res = await fetch(`${API_BASE}${normalizedPath}`, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        clearToken();
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

export const api = {
    // Auth
    login: (email: string, password: string) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data: any) =>
        request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),

    // Documents
    uploadDocument: (file: File, paRequestId?: number) => {
        const fd = new FormData();
        fd.append('file', file);
        if (paRequestId) fd.append('pa_request_id', String(paRequestId));
        return request('/documents/upload', { method: 'POST', body: fd });
    },
    listDocuments: (paRequestId?: number) =>
        request(`/documents/${paRequestId ? `?pa_request_id=${paRequestId}` : ''}`),
    getDocument: (id: number) => request(`/documents/${id}`),

    // PA Requests
    createPARequest: (data: any) =>
        request('/pa-requests/', { method: 'POST', body: JSON.stringify(data) }),
    listPARequests: (status?: string) =>
        request(`/pa-requests/${status ? `?status=${status}` : ''}`, { redirect: 'follow' as RequestRedirect }),
    getPARequest: (id: number) => request(`/pa-requests/${id}`),
    updatePARequest: (id: number, data: any) =>
        request(`/pa-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    generatePacket: (id: number) =>
        request(`/pa-requests/${id}/generate-packet`, { method: 'POST' }),
    generateAppeal: (id: number) =>
        request(`/pa-requests/${id}/generate-appeal`, { method: 'POST' }),

    // Patients
    createPatient: (data: any) =>
        request('/pa-requests/patients', { method: 'POST', body: JSON.stringify(data) }),
    listPatients: () => request('/pa-requests/patients'),
    quickCreatePatient: (first_name: string, last_name: string, payer_name?: string) =>
        request('/pa-requests/patients/quick-create', { method: 'POST', body: JSON.stringify({ first_name, last_name, payer_name }) }),

    // Clinical Notes
    createNote: (data: any) =>
        request('/clinical-notes/', { method: 'POST', body: JSON.stringify(data) }),
    listNotes: () => request('/clinical-notes/'),
    getNote: (id: number) => request(`/clinical-notes/${id}`),
    updateNote: (id: number, data: any) =>
        request(`/clinical-notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    aiAssist: (id: number) =>
        request(`/clinical-notes/${id}/ai-assist`, { method: 'POST' }),

    // Analytics
    analytics: () => request('/analytics/overview'),
};

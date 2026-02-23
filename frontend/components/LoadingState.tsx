'use client';

interface LoadingStateProps {
    type?: 'spinner' | 'skeleton-cards' | 'skeleton-table' | 'page';
    count?: number;
    message?: string;
}

export function LoadingSpinner({ size = 20, color }: { size?: number; color?: string }) {
    return (
        <span style={{
            display: 'inline-block', width: size, height: size,
            border: `2px solid ${color || 'var(--border)'}`,
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
        }} />
    );
}

export function LoadingState({ type = 'spinner', count = 4, message }: LoadingStateProps) {
    if (type === 'spinner') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
                <LoadingSpinner size={32} />
                {message && <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{message}</span>}
            </div>
        );
    }

    if (type === 'skeleton-cards') {
        return (
            <div className="kpi-grid">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="kpi-card skeleton" style={{ height: 120 }} />
                ))}
            </div>
        );
    }

    if (type === 'skeleton-table') {
        return (
            <div className="card">
                <div className="card-body">
                    {Array.from({ length: count }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 8 }} />
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'page') {
        return (
            <div style={{ padding: 28 }}>
                <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 16 }} />
                <div className="kpi-grid">
                    {Array.from({ length: count }).map((_, i) => (
                        <div key={i} className="kpi-card skeleton" style={{ height: 120 }} />
                    ))}
                </div>
                <div className="skeleton" style={{ height: 300, marginTop: 20 }} />
            </div>
        );
    }

    return null;
}

export function EmptyState({ icon = '-', title, text, action }: {
    icon?: string; title: string; text?: string;
    action?: { label: string; onClick: () => void };
}) {
    return (
        <div className="empty-state">
            <div className="empty-icon">{icon}</div>
            <div className="empty-title">{title}</div>
            {text && <div className="empty-text">{text}</div>}
            {action && (
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    );
}

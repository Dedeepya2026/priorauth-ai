'use client';
import { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: '60vh', padding: 40, textAlign: 'center',
                }}>
                    <div>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;</div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F0F2F8', marginBottom: 8 }}>
                            Something went wrong
                        </h2>
                        <p style={{ fontSize: 14, color: '#8892B0', marginBottom: 20, maxWidth: 400 }}>
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                            style={{
                                background: 'linear-gradient(135deg, #0066FF, #0052CC)',
                                color: 'white', padding: '10px 24px', borderRadius: 8,
                                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                            }}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

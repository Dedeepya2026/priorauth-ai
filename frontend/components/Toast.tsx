'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } });
export const useToast = () => useContext(ToastContext);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    const icons: Record<ToastType, string> = {
        success: '\u2713',
        error: '\u2717',
        warning: '!',
        info: 'i',
    };

    const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
        success: { bg: 'rgba(0,196,140,0.12)', border: 'rgba(0,196,140,0.3)', icon: '#00C48C' },
        error: { bg: 'rgba(255,71,87,0.12)', border: 'rgba(255,71,87,0.3)', icon: '#FF4757' },
        warning: { bg: 'rgba(255,184,0,0.12)', border: 'rgba(255,184,0,0.3)', icon: '#FFB800' },
        info: { bg: 'rgba(84,160,255,0.12)', border: 'rgba(84,160,255,0.3)', icon: '#54A0FF' },
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed', top: 20, right: 20, zIndex: 9999,
                display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400,
            }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        background: colors[t.type].bg,
                        border: `1px solid ${colors[t.type].border}`,
                        backdropFilter: 'blur(12px)',
                        borderRadius: 10,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        animation: 'slideUp 0.3s ease, fadeIn 0.3s ease',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                    }} onClick={() => dismiss(t.id)}>
                        <span style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: colors[t.type].icon,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0,
                        }}>
                            {icons[t.type]}
                        </span>
                        <span style={{ fontSize: 13, color: '#F0F2F8', fontWeight: 500, lineHeight: 1.4 }}>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

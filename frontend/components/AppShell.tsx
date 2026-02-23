'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, clearToken } from '@/lib/api';
import Link from 'next/link';

const navItems = [
    {
        section: 'Overview', items: [
            { path: '/', label: 'Dashboard', icon: '📊' },
        ]
    },
    {
        section: 'Authorizations', items: [
            { path: '/pa-workbench', label: 'PA Workbench', icon: '📋' },
        ]
    },
    {
        section: 'Clinical', items: [
            { path: '/clinical-notes', label: 'Documentation Assistant', icon: '📝' },
        ]
    },
    {
        section: 'Insights', items: [
            { path: '/analytics', label: 'Denial Analytics', icon: '📈' },
        ]
    },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUserState] = useState<any>(null);
    const [mounted, setMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        const u = getUser();
        if (!u) {
            router.push('/login');
            return;
        }
        setUserState(u);
    }, []);

    // Close sidebar on navigation (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        clearToken();
        router.push('/login');
    };

    if (!mounted || !user) return null;

    const initials = user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??';
    const roleLabel = user.role?.replace(/_/g, ' ');

    return (
        <div className="app-layout">
            {/* Mobile backdrop */}
            {sidebarOpen && <div className="sidebar-backdrop visible" onClick={() => setSidebarOpen(false)} />}

            {/* Mobile toggle */}
            <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu"
                style={{ position: 'fixed', top: 16, left: 16, zIndex: 201 }}>
                {sidebarOpen ? '\u2715' : '\u2630'}
            </button>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="logo-icon">PA</div>
                        <div>
                            <h1>PriorAuth AI</h1>
                            <span>Healthcare Platform</span>
                        </div>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(section => (
                        <div key={section.section} className="nav-section">
                            <div className="nav-section-title">{section.section}</div>
                            {section.items.map(item => (
                                <Link key={item.path} href={item.path}
                                    className={`nav-link ${pathname === item.path ? 'active' : ''}`}>
                                    <span className="nav-icon">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-card">
                        <div className="user-avatar">{initials}</div>
                        <div className="user-info">
                            <div className="user-name">{user.full_name}</div>
                            <div className="user-role">{roleLabel}</div>
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 10, justifyContent: 'center' }} onClick={handleLogout}>
                        Sign Out
                    </button>
                </div>
            </aside>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}

'use client';
import { useState } from 'react';
import { api, setToken, setUser } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

const demoAccounts = [
    { role: 'Nurse Coordinator', email: 'nurse@clinic.com', password: 'password123' },
    { role: 'Provider', email: 'doctor@clinic.com', password: 'password123' },
    { role: 'Manager', email: 'manager@clinic.com', password: 'password123' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const router = useRouter();
    const { showToast } = useToast();

    const validate = (em?: string, pw?: string): boolean => {
        const e: typeof errors = {};
        const emailVal = em || email;
        const pwVal = pw || password;
        if (!emailVal.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) e.email = 'Invalid email format';
        if (!pwVal) e.password = 'Password is required';
        else if (pwVal.length < 6) e.password = 'Password must be at least 6 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleLogin = async (e?: React.FormEvent, em?: string, pw?: string) => {
        if (e) e.preventDefault();
        if (!validate(em, pw)) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.login(em || email, pw || password);
            setToken(res.access_token);
            setUser(res.user);
            showToast(`Welcome back, ${res.user.full_name}!`, 'success');
            router.push('/');
        } catch (err: any) {
            const msg = err.message || 'Login failed. Please check your credentials.';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container animate-slide">
                <div className="login-brand">
                    <div className="logo-icon">PA</div>
                    <h1>PriorAuth AI</h1>
                    <p>Clinical Documentation & PA Platform</p>
                </div>
                <div className="login-card">
                    {error && <div className="error-msg">{error}</div>}
                    <form onSubmit={handleLogin} noValidate>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                                type="email" value={email}
                                onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
                                placeholder="Enter your email" required
                            />
                            {errors.email && <span className="form-error">{errors.email}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                                type="password" value={password}
                                onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
                                placeholder="Enter your password" required
                            />
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={loading}>
                            {loading ? <><span className="loading-spinner"></span> Signing in...</> : 'Sign In'}
                        </button>
                    </form>
                    <div className="demo-accounts">
                        <h3>Demo Accounts</h3>
                        {demoAccounts.map(acc => (
                            <div key={acc.email} className="demo-account">
                                <span className="demo-account-role">{acc.role}</span>
                                <span className="demo-account-email">{acc.email}</span>
                                <button onClick={() => { setEmail(acc.email); setPassword(acc.password); handleLogin(undefined, acc.email, acc.password); }}>
                                    Quick Login
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

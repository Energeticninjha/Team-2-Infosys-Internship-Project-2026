import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Rocket, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Login = ({ updateToken, setRole }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:8083/api/auth/login', { email, password });
            const data = response.data;

            if (data.token) {
                const normalizedRole = data.role.toLowerCase();
                sessionStorage.setItem('role', normalizedRole);
                sessionStorage.setItem('userId', data.id);
                sessionStorage.setItem('name', data.name || '');
                sessionStorage.setItem('email', data.email || '');
                setRole(normalizedRole);
                updateToken(data.token);
                navigate(`/${normalizedRole}-dashboard`);
            } else {
                setError("Login failed: No token received");
            }
        } catch (err) {
            console.error(err);
            setError("Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center position-relative" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', transition: 'background-color 0.3s' }}>

            {/* Back Button */}
            <div className="position-absolute top-0 start-0 p-4">
                <button onClick={() => navigate('/')} className="btn btn-link text-decoration-none d-flex align-items-center gap-2 hover-opacity-75" style={{ color: 'var(--text-main)' }}>
                    <ArrowLeft size={20} /> Back to Home
                </button>
            </div>

            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-5 col-lg-4">
                        <div className="text-center mb-4">
                            <div className="bg-primary bg-gradient rounded-3 p-3 d-inline-flex align-items-center justify-content-center mb-3 shadow-lg">
                                <Rocket className="text-white" size={32} />
                            </div>
                            <h3 className="fw-bold">Welcome Back</h3>
                            <p className="text-muted">Sign in to your dashboard</p>
                        </div>

                        <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
                            <div className="card-body p-4 p-md-5">
                                {error && (
                                    <div className="alert alert-danger border-0 bg-danger bg-opacity-25 text-danger-emphasis mb-4 small">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleLogin}>
                                    <div className="mb-4">
                                        <label className="form-label small fw-bold text-muted">Email Address</label>
                                        <div className="input-group">
                                            <span className="input-group-text border-end-0" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}><Mail size={18} /></span>
                                            <input
                                                type="email"
                                                className="form-control ps-0 focus-ring-primary"
                                                placeholder="name@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                style={{ boxShadow: 'none', backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)', borderLeft: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label small fw-bold text-muted">Password</label>
                                        <div className="input-group">
                                            <span className="input-group-text border-end-0" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}><Lock size={18} /></span>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control ps-0"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                style={{ boxShadow: 'none', backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)', borderLeft: 'none', borderRight: 'none' }}
                                            />
                                            <button
                                                className="btn border border-start-0"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 py-3 fw-bold shadow-lg hover-elevate transition-all"
                                        disabled={loading}
                                    >
                                        {loading ? 'Signing in...' : 'Sign In'}
                                    </button>
                                </form>

                                <div className="text-center mt-4 pt-3 border-top" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <small className="text-muted">
                                        Don't have an account? <span className="text-primary fw-bold cursor-pointer" style={{ cursor: 'pointer' }} onClick={() => navigate('/register')}>Register Now</span>
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

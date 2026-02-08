import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Rocket, Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';

const Register = ({ updateToken, setRole }) => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = { ...formData, role: selectedRole.toUpperCase() };
            const response = await axios.post('http://localhost:8083/api/auth/register', payload);

            if (response.status === 200 || response.data) {
                alert("Registration Successful! Please Login.");
                navigate('/login');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Registration failed. Email might already exist.");
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
                    <div className="col-md-6 col-lg-5">
                        <div className="text-center mb-4">
                            <h3 className="fw-bold">Join NeuroFleetX</h3>
                            <p className="text-muted">Create your account to get started</p>
                        </div>

                        <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}>
                            <div className="card-body p-4 p-md-5">
                                {error && (
                                    <div className="alert alert-danger border-0 bg-danger bg-opacity-25 text-danger-emphasis mb-4 small">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleRegister}>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Full Name</label>
                                        <div className="input-group">
                                            <span className="input-group-text border-end-0" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}><User size={18} /></span>
                                            <input
                                                type="text"
                                                className="form-control ps-0"
                                                placeholder="John Doe"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                style={{ boxShadow: 'none', backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)', borderLeft: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-muted">Email Address</label>
                                        <div className="input-group">
                                            <span className="input-group-text border-end-0" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}><Mail size={18} /></span>
                                            <input
                                                type="email"
                                                className="form-control ps-0"
                                                placeholder="john@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                                    <div className="mb-4">
                                        <label className="form-label small fw-bold mb-3 d-block text-muted">Select Role</label>
                                        <div className="d-grid grid-cols-2 gap-2 d-md-flex justify-content-between">
                                            {['customer', 'driver', 'manager', 'admin'].map((role) => (
                                                <div
                                                    key={role}
                                                    className={`card border cursor-pointer transition-all text-center p-2 flex-fill ${selectedRole === role ? 'bg-primary border-primary text-white' : 'hover-bg-opacity-25'}`}
                                                    onClick={() => setSelectedRole(role)}
                                                    style={{
                                                        minWidth: '80px',
                                                        backgroundColor: selectedRole === role ? 'var(--primary)' : 'var(--bg-app)',
                                                        borderColor: selectedRole === role ? 'var(--primary)' : 'var(--border-subtle)',
                                                        color: selectedRole === role ? '#fff' : 'var(--text-muted)'
                                                    }}
                                                >
                                                    <small className="fw-bold text-capitalize">{role}</small>
                                                </div>
                                            ))}
                                        </div>
                                        {!selectedRole && <div className="text-warning x-small mt-2"><small>⚠️ Please select a role to continue</small></div>}
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-success w-100 py-3 fw-bold shadow-lg hover-elevate transition-all border-0"
                                        disabled={!selectedRole || loading}
                                        style={{ background: 'linear-gradient(to right, #10b981, #059669)' }}
                                    >
                                        {loading ? 'Creating Account...' : 'Create Account'}
                                    </button>
                                </form>

                                <div className="text-center mt-4 pt-3 border-top" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <small className="text-muted">
                                        Already have an account? <span className="text-primary fw-bold cursor-pointer" style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span>
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

export default Register;

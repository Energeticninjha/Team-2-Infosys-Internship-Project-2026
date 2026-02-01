import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

        const payload = {
            ...formData,
            role: selectedRole.toUpperCase()
        };

        try {
            const response = await axios.post('http://localhost:8080/api/auth/register', payload);
            const data = response.data;

            if (data.token) {
                const normalizedRole = data.role.toLowerCase();

                localStorage.setItem('role', normalizedRole);
                localStorage.setItem('userId', data.id);
                localStorage.setItem('name', formData.name || '');
                setRole(normalizedRole);

                updateToken(data.token);

                // Backend usually creates the user and returns the role
                navigate(`/${normalizedRole}-dashboard`);
            } else {
                setError("Registration failed: No token received");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Registration failed. Email might already exist.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card shadow border-0">
                        <div className="card-body p-5">
                            <h2 className="text-center mb-4 text-primary">🚗 NeuroFleetX</h2>
                            <h4 className="text-center mb-4 text-secondary">Join the Fleet</h4>

                            {error && <div className="alert alert-danger">{error}</div>}

                            <form onSubmit={handleRegister}>
                                <div className="mb-3">
                                    <label className="form-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Password</label>
                                    <div className="input-group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control"
                                            placeholder="Choose a strong password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                        />
                                        <button
                                            className="btn btn-outline-secondary"
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label fw-bold">Register As</label>
                                    <div className="row g-2">
                                        <div className="col-4">
                                            <button
                                                type="button"
                                                className={`btn w-100 p-3 d-flex flex-column align-items-center ${selectedRole === 'manager' ? 'btn-warning' : 'btn-outline-warning'}`}
                                                onClick={() => setSelectedRole('manager')}
                                            >
                                                <span className="fs-3">👨‍💼</span>
                                                <span className="small fw-bold">Manager</span>
                                            </button>
                                        </div>
                                        <div className="col-4">
                                            <button
                                                type="button"
                                                className={`btn w-100 p-3 d-flex flex-column align-items-center ${selectedRole === 'customer' ? 'btn-info' : 'btn-outline-info'}`}
                                                onClick={() => setSelectedRole('customer')}
                                            >
                                                <span className="fs-3">👤</span>
                                                <span className="small fw-bold">Customer</span>
                                            </button>
                                        </div>
                                        <div className="col-4">
                                            <button
                                                type="button"
                                                className={`btn w-100 p-3 d-flex flex-column align-items-center ${selectedRole === 'driver' ? 'btn-success' : 'btn-outline-success'}`}
                                                onClick={() => setSelectedRole('driver')}
                                            >
                                                <span className="fs-3">🚗</span>
                                                <span className="small fw-bold">Driver</span>
                                            </button>
                                        </div>
                                    </div>
                                    {!selectedRole && <div className="text-danger small mt-2 text-center">⚠️ Select a role to continue</div>}
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-success w-100 py-2 fw-bold"
                                    disabled={!selectedRole || loading}
                                >
                                    {loading ? 'Creating Account...' : `Register as ${selectedRole.toUpperCase()}`}
                                </button>
                            </form>
                            <div className="text-center mt-3">
                                <small>
                                    Already have an account? <span className="text-primary pointer" style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>Login</span>
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

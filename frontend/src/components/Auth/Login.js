import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = ({ updateToken, setRole }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await axios.post('http://localhost:8080/api/auth/login', {
                email,
                password
            });

            // Assuming Backend returns: { token: "jwt...", role: "ADMIN", name: "..." }
            const data = response.data;

            if (data.token) {
                // 1. Save Role & Token
                const normalizedRole = data.role.toLowerCase(); // 'admin', 'customer'

                localStorage.setItem('role', normalizedRole);
                localStorage.setItem('userId', data.id);
                localStorage.setItem('name', data.name || '');
                setRole(normalizedRole);

                updateToken(data.token); // Triggers App state update -> Redirects

                // Navigate based on role (Though App.js redirect might handle this, explicit push is safer)
                navigate(`/${normalizedRole}-dashboard`);
            } else {
                setError("Login failed: No token received");
            }

        } catch (err) {
            console.error(err);
            setError("Invalid email or password");
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <div className="card shadow border-0">
                        <div className="card-body p-4">
                            <h2 className="text-center mb-4 text-primary">🚗 NeuroFleetX</h2>
                            <h4 className="text-center mb-4 text-secondary">Sign In</h4>

                            {error && <div className="alert alert-danger">{error}</div>}

                            <form onSubmit={handleLogin}>
                                <div className="mb-3">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        placeholder="admin@gmail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Password</label>
                                    <div className="input-group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control"
                                            placeholder="admin@123"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
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

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 py-2 fw-bold"
                                >
                                    Login to Dashboard
                                </button>
                            </form>

                            <div className="text-center mt-3">
                                <small>
                                    Don't have account? <span className="text-primary pointer" style={{ cursor: 'pointer' }} onClick={() => navigate('/register')}>Register</span>
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

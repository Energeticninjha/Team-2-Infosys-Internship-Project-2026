import React from 'react';
import { useNavigate } from 'react-router-dom';

const RolePicker = ({ setRole }) => {
    const navigate = useNavigate();

    const selectRole = (role) => {
        localStorage.setItem('role', role);
        setRole(role);
        const paths = {
            admin: '/admin-dashboard',
            manager: '/manager-dashboard',
            customer: '/customer-dashboard',
            driver: '/driver-dashboard'
        };
        navigate(paths[role]);
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-10">
                    <div className="card shadow">
                        <div className="card-body text-center p-5">
                            <h2 className="mb-4">🎭 Select Your Role</h2>
                            <p className="text-muted mb-5">Choose your role to access specific dashboard</p>
                            <div className="row g-4">
                                <div className="col-md-3">
                                    <button className="btn btn-danger w-100 p-4 shadow h-100" onClick={() => selectRole('admin')}>
                                        <i className="fas fa-user-shield fs-1 mb-2 d-block"></i>
                                        <h5>Admin</h5>
                                        <small>Fleet Management & Analytics</small>
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-warning w-100 p-4 shadow h-100" onClick={() => selectRole('manager')}>
                                        <i className="fas fa-user-tie fs-1 mb-2 d-block"></i>
                                        <h5>Manager</h5>
                                        <small>Operations & Dispatch</small>
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-info w-100 p-4 shadow h-100" onClick={() => selectRole('customer')}>
                                        <i className="fas fa-user fs-1 mb-2 d-block"></i>
                                        <h5>Customer</h5>
                                        <small>Book Rides & Track</small>
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-success w-100 p-4 shadow h-100" onClick={() => selectRole('driver')}>
                                        <i className="fas fa-user-hard-hat fs-1 mb-2 d-block"></i>
                                        <h5>Driver</h5>
                                        <small>Navigation & Trips</small>
                                    </button>
                                </div>
                            </div>
                            <button className="btn btn-secondary mt-4" onClick={() => navigate('/login')}>Back to Login</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RolePicker;

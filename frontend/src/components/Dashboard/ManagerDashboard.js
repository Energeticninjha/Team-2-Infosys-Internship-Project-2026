import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ManagerDashboard = ({ logout }) => {
    const [activeView, setActiveView] = useState('tracking');
    const [fleetStats, setFleetStats] = useState({
        activeVehicles: 0,
        driversOnline: 0,
        pendingAlerts: 3,
        onTimeDelivery: 94.2
    });
    const [trips, setTrips] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchManagerData = async () => {
            try {
                // Fetch stats from existing vehicle/user endpoints
                const vRes = await axios.get('http://localhost:8080/api/vehicles');
                const uRes = await axios.get('http://localhost:8080/api/admin/users'); // Reuse admin users for drivers

                const activeCount = vRes.data.filter(v => v.status === 'Active' || v.status === 'BUSY').length;
                const onlineDrivers = uRes.data.filter(u => u.role === 'DRIVER').length;

                setFleetStats(prev => ({ ...prev, activeVehicles: activeCount, driversOnline: onlineDrivers }));

                // Fetch bookings for active trips
                const bRes = await axios.get('http://localhost:8080/api/bookings'); // Need to ensure this exists or mock
                setTrips(bRes.data.filter(b => b.status === 'ENROUTE' || b.status === 'PICKED_UP'));
            } catch (error) {
                console.error("Error fetching manager dashboard data", error);
            }
        };
        fetchManagerData();
    }, []);

    return (
        <div className="container-fluid p-0 min-vh-100 bg-light">
            <nav className="navbar navbar-dark bg-warning shadow-sm">
                <div className="container-fluid">
                    <span className="navbar-brand fw-bold text-dark">🚗 NeuroFleetX - Manager Module</span>
                    <button className="btn btn-outline-dark btn-sm fw-bold" onClick={logout}>Logout</button>
                </div>
            </nav>
            <div className="row g-0">
                <div className="col-md-2 bg-dark text-white min-vh-100 p-3 shadow">
                    <h6 className="mb-4 text-muted text-uppercase small">Manager Menu</h6>
                    <ul className="nav flex-column">
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'tracking' ? 'bg-warning text-dark' : ''}`}
                                onClick={() => setActiveView('tracking')}
                            >
                                <span className="me-2">📍</span> Live Tracking
                            </button>
                        </li>
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'assignments' ? 'bg-warning text-dark' : ''}`}
                                onClick={() => setActiveView('assignments')}
                            >
                                <span className="me-2">📝</span> Assignments
                            </button>
                        </li>
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'drivers' ? 'bg-warning text-dark' : ''}`}
                                onClick={() => setActiveView('drivers')}
                            >
                                <span className="me-2">👨‍✈️</span> Drivers
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="col-md-10 p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="fw-bold m-0">👨‍💼 Manager Overview</h2>
                        <span className="badge bg-warning text-dark p-2 rounded-3">Shift Active</span>
                    </div>

                    {activeView === 'tracking' && (
                        <div className="animate__animated animate__fadeIn">
                            <div className="row mb-4 g-3">
                                <div className="col-md-3">
                                    <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
                                        <h6 className="text-muted mb-1 small uppercase">Active Vehicles</h6>
                                        <h2 className="fw-bold mb-0 text-success">{fleetStats.activeVehicles}</h2>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
                                        <h6 className="text-muted mb-1 small uppercase">Drivers Online</h6>
                                        <h2 className="fw-bold mb-0 text-info">{fleetStats.driversOnline}</h2>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
                                        <h6 className="text-muted mb-1 small uppercase">Pending Alerts</h6>
                                        <h2 className="fw-bold mb-0 text-danger">{fleetStats.pendingAlerts}</h2>
                                    </div>
                                </div>
                            </div>

                            <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                                <div className="card-header bg-white border-0 py-3">
                                    <h5 className="mb-0 fw-bold">Live Trip Tracking</h5>
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="px-4">Trip ID</th>
                                                    <th>Driver</th>
                                                    <th>Status</th>
                                                    <th>Route Progress</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {trips.length > 0 ? trips.map(trip => (
                                                    <tr key={trip.id}>
                                                        <td className="px-4 fw-bold text-primary">TRP-{trip.id}</td>
                                                        <td>{trip.vehicle?.driverName || 'N/A'}</td>
                                                        <td>
                                                            <span className="badge bg-info-subtle text-info border border-info-subtle px-3">
                                                                {trip.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ width: '250px' }}>
                                                            <div className="progress" style={{ height: '6px' }}>
                                                                <div className="progress-bar bg-success" style={{ width: '65%' }}></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="4" className="text-center py-5 text-muted">
                                                            No active trips currently in transit.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'assignments' && (
                        <div className="card shadow-sm border-0 rounded-4 p-5 text-center animate__animated animate__fadeIn">
                            <div className="display-1 text-warning mb-3">📝</div>
                            <h3>Job Assignments Module</h3>
                            <p className="text-muted">Dispatch system for manual vehicle assignment is coming soon.</p>
                        </div>
                    )}

                    {activeView === 'drivers' && (
                        <div className="card shadow-sm border-0 rounded-4 p-5 text-center animate__animated animate__fadeIn">
                            <div className="display-1 text-info mb-3">👨‍✈️</div>
                            <h3>Driver Roster</h3>
                            <p className="text-muted">Live view of driver performance and shifts is being prepared.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;

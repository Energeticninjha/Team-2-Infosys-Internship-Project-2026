import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HealthAnalytics from './HealthAnalytics';

const ManagerDashboard = ({ logout }) => {
    const [activeView, setActiveView] = useState('tracking');
    const [fleetStats, setFleetStats] = useState({
        activeVehicles: 0,
        driversOnline: 0,
        pendingAlerts: 3,
        onTimeDelivery: 94.2
    });
    const [trips, setTrips] = useState([]);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [recommendedDrivers, setRecommendedDrivers] = useState([]);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchManagerData = async () => {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                // Fetch stats from existing vehicle/user endpoints
                const vRes = await axios.get('http://localhost:8080/api/vehicles', config);
                const uRes = await axios.get('http://localhost:8080/api/admin/users', config);

                const vehicles = vRes.data || [];
                const activeCount = vehicles.filter(v => v.status === 'Active' || v.status === 'BUSY').length;
                const onlineDrivers = (uRes.data || []).filter(u => u.role === 'DRIVER').length;
                const alertsCount = vehicles.filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length;

                setFleetStats({
                    activeVehicles: activeCount,
                    driversOnline: onlineDrivers,
                    pendingAlerts: alertsCount || 0,
                    onTimeDelivery: 94.2
                });

                // Fetch bookings for active trips
                const bRes = await axios.get('http://localhost:8080/api/bookings', config);
                const allBookings = bRes.data || [];
                setTrips(allBookings.filter(b => b.status === 'ENROUTE' || b.status === 'PICKED_UP'));
                setPendingBookings(allBookings.filter(b => b.status === 'PENDING' || !b.vehicle));
            } catch (error) {
                console.error("Error fetching manager dashboard data", error);
            }
        };
        fetchManagerData();
        const interval = setInterval(fetchManagerData, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchRecommendations = async (bookingId) => {
        setSelectedBookingId(bookingId);
        try {
            const res = await axios.get(`http://localhost:8080/api/fleet/recommend-driver/${bookingId}`);
            setRecommendedDrivers(res.data);
        } catch (error) {
            console.error("Error fetching recommendations", error);
        }
    };

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
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'health' ? 'bg-warning text-dark' : ''}`}
                                onClick={() => setActiveView('health')}
                            >
                                <span className="me-2">🛠️</span> Health Analytics
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

                    {activeView === 'health' && <HealthAnalytics />}

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
                        <div className="animate__animated animate__fadeIn">
                            <div className="row g-4">
                                <div className="col-md-5">
                                    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                                        <div className="card-header bg-warning py-3">
                                            <h5 className="mb-0 fw-bold">🕒 Pending Bookings</h5>
                                        </div>
                                        <div className="list-group list-group-flush">
                                            {pendingBookings.length > 0 ? pendingBookings.map(b => (
                                                <button
                                                    key={b.id}
                                                    className={`list-group-item list-group-item-action p-3 border-0 border-bottom ${selectedBookingId === b.id ? 'bg-warning-subtle' : ''}`}
                                                    onClick={() => fetchRecommendations(b.id)}
                                                >
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span className="fw-bold">BK-{b.id}</span>
                                                        <span className="badge bg-secondary">Pending</span>
                                                    </div>
                                                    <small className="text-muted d-block">{b.startLocation} ➝ {b.endLocation}</small>
                                                </button>
                                            )) : (
                                                <div className="p-4 text-center text-muted">No pending bookings.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-7">
                                    <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                                        <div className="card-header bg-dark text-white py-3">
                                            <h5 className="mb-0 fw-bold">🤖 Smart Driver Recommendations</h5>
                                        </div>
                                        <div className="card-body p-0">
                                            {selectedBookingId ? (
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle mb-0">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th className="px-4">Driver</th>
                                                                <th>Rating</th>
                                                                <th>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {recommendedDrivers.map((driver, index) => (
                                                                <tr key={driver.id}>
                                                                    <td className="px-4">
                                                                        <div className="fw-bold">{driver.driverName}</div>
                                                                        <small className="text-muted">{driver.model}</small>
                                                                        {index === 0 && (
                                                                            <span className="ms-2 badge bg-success animate__animated animate__pulse animate__infinite">Recommended</span>
                                                                        )}
                                                                    </td>
                                                                    <td>⭐ {driver.driverRating}</td>
                                                                    <td>
                                                                        <button className="btn btn-sm btn-primary fw-bold px-3">Assign</button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="p-5 text-center text-muted">
                                                    <div className="display-4 mb-3">🚗</div>
                                                    <h6>Select a pending booking to see ranked drivers by proximity.</h6>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
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

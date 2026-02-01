import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip as ChartTooltip,
    Legend as ChartLegend
} from 'chart.js';

ChartJS.register(ArcElement, ChartTooltip, ChartLegend);

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const maintenanceIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const AdminDashboard = ({ logout }) => {
    const [activeView, setActiveView] = useState('fleet');
    const [stats, setStats] = useState({
        totalVehicles: 0,
        activeTrips: 0,
        revenueToday: 0,
        utilization: 0,
        drivers: 0,
        totalUsers: 0
    });
    const [vehicles, setVehicles] = useState([]);
    const [users, setUsers] = useState([]);
    const [fleetStats, setFleetStats] = useState({ shiftActive: true, pendingAlerts: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBaseData = async () => {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                const kpiRes = await axios.get('http://localhost:8080/api/admin/kpi', config);
                setStats(kpiRes.data);

                const vRes = await axios.get('http://localhost:8080/api/vehicles', config);
                setVehicles(vRes.data);

                const uRes = await axios.get('http://localhost:8080/api/admin/users', config);
                setUsers(uRes.data);

                // Derived fleet stats
                const alerts = (vRes.data || []).filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length;
                setFleetStats({ shiftActive: true, pendingAlerts: alerts });
            } catch (error) {
                console.error("Error fetching admin data", error);
            }
        };
        fetchBaseData();
    }, []);

    const deleteUser = async (id) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            const token = localStorage.getItem('token');
            try {
                await axios.delete(`http://localhost:8080/api/admin/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(users.filter(u => u.id !== id));
            } catch (error) { alert("Failed to delete user."); }
        }
    };

    return (
        <div className="container-fluid p-0 min-vh-100">
            {/* Navbar */}
            <nav className="navbar navbar-dark bg-danger shadow-sm">
                <div className="container-fluid">
                    <span className="navbar-brand fw-bold">🚗 NeuroFleetX - Admin Panel</span>
                    <button className="btn btn-outline-light btn-sm fw-bold" onClick={logout}>Logout</button>
                </div>
            </nav>

            <div className="row g-0">
                {/* Sidebar */}
                <div className="col-md-2 bg-dark text-white min-vh-100 p-3 shadow">
                    <h6 className="mb-4 text-muted text-uppercase small">Main Menu</h6>
                    <ul className="nav flex-column">
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'analytics' ? 'bg-danger' : ''}`}
                                onClick={() => setActiveView('analytics')}
                            >
                                <span className="me-2">📊</span> Analytics
                            </button>
                        </li>
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'fleet' ? 'bg-danger' : ''}`}
                                onClick={() => setActiveView('fleet')}
                            >
                                <span className="me-2">🚗</span> Fleet Mgmt
                            </button>
                        </li>
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'users' ? 'bg-danger' : ''}`}
                                onClick={() => setActiveView('users')}
                            >
                                <span className="me-2">👥</span> Users
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Main Content */}
                <div className="col-md-10 p-4 bg-light">
                    {/* Header with alerts */}
                    {(vehicles || []).filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length > 0 && (
                        <div className="alert alert-danger shadow-sm rounded-4 d-flex justify-content-between align-items-center mb-4 border-0 animate__animated animate__shakeX">
                            <div>
                                <h6 className="mb-0 fw-bold">🚨 Critical Maintenance Required</h6>
                                <small>Multiple vehicles have dropped below 30% health. Action required in Manager Dashboard.</small>
                            </div>
                            <span className="badge bg-danger p-2 rounded-pill">
                                {(vehicles || []).filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length} Alerts
                            </span>
                        </div>
                    )}

                    {/* 🔥 CONDITIONAL RENDERING */}
                    {activeView === 'fleet' && (
                        <div className="card shadow border-0 rounded-4 overflow-hidden animate__animated animate__fadeIn">
                            <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center p-3">
                                <h5 className="mb-0 fw-bold">🚗 Fleet Management</h5>
                                <div className="d-flex align-items-center gap-2">
                                    {fleetStats && fleetStats.shiftActive && (
                                        <span className="badge bg-success bg-opacity-10 text-success p-2 rounded-3 border border-success border-opacity-25">Shift Active</span>
                                    )}
                                    {fleetStats && fleetStats.pendingAlerts > 0 && (
                                        <span className="badge bg-warning p-2 rounded-3 animate__animated animate__pulse animate__infinite">
                                            🛠️ {fleetStats.pendingAlerts} Critical Alerts
                                        </span>
                                    )}
                                    <button className="btn btn-light btn-sm fw-bold">+ Add Vehicle</button>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="px-4">Vehicle ID</th>
                                                <th>Model</th>
                                                <th>Driver</th>
                                                <th>Status</th>
                                                <th>Battery</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vehicles.map(vehicle => (
                                                <tr key={vehicle.id}>
                                                    <td className="px-4"><strong>V{String(vehicle.id).padStart(3, '0')}</strong></td>
                                                    <td>{vehicle.model}</td>
                                                    <td>{vehicle.driverName}</td>
                                                    <td>
                                                        <span className={`badge rounded-pill ${vehicle.status === 'Active' || vehicle.status === 'AVAILABLE' ? 'bg-success' : 'bg-warning'}`}>
                                                            {vehicle.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="progress flex-grow-1" style={{ height: '8px' }}>
                                                                <div className="progress-bar bg-success" style={{ width: `${vehicle.batteryPercent}%` }}></div>
                                                            </div>
                                                            <small className="ms-2 fw-bold">{vehicle.batteryPercent}%</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-sm btn-outline-primary me-2">Edit</button>
                                                        <button className="btn btn-sm btn-outline-danger">Track</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'users' && (
                        <div className="card shadow border-0 rounded-4 overflow-hidden animate__animated animate__fadeIn">
                            <div className="card-header bg-primary text-white p-3">
                                <h5 className="mb-0 fw-bold">👥 User Management</h5>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="px-4">ID</th>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(user => (
                                                <tr key={user.id}>
                                                    <td className="px-4">{user.id}</td>
                                                    <td>{user.name}</td>
                                                    <td>{user.email}</td>
                                                    <td><span className="badge bg-secondary">{user.role}</span></td>
                                                    <td>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteUser(user.id)}>Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'analytics' && (
                        <div className="animate__animated animate__fadeIn">
                            {/* 🔥 KPI CARDS Inside Analytics */}
                            <div className="row mb-4 g-3">
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-primary text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{stats.totalVehicles}</h3>
                                            <small className="opacity-75 fw-bold">Total Vehicles</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-success text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{stats.activeTrips}</h3>
                                            <small className="opacity-75 fw-bold">Active Trips</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-warning text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">₹{stats.revenueToday.toLocaleString()}</h3>
                                            <small className="opacity-75 fw-bold">Revenue Today</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-info text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{stats.utilization?.toFixed(1)}%</h3>
                                            <small className="opacity-75 fw-bold">Utilization</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-danger text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{stats.drivers}</h3>
                                            <small className="opacity-75 fw-bold">Drivers</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-secondary text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{stats.totalUsers}</h3>
                                            <small className="opacity-75 fw-bold">Total Users</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-dark text-white shadow-sm border-0 rounded-4 animate__animated animate__pulse animate__infinite" style={{ animationDuration: '3s' }}>
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{(vehicles || []).filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length}</h3>
                                            <small className="opacity-75 fw-bold">Maintenance Alerts</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Health Distribution & Map Row */}
                            <div className="row g-4 mb-4">
                                <div className="col-md-4">
                                    <div className="card shadow border-0 rounded-4 h-100 p-4 bg-white">
                                        <h5 className="fw-bold mb-4">🛠️ Fleet Health Dist.</h5>
                                        <div style={{ height: '250px' }}>
                                            <Pie
                                                data={{
                                                    labels: ['Healthy', 'Due', 'Critical'],
                                                    datasets: [{
                                                        data: [
                                                            (vehicles || []).filter(v => v.engineHealth >= 60 && v.tireWear <= 60 && v.batteryHealth >= 60).length || 1,
                                                            (vehicles || []).filter(v => (v.engineHealth < 60 && v.engineHealth >= 30) || (v.tireWear > 60 && v.tireWear <= 80) || (v.batteryHealth < 60 && v.batteryHealth >= 30)).length || 0,
                                                            (vehicles || []).filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length || 0
                                                        ],
                                                        backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(255, 99, 132, 0.7)'],
                                                        borderWidth: 1
                                                    }]
                                                }}
                                                options={{ maintainAspectRatio: false }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-8">
                                    <div className="card shadow border-0 rounded-4 overflow-hidden h-100">
                                        <div className="card-header bg-info text-white p-3">
                                            <h5 className="mb-0 fw-bold">🌍 Global Fleet Map</h5>
                                        </div>
                                        <div className="card-body p-0" style={{ height: '350px' }}>
                                            <MapContainer center={[13.0827, 80.2707]} zoom={11} style={{ height: '100%', width: '100%' }}>
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                {(vehicles || []).map(v => (
                                                    v.latitude && v.longitude && (
                                                        <Marker
                                                            key={v.id}
                                                            position={[v.latitude, v.longitude]}
                                                            icon={v.status === 'MAINTENANCE' ? maintenanceIcon : new L.Icon.Default()}
                                                        >
                                                            <Popup>
                                                                <b>{v.model}</b><br />
                                                                Driver: {v.driverName}<br />
                                                                Status: <span className={v.status === 'MAINTENANCE' ? 'text-danger fw-bold' : ''}>{v.status}</span><br />
                                                                Engine: {v.engineHealth?.toFixed(1)}%
                                                            </Popup>
                                                        </Marker>
                                                    )
                                                ))}
                                            </MapContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

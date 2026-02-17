import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Pie, Bar } from 'react-chartjs-2';
import '../../styles/dashboard.css';
import { CSVLink } from 'react-csv';
import {
    Chart as ChartJS,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip as ChartTooltip,
    Legend as ChartLegend
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, ChartTooltip, ChartLegend);

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

// Heatmap Data Generator (Mock if no data)
const generateHeatmapPoints = (bookings, count) => {
    if (!bookings || bookings.length === 0) {
        // Mock data around Chennai
        const center = [13.0827, 80.2707];
        return Array.from({ length: 50 }, () => [
            center[0] + (Math.random() - 0.5) * 0.1,
            center[1] + (Math.random() - 0.5) * 0.1,
            Math.random() * 10
        ]);
    }
    // If bookings have real data - for now mocking as requested since Booking has no coords
    const center = [13.0827, 80.2707];
    return bookings.map((b, i) => [
        center[0] + (Math.random() - 0.5) * (i % 2 === 0 ? 0.05 : 0.02),
        center[1] + (Math.random() - 0.5) * (i % 2 === 0 ? 0.05 : 0.02),
        10 // intensity
    ]);
};

const AdminDashboard = ({ logout }) => {
    const [activeView, setActiveView] = useState('analytics'); // Default to analytics
    const [stats, setStats] = useState({
        totalVehicles: 0,
        activeTrips: 0,
        tripsToday: 0,
        revenueToday: 0,
        utilization: 0,
        drivers: 0,
        totalUsers: 0
    });
    const [vehicles, setVehicles] = useState([]);
    const [users, setUsers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [fleetStats, setFleetStats] = useState({ shiftActive: true, pendingAlerts: 0 });
    const [heatmapEnabled, setHeatmapEnabled] = useState(false);
    const [heatmapData, setHeatmapData] = useState([]);
    const [popupInfo, setPopupInfo] = useState({ show: false, message: '', type: 'success' });
    const [confirmInfo, setConfirmInfo] = useState({ show: false, id: null });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBaseData = async () => {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                const kpiRes = await axios.get('http://localhost:8083/api/admin/kpi', config);
                setStats(kpiRes.data);

                const vRes = await axios.get('http://localhost:8083/api/vehicles', config);
                setVehicles(vRes.data);

                const uRes = await axios.get('http://localhost:8083/api/admin/users', config);
                setUsers(uRes.data);

                const bRes = await axios.get('http://localhost:8083/api/bookings', config);
                setBookings(bRes.data);

                // Derived fleet stats
                const alerts = (vRes.data || []).filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length;
                setFleetStats({ shiftActive: true, pendingAlerts: alerts });

                // Heatmap Data
                const finishedBookings = (bRes.data || []).filter(b => b.status === 'COMPLETED');
                setHeatmapData(generateHeatmapPoints(finishedBookings, finishedBookings.length));

            } catch (error) {
                console.error("Error fetching admin data", error);
            }
        };
        fetchBaseData();
    }, []);

    const deleteUser = (id) => {
        setConfirmInfo({ show: true, id });
    };

    const proceedDelete = async () => {
        const id = confirmInfo.id;
        setConfirmInfo({ show: false, id: null });
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:8083/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.filter(u => u.id !== id));
            setPopupInfo({ show: true, message: "User deleted successfully.", type: 'success' });
        } catch (error) {
            setPopupInfo({ show: true, message: "Failed to delete user.", type: 'error' });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate Hourly Data
    const getHourlyData = () => {
        const hours = Array(24).fill(0);
        if (bookings.length === 0) {
            // Mock Bell Curve
            return [1, 2, 5, 8, 15, 25, 40, 60, 80, 85, 70, 60, 50, 55, 65, 85, 90, 80, 60, 40, 20, 10, 5, 2];
        }
        bookings.forEach(b => {
            const h = new Date(b.startTime || b.scheduledStartTime || Date.now()).getHours();
            hours[h]++;
        });
        return hours;
    };

    // CSV Data Preparation
    const vehicleCsvData = vehicles.map(v => ({
        ID: v.id, Model: v.model, Driver: v.driverName, Status: v.status, Health: v.engineHealth
    }));

    const tripsCsvData = bookings.map(b => ({
        ID: b.id, User: b.user ? b.user.name : 'Unknown', Start: b.startLocation, End: b.endLocation, Time: b.startTime, Amount: b.amount, Status: b.status
    }));

    return (
        <div className="container-fluid p-0 min-vh-100">
            {/* Navbar (Hidden in Print) */}
            <nav className="navbar navbar-dark bg-primary shadow-sm no-print">
                <div className="container-fluid">
                    <span className="navbar-brand fw-bold">🚗 NeuroFleetX - Admin Panel</span>
                    <button className="btn btn-outline-light btn-sm fw-bold" onClick={logout}>Logout</button>
                </div>
            </nav>

            <div className="row g-0">
                {/* Sidebar (Hidden in Print) */}
                <div className="col-md-2 bg-dark text-white min-vh-100 p-3 shadow no-print">
                    <h6 className="mb-4 text-muted text-uppercase small">Main Menu</h6>
                    <ul className="nav flex-column">
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'analytics' ? 'bg-primary' : ''}`}
                                onClick={() => setActiveView('analytics')}
                            >
                                <span className="me-2">📊</span> Analytics
                            </button>
                        </li>
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'fleet' ? 'bg-primary' : ''}`}
                                onClick={() => setActiveView('fleet')}
                            >
                                <span className="me-2">🚗</span> Fleet Mgmt
                            </button>
                        </li>
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'trips' ? 'bg-primary' : ''}`}
                                onClick={() => setActiveView('trips')}
                            >
                                <span className="me-2">🛣️</span> Trips
                            </button>
                        </li>
                        <li className="mb-2">
                            <button
                                className={`nav-link btn btn-link text-white w-100 text-start rounded-3 ${activeView === 'users' ? 'bg-primary' : ''}`}
                                onClick={() => setActiveView('users')}
                            >
                                <span className="me-2">👥</span> Users
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Main Content */}
                <div className="col-md-10 p-4 bg-light">
                    {/* Header with alerts (Hidden in Print) */}
                    {(vehicles || []).filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length > 0 && (
                        <div className="alert alert-danger shadow-sm rounded-4 d-flex justify-content-between align-items-center mb-4 border-0 animate__animated animate__shakeX no-print">
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
                    {activeView === 'analytics' && (
                        <div className="animate__animated animate__fadeIn">
                            {/* 🔥 KPI CARDS Inside Analytics */}
                            <div className="row mb-4 g-3">
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-primary text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{stats.totalVehicles}</h3>
                                            <small className="opacity-75 fw-bold">Total Fleet</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-success text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{stats.activeTrips}</h3>
                                            <small className="opacity-75 fw-bold">Active Routes</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-warning text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">{stats.tripsToday}</h3>
                                            <small className="opacity-75 fw-bold">Trips Today</small>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-2 col-sm-6">
                                    <div className="card h-100 bg-info text-white shadow-sm border-0 rounded-4">
                                        <div className="card-body d-flex flex-column">
                                            <h3 className="card-title mb-1">₹{stats.revenueToday?.toLocaleString()}</h3>
                                            <small className="opacity-75 fw-bold">Revenue Today</small>
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
                            </div>

                            {/* Health Distribution & Map Row */}
                            <div className="row g-4 mb-4">
                                <div className="col-md-4">
                                    <div className="card shadow border-0 rounded-4 h-100 p-4 bg-white">
                                        <h5 className="fw-bold mb-4">Demand Analysis</h5>
                                        <div style={{ height: '200px' }}>
                                            <Bar
                                                data={{
                                                    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                                                    datasets: [{
                                                        label: 'Hourly Rental Demand',
                                                        data: getHourlyData(),
                                                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                                        borderRadius: 4
                                                    }]
                                                }}
                                                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                                            />
                                        </div>
                                        <hr />
                                        <h5 className="fw-bold mb-2">Fleet Health</h5>
                                        <div style={{ height: '150px' }}>
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
                                                options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-8">
                                    <div className="card shadow border-0 rounded-4 overflow-hidden h-100">
                                        <div className="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center">
                                            <h5 className="mb-0 fw-bold">🌍 Urban Mobility Map</h5>
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="heatmapToggle"
                                                    checked={heatmapEnabled}
                                                    onChange={(e) => setHeatmapEnabled(e.target.checked)}
                                                />
                                                <label className="form-check-label text-white" htmlFor="heatmapToggle">
                                                    {heatmapEnabled ? '🔥 Heatmap On' : '📍 Live Fleet'}
                                                </label>
                                            </div>
                                        </div>
                                        <div className="card-body p-0" style={{ height: '500px' }}>
                                            <MapContainer center={[13.0827, 80.2707]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                                                {!heatmapEnabled && (vehicles || []).map(v => (
                                                    v.latitude && v.longitude && (
                                                        <Marker
                                                            key={v.id}
                                                            position={[v.latitude, v.longitude]}
                                                            icon={v.status === 'MAINTENANCE' ? maintenanceIcon : new L.Icon.Default()}
                                                        >
                                                            <Popup>
                                                                <b>{v.model}</b><br />
                                                                Driver: {v.driverName}<br />
                                                                Status: <span className={v.status === 'MAINTENANCE' ? 'text-danger fw-bold' : ''}>{v.status}</span>
                                                            </Popup>
                                                        </Marker>
                                                    )
                                                ))}

                                                {heatmapEnabled && (
                                                    <HeatmapLayer
                                                        fitBoundsOnLoad
                                                        fitBoundsOnUpdate
                                                        points={heatmapData}
                                                        longitudeExtractor={m => m[1]}
                                                        latitudeExtractor={m => m[0]}
                                                        intensityExtractor={m => parseFloat(m[2])}
                                                    />
                                                )}
                                            </MapContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'fleet' && (
                        <div className="card shadow border-0 rounded-4 overflow-hidden animate__animated animate__fadeIn">
                            <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center p-3">
                                <h5 className="mb-0 fw-bold">🚗 Fleet Management</h5>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-light btn-sm fw-bold no-print" onClick={handlePrint}>🖨️ PDF</button>
                                    <CSVLink data={vehicleCsvData} filename={"fleet_report.csv"} className="btn btn-light btn-sm fw-bold no-print">
                                        📥 CSV
                                    </CSVLink>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="px-4">ID</th>
                                                <th>Model</th>
                                                <th>Driver</th>
                                                <th>Status</th>
                                                <th>Health</th>
                                                <th className="no-print">Actions</th>
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
                                                        <div className="progress" style={{ height: '6px', width: '80px' }}>
                                                            <div className={`progress-bar ${vehicle.engineHealth < 50 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${vehicle.engineHealth}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td className="no-print">
                                                        <button className="btn btn-sm btn-outline-primary me-2">Edit</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'trips' && (
                        <div className="card shadow border-0 rounded-4 overflow-hidden animate__animated animate__fadeIn">
                            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center p-3">
                                <h5 className="mb-0 fw-bold">🛣️ Trip History</h5>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-light btn-sm fw-bold no-print" onClick={handlePrint}>🖨️ PDF</button>
                                    <CSVLink data={tripsCsvData} filename={"trips_report.csv"} className="btn btn-light btn-sm fw-bold no-print">
                                        📥 CSV
                                    </CSVLink>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="px-4">Trip ID</th>
                                                <th>User</th>
                                                <th>From</th>
                                                <th>To</th>
                                                <th>Time</th>
                                                <th>Status</th>
                                                <th>Fare</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bookings.map(b => (
                                                <tr key={b.id}>
                                                    <td className="px-4">#{b.id}</td>
                                                    <td>{b.user ? b.user.name : 'Unknown'}</td>
                                                    <td>{b.startLocation}</td>
                                                    <td>{b.endLocation}</td>
                                                    <td>{new Date(b.startTime || Date.now()).toLocaleTimeString()}</td>
                                                    <td><span className="badge bg-secondary">{b.status}</span></td>
                                                    <td>₹{b.amount}</td>
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
                                                <th className="no-print">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(user => (
                                                <tr key={user.id}>
                                                    <td className="px-4">{user.id}</td>
                                                    <td>{user.name}</td>
                                                    <td>{user.email}</td>
                                                    <td><span className="badge bg-secondary">{user.role}</span></td>
                                                    <td className="no-print">
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
                </div>
            </div>


            {/* Popup Modal */}
            {
                popupInfo.show && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.5)' }}>
                        <div className="card shadow-lg p-4 text-center border-0 rounded-4" style={{ maxWidth: '400px', backgroundColor: 'white' }}>
                            <h4 className={`mb-3 ${popupInfo.type === 'error' ? 'text-danger' : 'text-success'}`}>
                                {popupInfo.type === 'error' ? 'Error' : 'Success'}
                            </h4>
                            <p className="mb-4">{popupInfo.message}</p>
                            <button
                                className={`btn ${popupInfo.type === 'error' ? 'btn-danger' : 'btn-primary'} w-100`}
                                onClick={() => setPopupInfo({ ...popupInfo, show: false })}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Confirm Modal */}
            {
                confirmInfo.show && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.5)' }}>
                        <div className="card shadow-lg p-4 text-center border-0 rounded-4" style={{ maxWidth: '400px', backgroundColor: 'white' }}>
                            <h4 className="mb-3 text-warning">Confirm Action</h4>
                            <p className="mb-4">Are you sure you want to delete this user?</p>
                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-secondary flex-fill"
                                    onClick={() => setConfirmInfo({ show: false, id: null })}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger flex-fill"
                                    onClick={proceedDelete}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminDashboard;

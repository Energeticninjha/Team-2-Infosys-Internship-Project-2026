import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HealthAnalytics from './HealthAnalytics';
import ProfileSection from './ProfileSection';

import DriverManagement from './DriverManagement';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/dashboard.css';

// New Design System
import MainLayout from '../Layout/MainLayout';
import Card from '../Common/Card';
import Button from '../Common/Button';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

const ManagerDashboard = ({ logout }) => {
    const [activeView, setActiveView] = useState('tracking');
    const [fleetStats, setFleetStats] = useState({
        activeVehicles: 0, driversOnline: 0, pendingAlerts: 3, onTimeDelivery: 94.2
    });
    const [vehicles, setVehicles] = useState([]);
    const [trips, setTrips] = useState([]);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [recommendedDrivers, setRecommendedDrivers] = useState([]);

    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [onlineDriversList, setOnlineDriversList] = useState([]);
    const navigate = useNavigate();

    const [approvalTab, setApprovalTab] = useState('pending');
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedDocs, setSelectedDocs] = useState(null);

    const managerName = sessionStorage.getItem('name') || 'Manager';

    const updateVehicleStatus = async (id, status, docStatus) => {
        try {
            await axios.put(`http://localhost:8083/api/vehicles/${id}`, { status, documentStatus: docStatus });
            const vRes = await axios.get('http://localhost:8083/api/vehicles');
            setVehicles(vRes.data || []);
            alert(`Vehicle status updated to ${status}`);
        } catch (error) { alert("Failed to update status"); }
    };

    const updateVehicleDocs = async (id, status) => {
        try {
            await axios.put(`http://localhost:8083/api/vehicles/${id}`, { documentStatus: status });
            const vRes = await axios.get('http://localhost:8083/api/vehicles');
            setVehicles(vRes.data || []);
            setSelectedDocs(null);
            alert("Documents Verified");
        } catch (error) { alert("Failed to verify documents"); }
    }

    useEffect(() => {
        const fetchManagerData = async () => {
            const token = sessionStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                const vRes = await axios.get('http://localhost:8083/api/vehicles', config);
                setVehicles(vRes.data || []);

                const dRes = await axios.get('http://localhost:8083/api/manager/drivers/online', config);
                const onlineDriversCount = (dRes.data || []).length;
                setOnlineDriversList(dRes.data || []);

                const vehiclesList = vRes.data || [];
                const activeCount = vehiclesList.filter(v => v.status === 'Active' || v.status === 'BUSY').length;
                const alertsCount = vehiclesList.filter(v => v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30).length;

                setFleetStats({
                    activeVehicles: activeCount,
                    driversOnline: onlineDriversCount,
                    pendingAlerts: alertsCount || 0,
                    onTimeDelivery: 94.2
                });

                const bRes = await axios.get('http://localhost:8083/api/bookings', config);
                const allBookings = bRes.data || [];
                setTrips(allBookings.filter(b => ["CONFIRMED", "ENROUTE", "PICKED_UP"].includes(b.status)));
                setPendingBookings(allBookings.filter(b => b.status === 'PENDING' || !b.vehicle));

            } catch (error) { console.error("Error fetching data", error); }
        };
        fetchManagerData();
        const interval = setInterval(fetchManagerData, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchRecommendations = async (bookingId) => {
        setSelectedBookingId(bookingId);
        try {
            const res = await axios.get(`http://localhost:8083/api/fleet/recommend-driver/${bookingId}`);
            setRecommendedDrivers(res.data);
        } catch (error) { }
    };

    return (
        <MainLayout title="Manager Console" role="manager" activeView={activeView} onViewChange={setActiveView} logout={logout}>
            <div className="p-4 h-100 overflow-auto">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold m-0" style={{ color: 'var(--text-main)' }}>Overview</h2>
                    <span className="badge bg-warning text-dark p-2 rounded-3">Shift Active</span>
                </div>

                {activeView === 'health' && <HealthAnalytics />}

                {activeView === 'tracking' && (
                    <div className="animate-fade-in">
                        <div className="row mb-4 g-3">
                            <div className="col-md-3">
                                <Card className="p-3">
                                    <h6 className="text-muted mb-1 small uppercase">Active Vehicles</h6>
                                    <h2 className="fw-bold mb-0 text-success">{fleetStats.activeVehicles}</h2>
                                </Card>
                            </div>
                            <div className="col-md-3">
                                <Card className="p-3">
                                    <h6 className="text-muted mb-1 small uppercase">Drivers Online</h6>
                                    <h2 className="fw-bold mb-0 text-info">{fleetStats.driversOnline}</h2>
                                </Card>
                            </div>
                            <div className="col-md-3">
                                <Card className="p-3">
                                    <h6 className="text-muted mb-1 small uppercase">Pending Alerts</h6>
                                    <h2 className="fw-bold mb-0 text-danger">{fleetStats.pendingAlerts}</h2>
                                </Card>
                            </div>
                        </div>

                        <div className="row g-4">
                            <div className="col-md-4">
                                <Card className="h-100" noPadding>
                                    <div className="p-3 border-bottom">
                                        <h5 className="mb-0 fw-bold text-success">Active Vehicles</h5>
                                    </div>
                                    <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: '600px' }}>
                                        {vehicles.filter(v => v.status === 'Active' || v.status === 'BUSY').length > 0 ? (
                                            vehicles.filter(v => v.status === 'Active' || v.status === 'BUSY').map(v => (
                                                <div key={v.id} className="list-group-item p-3 border-0 border-bottom bg-transparent" style={{ color: 'var(--text-main)' }}>
                                                    <div className="d-flex align-items-center">
                                                        <div className="bg-light rounded-circle p-2 me-3">🚛</div>
                                                        <div>
                                                            <h6 className="mb-0 fw-bold">{v.model}</h6>
                                                            <small className="text-muted">{v.numberPlate}</small>
                                                            <div className="mt-1">
                                                                <span className={`badge ${v.status === 'BUSY' ? 'bg-warning text-dark' : 'bg-success'} me-2`}>{v.status}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-muted">No active vehicles found.</div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            <div className="col-md-8">
                                <Card className="h-100 overflow-hidden" noPadding>
                                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                                        <h5 className="mb-0 fw-bold text-primary">Live Driver Map</h5>
                                        <span className="badge bg-primary">{onlineDriversList.length} Online</span>
                                    </div>
                                    <div className="position-relative" style={{ height: '600px', width: '100%' }}>
                                        <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

                                            {/* Draw Active Mission Routes */}
                                            {trips.map(trip => {
                                                // Check if we have valid destination coordinates (added in recent update)
                                                if (trip.endLat && trip.endLng) {
                                                    const startPos = trip.vehicle && trip.vehicle.latitude ? [trip.vehicle.latitude, trip.vehicle.longitude] : [trip.startLat, trip.startLng];

                                                    // If we have a valid start position (either vehicle or pickup), draw line to dropoff
                                                    if (startPos && startPos[0] && startPos[1]) {
                                                        return (
                                                            <React.Fragment key={trip.id}>
                                                                <Polyline
                                                                    positions={[startPos, [trip.endLat, trip.endLng]]}
                                                                    pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.7, dashArray: '10, 10' }}
                                                                />
                                                                <Marker position={[trip.endLat, trip.endLng]}>
                                                                    <Popup>
                                                                        <div className="text-center">
                                                                            <strong>🏁 Destination</strong><br />
                                                                            {trip.endLocation}
                                                                        </div>
                                                                    </Popup>
                                                                </Marker>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                }
                                                return null;
                                            })}

                                            {onlineDriversList.map((item, idx) => {
                                                const { driver, vehicle, activeTrip } = item;

                                                // Check if this driver has a real active booking (Mission)
                                                const activeMission = trips.find(t => t.vehicleId === vehicle?.id);

                                                const lat = vehicle?.latitude || driver.currentLat || 12.9716;
                                                const lng = vehicle?.longitude || driver.currentLng || 77.5946;

                                                return (
                                                    <Marker key={idx} position={[lat, lng]}>
                                                        <Popup>
                                                            <div style={{ minWidth: '220px' }}>
                                                                <div className="d-flex align-items-center mb-3">
                                                                    <img
                                                                        src={driver.profilePhotoUrl || "https://randomuser.me/api/portraits/men/32.jpg"}
                                                                        alt="Driver"
                                                                        className="rounded-circle border me-3"
                                                                        width="45"
                                                                        height="45"
                                                                        style={{ objectFit: 'cover' }}
                                                                    />
                                                                    <div>
                                                                        <h6 className="fw-bold mb-0 text-dark">{driver.name}</h6>
                                                                        <div className="small text-muted d-flex align-items-center">
                                                                            <i className="bi bi-telephone-fill me-1" style={{ fontSize: '10px' }}></i>
                                                                            {driver.phone || vehicle?.driverContact || 'No Contact'}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {vehicle && (
                                                                    <div className="bg-light p-2 rounded mb-2 border">
                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                            <span className="small fw-bold text-secondary">Vehicle</span>
                                                                            <span className="badge bg-dark" style={{ fontSize: '10px' }}>{vehicle.numberPlate}</span>
                                                                        </div>
                                                                        <div className="small text-dark">{vehicle.model} - {vehicle.type}</div>
                                                                    </div>
                                                                )}

                                                                {activeMission ? (
                                                                    <div className="mb-2 p-2 bg-primary-subtle rounded border border-primary">
                                                                        <div className="small fw-bold text-primary mb-1">🚀 Enroute Mission</div>
                                                                        <div className="small text-dark">
                                                                            <strong>Customer:</strong> {activeMission.userName || 'Guest'}<br />
                                                                            <span className="text-truncate d-block" style={{ maxWidth: '180px' }}>To: {activeMission.endLocation}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : activeTrip ? (
                                                                    <div className="mb-2">
                                                                        <div className="small fw-bold text-primary mb-1">Job Posted</div>
                                                                        <div className="d-flex align-items-center small text-dark">
                                                                            <span className="text-truncate" style={{ maxWidth: '80px' }}>{activeTrip.fromLocation}</span>
                                                                            <span className="mx-1 text-muted">➝</span>
                                                                            <span className="text-truncate" style={{ maxWidth: '80px' }}>{activeTrip.toLocation}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="mb-2 badge bg-success-subtle text-success w-100">
                                                                        Available for Assignment
                                                                    </div>
                                                                )}

                                                                <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                                                                    <div className="d-flex align-items-center">
                                                                        <span className={`badge ${driver.isOnline ? 'bg-success' : 'bg-secondary'} me-2`}>
                                                                            {driver.isOnline ? 'Online' : 'Offline'}
                                                                        </span>
                                                                    </div>
                                                                    <small className="fw-bold text-warning">
                                                                        ★ {driver.performanceScore ? driver.performanceScore.toFixed(1) : '5.0'}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </Popup>
                                                    </Marker>
                                                );
                                            })}
                                        </MapContainer>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'approvals' && (
                    <div className="animate-fade-in">
                        <h4 className="mb-4">Vehicle Approvals</h4>
                        <div className="d-flex gap-2 mb-4">
                            <Button variant={approvalTab === 'pending' ? 'primary' : 'ghost'} onClick={() => setApprovalTab('pending')}>Pending Requests</Button>
                            <Button variant={approvalTab === 'approved' ? 'success' : 'ghost'} onClick={() => setApprovalTab('approved')}>Approved Fleet</Button>
                        </div>

                        <Card noPadding>
                            <div className="table-responsive">
                                <table className="table align-middle mb-0" style={{ color: 'var(--text-main)' }}>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-4">Driver Profile</th>
                                            <th>Vehicle Details</th>
                                            <th>Documents</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vehicles.filter(v => approvalTab === 'pending' ? v.status === 'Pending' : v.status === 'Active').map(v => (
                                            <tr key={v.id}>
                                                <td className="px-4" onClick={() => setSelectedDriver(v)}>
                                                    <div className="d-flex align-items-center clickable">
                                                        <img src={v.driverPhotoUrl || "https://randomuser.me/api/portraits/men/32.jpg"} alt="" className="rounded-circle me-3 border" width="40" height="40" />
                                                        <div><div className="fw-bold">{v.driverName}</div><small className="text-muted">ID: {v.id}</small></div>
                                                    </div>
                                                </td>
                                                <td onClick={() => setSelectedVehicle(v)} className="clickable">
                                                    <div className="fw-bold">{v.model}</div><small className="text-muted">{v.numberPlate}</small>
                                                </td>
                                                <td onClick={() => setSelectedDocs(v)} className="clickable">
                                                    <span className={`badge ${v.documentStatus === 'Verified' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>{v.documentStatus || 'Pending'}</span>
                                                </td>
                                                <td>
                                                    {approvalTab === 'pending' ? (
                                                        <div className="d-flex gap-2">
                                                            <button className="btn btn-success btn-sm" onClick={() => updateVehicleStatus(v.id, 'Active', 'Verified')}>Approve</button>
                                                            <button className="btn btn-outline-danger btn-sm" onClick={() => updateVehicleStatus(v.id, 'Rejected', 'Rejected')}>Reject</button>
                                                        </div>
                                                    ) : (
                                                        <button className="btn btn-outline-danger btn-sm" onClick={() => updateVehicleStatus(v.id, 'Inactive', 'Verified')}>Remove</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Modals reused logic... */}
                {(selectedDriver || selectedVehicle || selectedDocs) && (
                    <div className="modal-backdrop-glass position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, background: 'rgba(0,0,0,0.5)' }}>
                        <Card className="shadow-lg" style={{ width: '500px', maxWidth: '90%' }}>
                            <div className="d-flex justify-content-between mb-3">
                                <h5 className="fw-bold">Details</h5>
                                <button className="btn-close" onClick={() => { setSelectedDriver(null); setSelectedVehicle(null); setSelectedDocs(null); }}></button>
                            </div>
                            {selectedDriver && (
                                <div className="text-center">
                                    <img src={selectedDriver.driverPhotoUrl || "https://randomuser.me/api/portraits/men/32.jpg"} className="rounded-circle mb-3" width="100" />
                                    <h4>{selectedDriver.driverName}</h4>
                                    <p className="text-muted">{selectedDriver.driverEmail}</p>
                                    <div className="bg-light p-3 rounded text-start"><p><strong>Phone:</strong> {selectedDriver.driverContact}</p></div>
                                </div>
                            )}
                            {selectedVehicle && (
                                <div>
                                    <img src={selectedVehicle.vehiclePhotoUrl || "https://cdni.iconscout.com/illustration/premium/thumb/electric-car-3454848-2886733.png"} className="img-fluid rounded mb-3" />
                                    <h5>{selectedVehicle.model}</h5>
                                    <p>{selectedVehicle.numberPlate}</p>
                                    <div className="d-flex gap-2"><span className="badge bg-secondary">{selectedVehicle.type}</span><span className="badge bg-secondary">{selectedVehicle.seats} Seats</span></div>
                                </div>
                            )}
                            {selectedDocs && (
                                <div>
                                    <h6>Verify Documents</h6>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6"><div className="border p-2 text-center bg-light">License</div></div>
                                        <div className="col-6"><div className="border p-2 text-center bg-light">ID Card</div></div>
                                    </div>
                                    <Button onClick={() => updateVehicleDocs(selectedDocs.id, 'Verified')} className="w-100">Verify & Approve</Button>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {activeView === 'assignments' && (
                    <div className="row g-4 animate-fade-in">
                        <div className="col-md-5">
                            <Card noPadding>
                                <div className="p-3 bg-warning-subtle"><h5 className="mb-0 fw-bold">Pending Bookings</h5></div>
                                <div className="list-group list-group-flush">
                                    {pendingBookings.map(b => (
                                        <button key={b.id} className={`list-group-item list-group-item-action p-3 ${selectedBookingId === b.id ? 'bg-light' : ''}`} onClick={() => fetchRecommendations(b.id)}>
                                            <div className="fw-bold">BK-{b.id}</div>
                                            <small>{b.startLocation} ➝ {b.endLocation}</small>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </div>
                        <div className="col-md-7">
                            <Card noPadding>
                                <div className="p-3 bg-dark text-white"><h5 className="mb-0">Smart Driver Recommendations</h5></div>
                                <div className="p-3">
                                    {selectedBookingId ? (
                                        <table className="table align-middle">
                                            <tbody>
                                                {recommendedDrivers.map((driver, index) => (
                                                    <tr key={driver.id}>
                                                        <td><div className="fw-bold">{driver.driverName}</div><small>{driver.model}</small></td>
                                                        <td>⭐ {driver.driverRating}</td>
                                                        <td><Button className="btn-sm">Assign</Button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center text-muted p-4">
                                            <p>Select a pending booking to see recommendations.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Active Missions Section */}
                                <div className="p-3 bg-success text-white mt-3"><h5 className="mb-0">Active Missions (Enroute)</h5></div>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>ID</th>
                                                <th>Driver</th>
                                                <th>Customer</th>
                                                <th>Route</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trips.length === 0 ? (
                                                <tr><td colSpan="5" className="text-center p-3 text-muted">No active missions currently.</td></tr>
                                            ) : (
                                                trips.map(trip => (
                                                    <tr key={trip.id}>
                                                        <td>#{trip.id}</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="fw-bold">{trip.vehicle?.driverName || 'Unknown'}</div>
                                                            </div>
                                                        </td>
                                                        <td>{trip.userName || 'Customer'}</td>
                                                        <td>
                                                            <div className="small text-muted">From: {trip.startLocation}</div>
                                                            <div className="small text-muted">To: {trip.endLocation}</div>
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-primary animate-pulse">{trip.status}</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeView === 'drivers' && <DriverManagement />}
                {activeView === 'profile' && <ProfileSection userId={sessionStorage.getItem('userId')} />}
            </div>
        </MainLayout >
    );
};

export default ManagerDashboard;

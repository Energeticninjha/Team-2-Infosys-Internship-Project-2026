import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './DriverDashboard.css';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CarIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/741/741407.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: 'vehicle-marker-transition'
});

const RecenterMap = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords) map.setView(coords);
    }, [coords, map]);
    return null;
};

const DriverDashboard = ({ logout }) => {
    // 1. Core State
    const [driverName] = useState(localStorage.getItem('name') || "Ramesh Driver");
    const [driverEmail] = useState(localStorage.getItem('email') || "admin@gmail.com");
    const [vehicle, setVehicle] = useState(null);
    const [earnings, setEarnings] = useState({ totalEarnings: 0, completedTrips: 0, rating: 5.0 });
    const [reviews, setReviews] = useState([]);
    const [activeBooking, setActiveBooking] = useState(null);
    const [error, setError] = useState(null);

    // 2. Navigation State
    const [currentPos, setCurrentPos] = useState([13.0827, 80.2707]);
    const [polyline, setPolyline] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null); // ETA/Distance
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTripping, setIsTripping] = useState(false);
    const animationRef = useRef(null);

    // 3. Initial Data Fetch & Polling
    useEffect(() => {
        const fetchBaseData = async () => {
            try {
                // Fetch Vehicle Integration
                const vRes = await axios.get(`http://localhost:8080/api/vehicles`);
                const myVehicle = vRes.data.find(v => v.driverName === driverName || v.id === 1); // Fallback for demo
                setVehicle(myVehicle);
                if (myVehicle && !isTripping) {
                    setCurrentPos([myVehicle.latitude, myVehicle.longitude]);
                }

                // Fetch Earnings & Reviews
                refreshStats();

            } catch (error) { console.error("Base data fetch error", error); }
        };

        fetchBaseData();
        const interval = setInterval(fetchBaseData, 10000); // Base data every 10s
        return () => clearInterval(interval);
    }, [driverName, isTripping]);

    // 4. Booking Listener (Poll every 5s for new CONFIRMED bookings)
    const checkBookings = async () => {
        if (activeBooking) return; // Don't look if already busy
        try {
            console.log("🔍 [DriverDashboard] Polling for jobs for driver:", driverName);
            // Try fetching for current user name
            let bRes = await axios.get(`http://localhost:8080/api/driver/${driverName}/bookings`);
            console.log(`✅ [DriverDashboard] Found ${bRes.data.length} jobs for ${driverName}`);

            // Fallback: If no jobs for current user, search across ALL bookings for a demo job
            if (bRes.data.length === 0) {
                console.log("⚠️ [DriverDashboard] No jobs for current user, checking all bookings for demo job...");
                const allRes = await axios.get(`http://localhost:8080/api/bookings`);
                const demoJob = allRes.data.find(b => b.status === 'CONFIRMED' || b.status === 'PENDING');
                if (demoJob) {
                    console.log("🎁 [DriverDashboard] Found a Demo Job:", demoJob);
                    setActiveBooking(demoJob);
                    return;
                }
            }

            const newJob = bRes.data.find(b => b.status === 'CONFIRMED');
            if (newJob) {
                setActiveBooking(newJob);
            }
        } catch (e) {
            console.error("❌ [DriverDashboard] Error polling bookings:", e);
        }
    };

    useEffect(() => {
        checkBookings();
        const interval = setInterval(checkBookings, 5000);
        return () => clearInterval(interval);
    }, [driverName, activeBooking]);

    const refreshStats = async () => {
        try {
            const earnRes = await axios.get(`http://localhost:8080/api/driver/${driverName}/earnings`);
            setEarnings(earnRes.data);
            const revRes = await axios.get(`http://localhost:8080/api/driver/${driverName}/reviews`);
            setReviews(revRes.data);
        } catch (e) { }
    };

    // 5. Actions
    const handleStatusChange = async (newStatus) => {
        try {
            await axios.put(`http://localhost:8080/api/driver/${driverName}/status`, { status: newStatus });
            setVehicle(prev => ({ ...prev, status: newStatus }));
        } catch (e) { }
    };

    const acceptJob = async () => {
        try {
            setActiveBooking(prev => ({ ...prev, accepted: true }));
            // Mock sound or notification could go here
        } catch (e) { alert("Failed to accept job."); }
    };

    const startTrip = async () => {
        if (!activeBooking) return;
        try {
            // 1. Update vehicle status to ENROUTE
            await handleStatusChange('ENROUTE');

            // 2. Update booking status to ENROUTE (Sync backend)
            await axios.put(`http://localhost:8080/api/bookings/${activeBooking.id}/status`, { status: 'ENROUTE' });

            // 3. Fetch precise route path with traffic zones (Blue/Green)
            const res = await axios.post('http://localhost:8080/api/fleet/optimize-route', {
                startLng: currentPos[1],
                startLat: currentPos[0],
                endLng: 80.2184, // Mock destination or use booking coord
                endLat: 12.9716
            });

            if (res.data && res.data.length > 0) {
                const selectedRoute = res.data[0]; // Path A (Blue)
                setPolyline(selectedRoute.path);
                setRouteInfo({
                    duration: selectedRoute.duration,
                    distance: selectedRoute.distance,
                    status: selectedRoute.trafficStatus
                });
                setCurrentIndex(0);
                setIsTripping(true);

                // Start movement animation
                animationRef.current = setInterval(() => {
                    setCurrentIndex(prev => {
                        const next = prev + 1;
                        if (next < selectedRoute.path.length) {
                            setCurrentPos(selectedRoute.path[next]);
                            return next;
                        } else {
                            clearInterval(animationRef.current);
                            return prev;
                        }
                    });
                }, 2000);
            }
        } catch (e) {
            console.error("Failed to start trip", e);
            alert("System Busy: Could not fetch optimized path.");
        }
    };

    const completeTrip = async () => {
        if (!activeBooking) return;
        try {
            await axios.put(`http://localhost:8080/api/bookings/${activeBooking.id}/status`, { status: 'COMPLETED' });

            // Success: Clean up
            setIsTripping(false);
            setActiveBooking(null);
            setPolyline([]);
            setCurrentIndex(0);
            if (animationRef.current) clearInterval(animationRef.current);

            // Immediate Refresh as requested
            refreshStats();
            handleStatusChange('AVAILABLE');

            alert("Trip Completed Successfully!");
        } catch (e) { alert("Failed to complete trip."); }
    };

    return (
        <div className="driver-dashboard min-vh-100 bg-light">
            {/* Header / Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm px-4">
                <span className="navbar-brand fw-bold">🚗 NeuroFleetX | Driver Mission Control</span>
                <div className="ms-auto d-flex align-items-center">
                    <div className="dropdown me-3">
                        <button className={`btn btn-sm btn-light dropdown-toggle fw-bold`} type="button" data-bs-toggle="dropdown">
                            Status: {vehicle?.status || 'Offline'}
                        </button>
                        <ul className="dropdown-menu">
                            <li><button className="dropdown-item" onClick={() => handleStatusChange('AVAILABLE')}>AVAILABLE</button></li>
                            <li><button className="dropdown-item" onClick={() => handleStatusChange('MAINTENANCE')}>MAINTENANCE</button></li>
                        </ul>
                    </div>
                    <button className="btn btn-danger btn-sm fw-bold" onClick={logout}>Logout</button>
                </div>
            </nav>

            <div className="container-fluid p-4">
                <div className="row g-4">
                    {/* LEFT SIDE: Telemetry & Map */}
                    <div className="col-lg-8">
                        {/* Telemetry Row */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <div className="card kpi-card shadow-sm bg-white p-3 text-center">
                                    <small className="text-muted fw-bold">LIVE SPEED</small>
                                    <h3 className="mb-0 text-primary">{vehicle?.speed || 0} <small className="h6 text-muted">km/h</small></h3>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card kpi-card shadow-sm bg-white p-3">
                                    <small className="text-muted fw-bold text-center d-block">BATTERY</small>
                                    <div className="progress mt-2" style={{ height: '10px' }}>
                                        <div className="progress-bar bg-success" style={{ width: `${vehicle?.batteryPercent || 85}%` }}></div>
                                    </div>
                                    <div className="text-center mt-1 fw-bold text-success">{vehicle?.batteryPercent || 85}%</div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card kpi-card shadow-sm bg-white p-3 text-center">
                                    <small className="text-muted fw-bold">VEHICLE ID</small>
                                    <h5 className="mb-0">{vehicle?.numberPlate || 'TN 01 AB 1234'}</h5>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card kpi-card shadow-sm bg-white p-3 text-center">
                                    <small className="text-muted fw-bold">ODOMETER</small>
                                    <h4 className="mb-0">{vehicle?.odometer || 12450} <small className="h6">km</small></h4>
                                </div>
                            </div>
                        </div>

                        {/* Live Map */}
                        <div className="map-container overflow-hidden">
                            <MapContainer center={currentPos} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker position={currentPos} icon={CarIcon}>
                                    <Popup><b>You are here</b><br />{vehicle?.model}</Popup>
                                </Marker>

                                {/* Segmented Polyline for Traffic Visualization */}
                                {polyline.length > 0 && polyline.map((point, i) => {
                                    if (i === 0) return null;
                                    const prevPoint = polyline[i - 1];
                                    // Simulated Congestion: High congestion (Red) vs Smooth (Green)
                                    // Increased congestion logic for proof: segments 5-15 are red
                                    const isCongested = (i > 5 && i < 15) || (i % 12 < 2);
                                    const color = isCongested ? '#ff4d4d' : '#2ecc71';
                                    return (
                                        <Polyline
                                            key={i}
                                            positions={[prevPoint, point]}
                                            pathOptions={{ color, weight: 10, opacity: 0.9 }}
                                        />
                                    );
                                })}

                                <RecenterMap coords={currentPos} />
                            </MapContainer>

                            {/* Floating Live ETA Card */}
                            {isTripping && routeInfo && (
                                <div className="floating-eta-card shadow-lg animate__animated animate__fadeInRight">
                                    <div className="d-flex align-items-center mb-2">
                                        <div className="pulse-dot me-2"></div>
                                        <span className="fw-bold text-success small">LIVE MISSION</span>
                                    </div>
                                    <div className="h2 fw-bold mb-0">{routeInfo.duration}</div>
                                    <div className="text-muted small mb-2">{routeInfo.distance} remaining</div>
                                    <div className="badge bg-danger-subtle text-danger border border-danger">
                                        Traffic: {routeInfo.status}
                                    </div>
                                </div>
                            )}

                            {isTripping && (
                                <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 z-index-1000">
                                    <h6 className="text-primary fw-bold mb-1">TRIP ACTIVE</h6>
                                    <button className="btn btn-success btn-sm w-100 fw-bold" onClick={completeTrip}>COMPLETE TRIP</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE: Jobs & Stats */}
                    <div className="col-lg-4">
                        {/* Job Queue */}
                        <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                            <div className="card-header bg-success text-white p-3 d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">📡 Job Queue</h5>
                                <button className="btn btn-xs btn-outline-light border-0" onClick={() => checkBookings()}>🔄 Force Check</button>
                            </div>
                            <div className="card-body p-4 bg-white">
                                {error && <div className="alert alert-danger small p-2">{error}</div>}
                                {activeBooking ? (
                                    <div className={`job-card p-4 rounded-4 transition-all ${!activeBooking.accepted ? 'bg-primary-subtle border-primary border-start border-5 shadow-sm' : 'bg-light'}`}>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className={`badge ${!activeBooking.accepted ? 'bg-primary animate__animated animate__flash animate__infinite' : 'bg-secondary'}`}>
                                                {!activeBooking.accepted ? '🚨 INCOMING JOB' : 'WAITING TO START'}
                                            </span>
                                            <span className="fw-bold text-success">₹{activeBooking.amount}</span>
                                        </div>
                                        <h6 className="fw-bold mb-1">{activeBooking.user?.name || 'Customer'}</h6>
                                        <p className="text-muted small mb-3">
                                            {activeBooking.startLocation} → {activeBooking.endLocation}
                                        </p>

                                        {!activeBooking.accepted ? (
                                            <button className="btn btn-primary w-100 fw-bold py-2 shadow-sm" onClick={acceptJob}>Accept Mission</button>
                                        ) : !isTripping ? (
                                            <div>
                                                <div className="alert alert-info py-2 small mb-3">Contact: <b>+91 98765 43210</b></div>
                                                <button className="btn btn-success w-100 fw-bold" onClick={startTrip}>Start Trip</button>
                                            </div>
                                        ) : (
                                            <button className="btn btn-outline-success w-100 fw-bold" disabled>Trip Progressing...</button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                        <div className="spinner-grow text-success mb-3"></div>
                                        <p className="text-muted fw-bold">Scanning for assignments...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Revenue Tracker */}
                        <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
                            <div className="card-header bg-info text-white p-3">
                                <h5 className="mb-0">💰 Revenue Tracker</h5>
                            </div>
                            <div className="card-body p-4 d-flex justify-content-around text-center">
                                <div>
                                    <small className="text-muted fw-bold d-block">TODAY'S EARNINGS</small>
                                    <h3 className="text-primary mt-1">₹{earnings.totalEarnings}</h3>
                                </div>
                                <div className="vr mx-3"></div>
                                <div>
                                    <small className="text-muted fw-bold d-block">TRIPS</small>
                                    <h3 className="mt-1">{earnings.completedTrips}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Feedback Log */}
                        <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
                            <div className="card-header bg-warning text-dark p-3">
                                <h5 className="mb-0">⭐ Feedback Log</h5>
                            </div>
                            <div className="card-body p-3 overflow-auto" style={{ maxHeight: '300px' }}>
                                {reviews.length === 0 ? (
                                    <div className="text-center text-muted p-4 small">No feedback yet.</div>
                                ) : (
                                    reviews.map(rev => (
                                        <div key={rev.id} className="review-card p-2 mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-warning">{'★'.repeat(rev.rating)}</span>
                                                <small className="text-muted small">ID: {rev.id}</small>
                                            </div>
                                            <p className="small text-dark mb-0 mt-1 italic">"{rev.comment}"</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;

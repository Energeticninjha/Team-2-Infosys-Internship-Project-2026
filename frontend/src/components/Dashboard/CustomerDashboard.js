import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const CarIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/741/741407.png',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: 'vehicle-marker-transition'
});

function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center);
    }, [center, map]);
    return null;
}

const CustomerDashboard = ({ logout }) => {
    // Basic Search State
    const [pickup, setPickup] = useState('');
    const [drop, setDrop] = useState('');
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropCoords, setDropCoords] = useState(null);

    // Routing & Selection
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRouteId, setSelectedRouteId] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]);

    // Live Tracking
    const [liveVehicles, setLiveVehicles] = useState([]);
    const [activeBooking, setActiveBooking] = useState(() => {
        const saved = localStorage.getItem('activeBooking');
        return saved ? JSON.parse(saved) : null;
    });

    // Persistent Route Path & Index
    const [persistentRoute, setPersistentRoute] = useState(() => {
        const saved = localStorage.getItem('persistentRoute');
        return saved ? JSON.parse(saved) : null;
    });
    const [currentIndex, setCurrentIndex] = useState(() => {
        return parseInt(localStorage.getItem('currentIndex') || '0');
    });

    // UX State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [viewMode, setViewMode] = useState('book');
    const [myTrips, setMyTrips] = useState([]);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // 1. Path Following Simulation Layer
    useEffect(() => {
        if (activeBooking && persistentRoute && currentIndex < persistentRoute.path.length) {
            const timer = setInterval(() => {
                const nextIndex = currentIndex + 1;
                if (nextIndex < persistentRoute.path.length) {
                    setCurrentIndex(nextIndex);
                    localStorage.setItem('currentIndex', nextIndex.toString());
                } else {
                    // Finished
                    setShowReviewModal(true);
                    clearInterval(timer);
                }
            }, 2000); // Move every 2 seconds
            return () => clearInterval(timer);
        }
    }, [activeBooking, persistentRoute, currentIndex]);

    // 2. Live Duration Counter
    useEffect(() => {
        if (activeBooking && !showReviewModal) {
            const timer = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [activeBooking, showReviewModal]);

    // 3. Polling for other vehicles (Only when NOT in active ride)
    useEffect(() => {
        const fetchLiveVehicles = async () => {
            if (activeBooking) return; // Hide distraction
            try {
                const response = await fetch('http://localhost:8080/api/vehicles/live');
                const data = await response.json();
                setLiveVehicles(data);
            } catch (error) { }
        };
        fetchLiveVehicles();
        const interval = setInterval(fetchLiveVehicles, 5000);
        return () => clearInterval(interval);
    }, [activeBooking]);

    // Restore state from storage
    useEffect(() => {
        if (activeBooking && persistentRoute) {
            setPickupCoords(persistentRoute.pickup);
            setDropCoords(persistentRoute.drop);
            setMapCenter(persistentRoute.path[currentIndex] || persistentRoute.pickup);
        }
    }, []);

    const geocode = async (query) => {
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            if (res.data && res.data.length > 0) {
                return {
                    lat: parseFloat(res.data[0].lat),
                    lon: parseFloat(res.data[0].lon),
                    display_name: res.data[0].display_name
                };
            }
            return null;
        } catch (e) { return null; }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const pLoc = await geocode(pickup);
            const dLoc = await geocode(drop);
            if (!pLoc || !dLoc) { alert("Location not found."); setLoading(false); return; }

            setPickupCoords([pLoc.lat, pLoc.lon]);
            setDropCoords([dLoc.lat, dLoc.lon]);
            setMapCenter([pLoc.lat, pLoc.lon]);

            const response = await fetch('http://localhost:8080/api/fleet/optimize-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startLocation: pickup, endLocation: drop,
                    startLat: pLoc.lat, startLng: pLoc.lon,
                    endLat: dLoc.lat, endLng: dLoc.lon,
                    optimizationMode: 'fastest'
                })
            });
            const data = await response.json();
            setRoutes(data);
        } catch (error) { alert("Error calculating route."); }
        finally { setLoading(false); }
    };

    const confirmBooking = async () => {
        if (!selectedRouteId || !selectedVehicle) { alert("Select route and vehicle."); return; }

        const routeObj = routes.find(r => r.id === selectedRouteId);

        try {
            const payload = {
                userId: localStorage.getItem('userId') || 1,
                vehicleId: selectedVehicle.id,
                startLocation: pickup,
                endLocation: drop,
                price: 150.0 + (Math.random() * 50),
                estimatedTime: routeObj?.duration || "20 mins",
                routeId: selectedRouteId
            };

            const response = await fetch('http://localhost:8080/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const bookingData = await response.json();
                setActiveBooking(bookingData);

                const routeData = {
                    path: routeObj.path,
                    pickup: pickupCoords,
                    drop: dropCoords
                };
                setPersistentRoute(routeData);
                setCurrentIndex(0);
                setElapsedSeconds(0);

                localStorage.setItem('activeBooking', JSON.stringify(bookingData));
                localStorage.setItem('persistentRoute', JSON.stringify(routeData));
                localStorage.setItem('currentIndex', '0');

                setRoutes([]);
            }
        } catch (error) { }
    };

    const submitReview = async () => {
        try {
            console.log("Submitting review for booking:", activeBooking.id);
            const response = await fetch(`http://localhost:8080/api/bookings/${activeBooking.id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: reviewForm.rating,
                    comment: reviewForm.comment
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error("Submission failed:", errorData);
                throw new Error(errorData || "Server responded with error");
            }

            localStorage.removeItem('activeBooking');
            localStorage.removeItem('persistentRoute');
            localStorage.removeItem('currentIndex');
            setActiveBooking(null);
            setPersistentRoute(null);
            setShowReviewModal(false);
            setCurrentIndex(0);
            setElapsedSeconds(0);
            setPickup(''); setDrop('');
            alert("Thanks for your review!");
        } catch (e) {
            console.error("Review Error:", e);
            alert("Failed to submit review: " + e.message);
        }
    };

    const loadMyTrips = async () => {
        try {
            const uid = localStorage.getItem('userId');
            console.log("🔍 Fetching History for User ID:", uid);
            if (!uid) {
                console.warn("⚠️ No User ID found in localStorage. History might be empty.");
                setMyTrips([]);
                setViewMode('trips');
                return;
            }
            const res = await axios.get(`http://localhost:8080/api/bookings/user/${uid}`);
            console.log("✅ Received Trips:", res.data.length);
            setMyTrips(res.data.sort((a, b) => b.id - a.id));
            setViewMode('trips');
        } catch (e) {
            console.error("Trip History Fetch Error:", e);
            alert("Failed to load trips.");
        }
    };

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper to format MySQL timestamp to 'Oct 24, 10:30 AM'
    const formatHistoryDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="container-fluid p-0 min-vh-100 d-flex flex-column bg-white">
            <nav className="navbar navbar-dark bg-primary shadow-sm">
                <div className="container-fluid">
                    <span className="navbar-brand fw-bold">🚗 NeuroFleetX</span>
                    <div>
                        <button className="btn btn-sm btn-light me-2 fw-bold" onClick={() => setViewMode('book')}>Book Ride</button>
                        <button className="btn btn-sm btn-outline-light me-3 fw-bold" onClick={loadMyTrips}>My Trips</button>
                        <button className="btn btn-danger btn-sm fw-bold" onClick={logout}>Logout</button>
                    </div>
                </div>
            </nav>

            <div className="row flex-grow-1 g-0">
                <div className="col-md-4 p-4 shadow-lg bg-light" style={{ zIndex: 1000, overflowY: 'auto', maxHeight: '92vh' }}>

                    {viewMode === 'book' && (
                        <>
                            {!activeBooking && (
                                <>
                                    <h4 className="mb-4 text-primary">Where to?</h4>
                                    <form onSubmit={handleSearch}>
                                        <div className="mb-3 input-group overflow-hidden rounded-3 shadow-sm">
                                            <span className="input-group-text bg-white border-end-0">📍</span>
                                            <input type="text" className="form-control border-start-0" placeholder="Pickup Location" value={pickup} onChange={(e) => setPickup(e.target.value)} required />
                                        </div>
                                        <div className="mb-4 input-group overflow-hidden rounded-3 shadow-sm">
                                            <span className="input-group-text bg-white border-end-0">🏁</span>
                                            <input type="text" className="form-control border-start-0" placeholder="Destination" value={drop} onChange={(e) => setDrop(e.target.value)} required />
                                        </div>
                                        <button type="submit" className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow" disabled={loading}>
                                            {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Find Best Routes'}
                                        </button>
                                    </form>

                                    {routes.length > 0 && (
                                        <div className="mt-4">
                                            <div className="row g-3 mb-4">
                                                {routes.map(r => (
                                                    <div key={r.id} className="col-6">
                                                        <div
                                                            className={`card h-100 border-0 shadow-sm rounded-4 cursor-pointer selection-card ${selectedRouteId === r.id ? 'active' : ''}`}
                                                            onClick={() => setSelectedRouteId(r.id)}
                                                            style={{ cursor: 'pointer', transition: '0.3s' }}
                                                        >
                                                            <div className={`card-header border-0 py-2 rounded-top-4 ${r.mode.includes('Blue') ? 'bg-primary' : 'bg-success'} text-white`}>
                                                                <small className="fw-bold">{r.mode}</small>
                                                            </div>
                                                            <div className="card-body p-3">
                                                                <h5 className="fw-bold mb-0">{r.duration}</h5>
                                                                <small className="text-muted">{r.distance}</small>
                                                                <div className="mt-2">
                                                                    <span className="badge bg-light text-dark border">{r.trafficStatus}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <h6 className="text-muted fw-bold mb-3 small text-uppercase">Available Vehicles</h6>
                                            <div className="list-group mb-3">
                                                {liveVehicles.map(v => (
                                                    <button key={v.id} className={`list-group-item list-group-item-action border-0 mb-2 rounded-3 shadow-sm p-3 ${selectedVehicle?.id === v.id ? 'border-2 border-primary' : ''}`} onClick={() => setSelectedVehicle(v)}>
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div>
                                                                <h6 className="mb-0 fw-bold">{v.model}</h6>
                                                                <small className="text-muted">{v.numberPlate}</small>
                                                            </div>
                                                            <span className="badge bg-warning text-dark">⭐ {v.driverRating}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mt-2 small">
                                                            <div className="d-flex align-items-center">
                                                                <span className="text-secondary me-3">👤 {v.driverName}</span>
                                                                <span className="badge bg-light text-dark border">💺 {v.seats || 4} Seats</span>
                                                            </div>
                                                            <span className="fw-bold text-success">₹{150 + v.id * 10}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            <button className="btn btn-success w-100 py-3 fw-bold shadow-lg rounded-3 mt-2" disabled={!selectedRouteId || !selectedVehicle} onClick={confirmBooking}>
                                                CONFIRM RIDE
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {activeBooking && (
                                <div className="text-center animate__animated animate__fadeIn">
                                    <div className="mb-4">
                                        <div className="spinner-grow text-primary mb-3" style={{ width: '3rem', height: '3rem' }}></div>
                                        <h4 className="fw-bold">Ride in Progress</h4>

                                        <div className="row g-2 mt-4">
                                            <div className="col-6">
                                                <div className="card border-0 bg-white shadow-sm p-3">
                                                    <small className="text-muted fw-bold d-block mb-1">EXPECTED</small>
                                                    <h4 className="fw-bold text-dark mb-0">{activeBooking.estimatedDuration || '20m'}</h4>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="card border-0 bg-primary text-white shadow-sm p-3">
                                                    <small className="text-white-50 fw-bold d-block mb-1">LIVE DURATION</small>
                                                    <h4 className="fw-bold mb-0">{formatTime(elapsedSeconds)}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                                        <div className="bg-primary p-3 text-white">
                                            <h6 className="mb-0">Driver: {activeBooking.vehicle.driverName}</h6>
                                        </div>
                                        <div className="card-body text-start">
                                            <p className="mb-1"><strong>Phone:</strong> {activeBooking.vehicle.driverContact}</p>
                                            <p className="mb-0"><strong>Vehicle:</strong> {activeBooking.vehicle.model}</p>
                                        </div>
                                    </div>
                                    <div className="alert alert-info border-0 rounded-3 shadow-sm p-3">
                                        <small className="fw-bold">Your car is following the blue path precisely. Please wait until arrival.</small>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {viewMode === 'trips' && (
                        <div>
                            <h4 className="mb-4 text-primary">Trip History</h4>
                            {myTrips.length === 0 ? (
                                <div className="text-center mt-5 text-muted">No trips yet.</div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {myTrips.map(trip => (
                                        <div key={trip.id} className="list-group-item border-0 mb-3 p-3 rounded-4 shadow-sm bg-white">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="badge bg-light text-dark border">ID: {trip.id}</span>
                                                <span className="badge bg-success">{trip.status}</span>
                                            </div>
                                            <div className="small fw-bold">{trip.startLocation} ➝ {trip.endLocation}</div>
                                            <div className="d-flex justify-content-between mt-2">
                                                <small className="text-muted">⏱️ Est: {trip.estimatedDuration || '20m'}</small>
                                                <small className="text-muted">🚗 {trip.vehicle?.model || 'Fleet'}</small>
                                            </div>
                                            <div className="d-flex justify-content-between mt-2 pt-2 border-top align-items-center">
                                                <small className="text-muted fw-bold">{formatHistoryDate(trip.startTime)}</small>
                                                <span className="fw-bold text-primary">₹{trip.amount}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="col-md-8 position-relative">
                    <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                        <ChangeView center={mapCenter} />
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {persistentRoute && (
                            <>
                                {/* Segmented Polyline for Active Ride */}
                                {persistentRoute.path.map((point, i) => {
                                    if (i === 0) return null;
                                    const prevPoint = persistentRoute.path[i - 1];
                                    // Simulated Traffic zones: red for slow, green for fast
                                    const color = i % 10 < 3 ? '#ff4d4d' : '#2ecc71';
                                    return (
                                        <Polyline
                                            key={i}
                                            positions={[prevPoint, point]}
                                            pathOptions={{ color, weight: 8, opacity: 0.9 }}
                                        />
                                    );
                                })}
                                <Marker position={persistentRoute.pickup}><Popup>Pickup</Popup></Marker>
                                <Marker position={persistentRoute.drop}><Popup>Destination</Popup></Marker>

                                {/* Deterministic Path-Following Marker */}
                                <Marker position={persistentRoute.path[currentIndex]} icon={CarIcon}>
                                    <Popup><b>Your Ride</b><br />{activeBooking?.vehicle.model}</Popup>
                                </Marker>
                            </>
                        )}

                        {!activeBooking && routes.map(r => (
                            <Polyline
                                key={r.id}
                                positions={r.path}
                                pathOptions={{
                                    color: r.mode.includes('Blue') ? '#0d6efd' : '#2ecc71',
                                    weight: selectedRouteId === r.id ? 8 : 4,
                                    opacity: selectedRouteId === r.id ? 0.8 : 0.4
                                }}
                            />
                        ))}

                        {/* Hide other vehicles if ride is active */}
                        {!activeBooking && liveVehicles.map(v => (
                            <Marker key={v.id} position={[v.latitude, v.longitude]} icon={CarIcon}>
                                <Popup><b>{v.driverName}</b><br />{v.model}</Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>

            {showReviewModal && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
                    <div className="modal fade show d-block" style={{ zIndex: 1060 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                <div className="modal-header bg-warning border-0 p-4">
                                    <h4 className="modal-title fw-bold text-dark">Trip Finished! 🏁</h4>
                                </div>
                                <div className="modal-body p-4 text-center">
                                    <h5 className="mb-4">Rate your ride with <span className="text-primary">{activeBooking?.vehicle.driverName}</span></h5>
                                    <div className="display-4 mb-4">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <span key={s} className="pointer px-1" style={{ cursor: 'pointer', color: s <= reviewForm.rating ? '#ffc107' : '#dee2e6' }} onClick={() => setReviewForm({ ...reviewForm, rating: s })}>★</span>
                                        ))}
                                    </div>
                                    <textarea className="form-control rounded-3 border-0 bg-light p-3 mb-4" rows="3" placeholder="Feedback..." value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}></textarea>
                                    <button className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow" onClick={submitReview}>Submit Feedback</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .vehicle-marker-transition { transition: all 2.1s linear; }
                .pointer { cursor: pointer; }
                .selection-card:hover { transform: translateY(-5px); }
                .selection-card.active { border: 2px solid #0d6efd !important; background: #f0f7ff; }
            `}</style>
        </div>
    );
};

export default CustomerDashboard;

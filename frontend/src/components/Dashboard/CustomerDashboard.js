import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { MapPin, Navigation, Clock, Star, Battery, Calendar, CreditCard, ChevronRight, X, User, Car } from 'lucide-react';

// Layout & Design System
import MainLayout from '../Layout/MainLayout';
import Card from '../Common/Card';
import Button from '../Common/Button';
import '../../styles/dashboard.css'; // Keep for some map transitions if needed

// Assets
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

import ProfileSection from './ProfileSection';

// --- Leaflet Icons ---
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

// --- Helper Components ---
function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center);
    }, [center, map]);
    return null;
}
const DirectionsRenderer = ({ positions, color, weight, opacity }) => {
    return <Polyline positions={positions} pathOptions={{ color, weight, opacity }} />;
};

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

    // Search Inputs
    const [searchDate, setSearchDate] = useState('');
    const [searchTime, setSearchTime] = useState('');
    const [passengerCount, setPassengerCount] = useState(1);

    // Live Tracking
    const [liveVehicles, setLiveVehicles] = useState([]);
    const [activeBooking, setActiveBooking] = useState(() => {
        const saved = sessionStorage.getItem('activeBooking');
        const parsed = saved ? JSON.parse(saved) : null;
        if (parsed && parsed.status === 'SCHEDULED') return null;
        return parsed;
    });

    // Persistent Route Path & Index
    const [persistentRoute, setPersistentRoute] = useState(() => {
        const saved = sessionStorage.getItem('persistentRoute');
        return saved ? JSON.parse(saved) : null;
    });
    const [currentIndex, setCurrentIndex] = useState(() => {
        return parseInt(sessionStorage.getItem('currentIndex') || '0');
    });

    // UX State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [activeView, setActiveView] = useState('book'); // 'book', 'trips', 'profile'
    const [myTrips, setMyTrips] = useState([]);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [recommendations, setRecommendations] = useState([]);
    const [filters, setFilters] = useState({ type: 'All', seats: 'All', engine: 'All' });
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingTime, setBookingTime] = useState('');
    const [selectedDuration, setSelectedDuration] = useState(1);

    // Suggestion Data
    const [travelSuggestions, setTravelSuggestions] = useState([]);
    const [tripsResults, setTripsResults] = useState([]);
    const [selectedTripResult, setSelectedTripResult] = useState(null);
    const [popupInfo, setPopupInfo] = useState({ show: false, message: '', type: 'success' });

    // URL Param Check (for sidebar navigation)
    // URL Param Check
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'trips') {
            setActiveView('trips');
        }
    }, [window.location.search]);

    // Load trips when view changes
    useEffect(() => {
        if (activeView === 'trips') {
            loadMyTrips();
        }
    }, [activeView]);

    useEffect(() => {
        // Fetch suggestions for dropdown
        const fetchSuggestions = async () => {
            try {
                const res = await axios.get('http://localhost:8083/api/trips/recommendations');
                setTravelSuggestions(res.data || []);
            } catch (e) { console.warn("Failed to fetch suggestions"); }
        };
        fetchSuggestions();
    }, []);

    // 1. Path Following Simulation Layer
    useEffect(() => {
        if (activeBooking && persistentRoute && currentIndex < persistentRoute.path.length) {
            const timer = setInterval(() => {
                if (activeBooking.scheduledStartTime) {
                    const sched = new Date(activeBooking.scheduledStartTime);
                    if (sched > new Date()) return;
                }

                const nextIndex = currentIndex + 1;
                if (nextIndex < persistentRoute.path.length) {
                    setCurrentIndex(nextIndex);
                    sessionStorage.setItem('currentIndex', nextIndex.toString());
                } else {
                    setShowReviewModal(true);
                    clearInterval(timer);
                }
            }, 2000);
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

    // 3. Polling for other vehicles
    useEffect(() => {
        const fetchLiveVehicles = async () => {
            if (activeBooking) return;
            try {
                const response = await fetch('http://localhost:8083/api/vehicles/live');
                const data = await response.json();
                setLiveVehicles(data);
            } catch (error) { }
        };
        fetchLiveVehicles();
        const interval = setInterval(fetchLiveVehicles, 5000);
        return () => clearInterval(interval);
    }, [activeBooking]);

    // Restore state
    useEffect(() => {
        if (activeBooking && persistentRoute) {
            setPickupCoords(persistentRoute.pickup);
            setDropCoords(persistentRoute.drop);
            setMapCenter(persistentRoute.path[currentIndex] || persistentRoute.pickup);
        }
    }, []);

    // Set default booking time
    useEffect(() => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localIso = new Date(now - offset).toISOString();
        setSearchDate(localIso.slice(0, 10));
        setSearchTime(localIso.slice(11, 16));
        setBookingTime(localIso.slice(0, 16));
    }, []);

    const geocode = async (query) => {
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=in`);
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
            if (!pLoc || !dLoc) { setPopupInfo({ show: true, message: "Location not found.", type: 'error' }); setLoading(false); return; }

            setPickupCoords([pLoc.lat, pLoc.lon]);
            setDropCoords([dLoc.lat, dLoc.lon]);
            setMapCenter([pLoc.lat, pLoc.lon]);

            // 1. Fetch Visual Route
            try {
                const response = await fetch('http://localhost:8083/api/fleet/optimize-route', {
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
            } catch (err) { console.warn("Route fetch failed"); }

            // 2. Fetch Trips
            const combinedDateTime = `${searchDate}T${searchTime}`;
            const tripRes = await axios.get('http://localhost:8083/api/trips/search', {
                params: { from: pickup, to: drop, date: searchDate }
            });
            // Sort: Online drivers first
            const sortedResults = (tripRes.data || []).sort((a, b) => {
                const aOnline = a.driver?.isOnline ? 1 : 0;
                const bOnline = b.driver?.isOnline ? 1 : 0;
                return bOnline - aOnline;
            });
            setTripsResults(sortedResults);

            // Recommendations
            try {
                const uid = sessionStorage.getItem('userId') || 1;
                const recRes = await axios.get(`http://localhost:8083/api/recommendations/${uid}`);
                setRecommendations(recRes.data);
            } catch (e) { }

        } catch (error) {
            console.error("Search Error:", error);
            setPopupInfo({ show: true, message: "Error searching for rides.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const openBookingModal = (vehicle) => {
        setSelectedVehicle(vehicle);
        setShowBookingModal(true);
    };

    const confirmBooking = async () => {
        if (!selectedRouteId || !selectedVehicle) { setPopupInfo({ show: true, message: "Select route and vehicle.", type: 'error' }); return; }
        const routeObj = routes.find(r => r.id === selectedRouteId);
        try {
            // Build payload based on whether we have a trip result or not
            const payload = {
                userId: sessionStorage.getItem('userId') || 1,
                vehicleId: selectedVehicle.id,
                startLocation: pickup,
                endLocation: drop,
                estimatedTime: routeObj?.duration || "20 mins",
                routeId: selectedRouteId,
                scheduledStartTime: bookingTime || `${searchDate}T${searchTime}:00`,
                passengerCount: parseInt(passengerCount)
            };

            // If booking from a posted trip, include trip and driver details
            if (selectedTripResult) {
                payload.tripId = selectedTripResult.trip?.id;
                payload.driverId = selectedTripResult.driver?.id;
                payload.price = (selectedTripResult.trip?.pricePerSeat || 150) * parseInt(passengerCount);

                console.log('🎯 Booking with driverId:', payload.driverId, 'from trip:', payload.tripId);
            } else {
                // Fallback to old pricing for direct vehicle bookings
                // Note: For direct vehicle bookings, we need to find the driver from the vehicle
                // This requires the vehicle to have driver information
                payload.price = (150 + (selectedVehicle.id || 0) * 10) + (selectedDuration * 125);
                payload.durationHours = selectedDuration;

                console.warn('⚠️ Direct vehicle booking - driverId may not be set');
            }


            const response = await fetch('http://localhost:8083/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const bookingData = await response.json();

                // For trip-based bookings, always show as PENDING and go to My Trips
                if (selectedTripResult || bookingData.status === 'PENDING' || bookingData.status === 'SCHEDULED') {
                    setPopupInfo({ show: true, message: "✅ Ride Requested! Waiting for Driver to Confirm.", type: 'success' });
                    // Clear search results
                    setRoutes([]);
                    setTripsResults([]);
                    setPickup('');
                    setDrop('');
                    setShowBookingModal(false);
                    setSelectedTripResult(null);
                    setSelectedVehicle(null);
                    // Navigate to My Trips view
                    loadMyTrips();
                    return;
                }

                // Legacy flow for immediate confirmed bookings
                setActiveBooking(bookingData);
                const routeData = {
                    path: routeObj.path,
                    pickup: pickupCoords,
                    drop: dropCoords
                };
                setPersistentRoute(routeData);
                setCurrentIndex(0);
                setElapsedSeconds(0);
                sessionStorage.setItem('activeBooking', JSON.stringify(bookingData));
                sessionStorage.setItem('persistentRoute', JSON.stringify(routeData));
                sessionStorage.setItem('currentIndex', '0');
                setRoutes([]);
                setShowBookingModal(false);
            }
        } catch (error) {
            console.error("Booking error:", error);
            setPopupInfo({ show: true, message: "Failed to create booking. Please try again.", type: 'error' });
        }
    };

    const submitReview = async () => {
        try {
            await fetch(`http://localhost:8083/api/bookings/${activeBooking.id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: reviewForm.rating, comment: reviewForm.comment })
            });
            sessionStorage.removeItem('activeBooking');
            sessionStorage.removeItem('persistentRoute');
            sessionStorage.removeItem('currentIndex');
            setActiveBooking(null);
            setPersistentRoute(null);
            setShowReviewModal(false);
            setPickup(''); setDrop('');
            setPopupInfo({ show: true, message: "Thanks for your review!", type: 'success' });
        } catch (e) { console.error(e); }
    };

    const loadMyTrips = async () => {
        try {
            const uid = sessionStorage.getItem('userId');
            if (!uid) return;
            const res = await axios.get(`http://localhost:8083/api/bookings/user/${uid}`);
            setMyTrips(res.data.sort((a, b) => b.id - a.id));
            setActiveView('trips');
        } catch (e) {
            setPopupInfo({ show: true, message: "Failed to load trips.", type: 'error' });
        }
    };

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatHistoryDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // --- Render ---

    return (
        <MainLayout title="Customer Dashboard" role="customer" activeView={activeView} onViewChange={setActiveView} logout={logout}>
            {/* Split View Container */}
            <div className="position-relative w-100 h-100">

                {/* --- Map Layer (Always Present) --- */}
                <div className="position-absolute w-100 h-100" style={{ top: 0, left: 0, zIndex: 0 }}>
                    <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                        <ChangeView center={mapCenter} />
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {/* Current Ride Path */}
                        {persistentRoute && (
                            <>
                                <Polyline positions={persistentRoute.path} pathOptions={{ color: '#0d6efd', weight: 6, opacity: 0.8 }} />
                                <Marker position={persistentRoute.pickup}><Popup>Pickup</Popup></Marker>
                                <Marker position={persistentRoute.drop}><Popup>Destination</Popup></Marker>
                                <Marker position={persistentRoute.path[currentIndex]} icon={CarIcon}><Popup><b>Your Ride</b></Popup></Marker>
                            </>
                        )}

                        {/* Route Options (Before Booking) */}
                        {!activeBooking && routes.map(r => (
                            <DirectionsRenderer
                                key={r.id}
                                positions={r.path}
                                color={r.mode.includes('Blue') ? '#0d6efd' : '#2ecc71'}
                                weight={selectedRouteId === r.id ? 8 : 4}
                                opacity={selectedRouteId === r.id ? 0.9 : 0.5}
                            />
                        ))}

                        {/* Available Vehicles */}
                        {!activeBooking && liveVehicles.map(v => (
                            <Marker key={v.id} position={[v.latitude, v.longitude]} icon={CarIcon}>
                                <Popup><b>{v.driverName}</b><br />{v.model}</Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                {/* --- Left Floating Panel (Booking Flow) --- */}
                {activeView === 'book' && (
                    <div className="position-absolute top-0 start-0 h-100 p-3 overflow-hidden d-none d-md-block" style={{ width: '420px', zIndex: 10 }}>
                        <Card className="h-100 d-flex flex-column shadow-lg border-0" noPadding>
                            <div className="p-4 d-flex flex-column h-100 overflow-auto">
                                <h4 className="fw-bold mb-4">Where to today?</h4>

                                {/* Search Form */}
                                {!activeBooking && (
                                    <form onSubmit={handleSearch} className="mb-4">
                                        <div className="mb-3 position-relative">
                                            <MapPin className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                            <input
                                                list="recommendations-list"
                                                className="form-control ps-5 py-3 rounded-3"
                                                placeholder="Pickup Location"
                                                value={pickup}
                                                onChange={(e) => {
                                                    setPickup(e.target.value);
                                                    const match = travelSuggestions.find(s => s.label === e.target.value);
                                                    if (match) { setPickup(match.startLocation); setDrop(match.endLocation); }
                                                }}
                                                style={{ backgroundColor: 'var(--bg-app)', border: 'none', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                        <div className="mb-3 position-relative">
                                            <Navigation className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                            <input
                                                type="text"
                                                className="form-control ps-5 py-3 rounded-3"
                                                placeholder="Destination"
                                                value={drop}
                                                onChange={(e) => setDrop(e.target.value)}
                                                style={{ backgroundColor: 'var(--bg-app)', border: 'none', color: 'var(--text-main)' }}
                                            />
                                        </div>

                                        <div className="row g-2 mb-3">
                                            <div className="col-6">
                                                <input type="date" className="form-control py-3 rounded-3 border-0" value={searchDate} onChange={e => setSearchDate(e.target.value)} style={{ backgroundColor: 'var(--bg-app)' }} />
                                            </div>
                                            <div className="col-6">
                                                <input type="time" className="form-control py-3 rounded-3 border-0" value={searchTime} onChange={e => setSearchTime(e.target.value)} style={{ backgroundColor: 'var(--bg-app)' }} />
                                            </div>
                                        </div>

                                        <div className="mb-3 position-relative">
                                            <User className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                            <input
                                                type="number" min="1" max="10"
                                                className="form-control ps-5 py-3 rounded-3 border-0"
                                                placeholder="No. of Passengers"
                                                value={passengerCount}
                                                onChange={(e) => setPassengerCount(e.target.value)}
                                                style={{ backgroundColor: 'var(--bg-app)' }}
                                            />
                                        </div>

                                        <datalist id="recommendations-list">
                                            {travelSuggestions.map((s, i) => <option key={i} value={s.label}>{s.startLocation} to {s.endLocation}</option>)}
                                        </datalist>
                                        <Button type="submit" className="w-100 py-3 rounded-3 shadow-sm">{loading ? 'Searching...' : 'Find Route'}</Button>
                                    </form>
                                )}

                                {/* Route Selection */}
                                {routes.length > 0 && !activeBooking && (
                                    <div className="mb-4">
                                        <h6 className="text-muted text-uppercase small fw-bold mb-3">Suggested Routes</h6>
                                        <div className="d-flex gap-2 overflow-auto pb-2">
                                            {routes.map(r => (
                                                <div
                                                    key={r.id}
                                                    className={`p-3 rounded-3 cursor-pointer border ${selectedRouteId === r.id ? 'border-primary bg-primary-subtle' : 'bg-light'}`}
                                                    onClick={() => setSelectedRouteId(r.id)}
                                                    style={{ minWidth: '140px' }}
                                                >
                                                    <div className="fw-bold text-primary">{r.duration}</div>
                                                    <small className="text-muted">{r.distance}</small>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Vehicle List */}
                                {(tripsResults.length > 0 || liveVehicles.length > 0) && !activeBooking && (
                                    <div className="flex-grow-1">
                                        <h6 className="text-muted text-uppercase small fw-bold mb-3">Available Rides</h6>
                                        <div className="d-flex flex-column gap-3">
                                            {tripsResults.length > 0 ? tripsResults.map((res) => (
                                                <div
                                                    key={res.trip.id}
                                                    className={`p-3 rounded-3 border hover-bg-light cursor-pointer transition-all d-flex align-items-center justify-content-between ${selectedTripResult?.trip.id === res.trip.id ? 'border-primary ring-1' : ''}`}
                                                    onClick={() => {
                                                        setSelectedTripResult(res);
                                                        setSelectedVehicle(res.vehicle);
                                                        setShowBookingModal(true);
                                                    }}
                                                >
                                                    <div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <h6 className="mb-0 fw-bold">{res.vehicle?.model}</h6>
                                                            {res.driver?.isOnline ? (
                                                                <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.65rem' }}>ONLINE</span>
                                                            ) : (
                                                                <span className="badge bg-secondary-subtle text-danger" style={{ fontSize: '0.65rem' }}>OFFLINE</span>
                                                            )}
                                                        </div>
                                                        <small className="text-muted">₹{res.trip.pricePerSeat} /seat • {res.driver?.name}</small>
                                                    </div>
                                                    <ChevronRight size={18} className="text-muted" />
                                                </div>
                                            )) : liveVehicles.map(v => (
                                                <div
                                                    key={v.id}
                                                    className={`p-3 rounded-3 border hover-bg-light cursor-pointer transition-all ${selectedVehicle?.id === v.id ? 'border-primary ring-1' : ''}`}
                                                    onClick={() => openBookingModal(v)}
                                                >
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <h6 className="mb-0 fw-bold">{v.model}</h6>
                                                            {v.ev && <span className="badge bg-success-subtle text-success">EV</span>}
                                                        </div>
                                                        <span className="fw-bold text-primary">₹{150 + v.id * 10}</span>
                                                    </div>
                                                    <div className="d-flex gap-3 small text-secondary">
                                                        <span className="d-flex align-items-center gap-1"><Star size={12} className="text-warning fill-warning" /> {v.driverRating}</span>
                                                        <span className="d-flex align-items-center gap-1"><User size={12} /> {v.seats}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Active Booking Status */}
                                {activeBooking && (
                                    <div className="mt-auto">
                                        <div className="alert alert-primary border-0 d-flex flex-column align-items-center p-4">
                                            <div className="spinner-border text-primary mb-3"></div>
                                            <h5 className="fw-bold">Ride in Progress</h5>
                                            <p className="text-center small mb-0">Your driver <b>{activeBooking.vehicle.driverName}</b> is on the way.</p>
                                        </div>
                                        <div className="d-flex gap-2 mt-3">
                                            <Card className="flex-fill text-center p-2 bg-light border-0">
                                                <small className="text-muted d-block uppercase x-small">ETA</small>
                                                <span className="fw-bold">{activeBooking.estimatedDuration}</span>
                                            </Card>
                                            <Card className="flex-fill text-center p-2 bg-primary text-white border-0">
                                                <small className="text-white-50 d-block uppercase x-small">TIME</small>
                                                <span className="fw-bold">{formatTime(elapsedSeconds)}</span>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* --- Trip History Mode (Full Overlay) --- */}
                {activeView === 'trips' && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 p-4" style={{ zIndex: 20, backgroundColor: 'var(--bg-app)', overflowY: 'auto' }}>
                        <div className="container" style={{ maxWidth: '800px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="fw-bold m-0">Trip History</h3>
                                <Button variant="ghost" onClick={() => setActiveView('book')}>Close</Button>
                            </div>

                            {myTrips.length === 0 ? (
                                <div className="text-center py-5 text-muted">No trips found.</div>
                            ) : (
                                <div className="d-flex flex-column gap-3">
                                    {myTrips.map(trip => (
                                        <Card key={trip.id} className="d-flex flex-column flex-md-row gap-4 align-items-center">
                                            <div className="bg-light p-3 rounded-3 d-flex flex-column align-items-center" style={{ minWidth: '100px' }}>
                                                <Calendar size={24} className="text-primary mb-2" />
                                                <small className="fw-bold">{new Date(trip.startTime || trip.scheduledStartTime).getDate()}</small>
                                                <small className="text-muted text-uppercase" style={{ fontSize: '10px' }}>
                                                    {new Date(trip.startTime || trip.scheduledStartTime).toLocaleString('default', { month: 'short' })}
                                                </small>
                                            </div>
                                            <div className="flex-grow-1 w-100">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <h6 className="fw-bold mb-1">{trip.startLocation} → {trip.endLocation}</h6>
                                                        <span className={`badge ${(trip.status === 'COMPLETED' || trip.status === 'CONFIRMED') ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                                                            {trip.status}
                                                        </span>
                                                    </div>
                                                    <h5 className="fw-bold text-primary">₹{trip.amount}</h5>
                                                </div>
                                                <p className="text-muted small mb-0">
                                                    Vehicle: {trip.vehicle?.model} • Duration: {trip.estimatedDuration}
                                                </p>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- Profile Mode (Full Overlay) --- */}
                {activeView === 'profile' && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 p-4 animate__animated animate__fadeIn" style={{ zIndex: 25, backgroundColor: 'var(--bg-app)', overflowY: 'auto' }}>
                        <div className="container" style={{ maxWidth: '800px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h3 className="fw-bold m-0">My Profile</h3>
                                <Button variant="ghost" onClick={() => setActiveView('book')}>Close</Button>
                            </div>
                            <ProfileSection userId={sessionStorage.getItem('userId')} />
                        </div>
                    </div>
                )}

                {/* --- Modals --- */}
                {showBookingModal && (
                    <div
                        className="modal-backdrop-glass d-flex align-items-center justify-content-center"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 1050,
                            background: 'rgba(0,0,0,0.5)',
                            overflowY: 'auto',
                            padding: '20px 0'
                        }}
                    >
                        <div
                            className="bg-white rounded-4 shadow-lg"
                            style={{
                                width: '700px',
                                maxWidth: '95%',
                                margin: 'auto',
                                maxHeight: 'none'
                            }}
                        >
                            {console.log('🔍 Booking Modal - selectedTripResult:', selectedTripResult)}
                            {console.log('🔍 Booking Modal - selectedVehicle:', selectedVehicle)}
                            <div className="bg-primary p-4 text-white">
                                <h5 className="fw-bold mb-0">Confirm Booking</h5>
                                <small className="text-white-50">Review trip details before confirming</small>
                            </div>
                            <div className="p-4">
                                {/* Driver & Vehicle Details */}
                                {(selectedTripResult || selectedVehicle) && (
                                    <>
                                        {selectedTripResult?.driver && (
                                            <div className="mb-4">
                                                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                                    <User size={18} className="text-primary" />
                                                    Driver Details
                                                </h6>
                                                <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3">
                                                    <img
                                                        src={selectedTripResult.driver?.profilePhotoUrl || "https://randomuser.me/api/portraits/men/32.jpg"}
                                                        className="rounded-circle"
                                                        width="50"
                                                        height="50"
                                                        alt="Driver"
                                                    />
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <strong>{selectedTripResult.driver?.name || "Unknown Driver"}</strong>
                                                            {selectedTripResult.driver?.isOnline ? (
                                                                <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.65rem' }}>ONLINE</span>
                                                            ) : (
                                                                <span className="badge bg-secondary-subtle text-danger" style={{ fontSize: '0.65rem' }}>OFFLINE</span>
                                                            )}
                                                        </div>
                                                        <small className="text-muted">{selectedTripResult.driver?.phone || "N/A"}</small>
                                                        <div className="d-flex align-items-center gap-1 mt-1">
                                                            <Star size={14} className="text-warning fill-warning" />
                                                            <small className="fw-bold">{selectedTripResult.vehicle?.driverRating || '4.8'}</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mb-4">
                                            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                                <Car size={18} className="text-primary" />
                                                Vehicle Details
                                            </h6>
                                            <div className="p-3 bg-light rounded-3">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <h6 className="mb-1 fw-bold">{selectedTripResult?.vehicle?.model || selectedVehicle?.model || 'Vehicle'}</h6>
                                                        <small className="text-muted">{selectedTripResult?.vehicle?.numberPlate || selectedVehicle?.numberPlate || 'N/A'}</small>
                                                    </div>
                                                    <div className="d-flex gap-1">
                                                        <span className="badge bg-white text-secondary border">{selectedTripResult?.vehicle?.type || selectedVehicle?.type || 'Sedan'}</span>
                                                        {(selectedTripResult?.vehicle?.ev || selectedVehicle?.ev) && <span className="badge bg-success-subtle text-success">EV</span>}
                                                    </div>
                                                </div>
                                                <div className="d-flex gap-3 small text-muted">
                                                    <span>🪑 {selectedTripResult?.vehicle?.seats || selectedVehicle?.seats || 4} Seats</span>
                                                    {selectedTripResult?.trip?.pricePerSeat && (
                                                        <span>💰 ₹{selectedTripResult.trip.pricePerSeat} /seat</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Trip Route Information */}
                                <div className="mb-4">
                                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                                        <Navigation size={18} className="text-primary" />
                                        Trip Route
                                    </h6>
                                    <div className="p-3 bg-light rounded-3">
                                        <div className="d-flex align-items-center gap-3 mb-2">
                                            <MapPin size={16} className="text-success" />
                                            <div>
                                                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>PICKUP</small>
                                                <strong>{pickup}</strong>
                                            </div>
                                        </div>
                                        <div className="ps-2 border-start border-2 border-primary ms-2" style={{ height: '20px' }}></div>
                                        <div className="d-flex align-items-center gap-3">
                                            <MapPin size={16} className="text-danger" />
                                            <div>
                                                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>DROP-OFF</small>
                                                <strong>{drop}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Map Preview */}
                                {selectedRouteId && routes.length > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold mb-2">Route Preview</h6>
                                        <div style={{ height: '200px', borderRadius: '12px', overflow: 'hidden' }}>
                                            <MapContainer
                                                center={pickupCoords || mapCenter}
                                                zoom={10}
                                                style={{ height: "100%", width: "100%" }}
                                                zoomControl={false}
                                                dragging={false}
                                                scrollWheelZoom={false}
                                            >
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                {pickupCoords && <Marker position={pickupCoords}><Popup>Pickup</Popup></Marker>}
                                                {dropCoords && <Marker position={dropCoords}><Popup>Drop-off</Popup></Marker>}
                                                {routes.find(r => r.id === selectedRouteId) && (
                                                    <Polyline
                                                        positions={routes.find(r => r.id === selectedRouteId).path}
                                                        pathOptions={{ color: '#0d6efd', weight: 4 }}
                                                    />
                                                )}
                                            </MapContainer>
                                        </div>
                                        {routes.find(r => r.id === selectedRouteId) && (
                                            <div className="d-flex gap-3 mt-2 small text-muted">
                                                <span>📏 {routes.find(r => r.id === selectedRouteId).distance}</span>
                                                <span>⏱️ {routes.find(r => r.id === selectedRouteId).duration}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Driver & Vehicle Details */}


                                {/* Booking Schedule */}
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted d-flex align-items-center gap-2">
                                        <Clock size={16} />
                                        Schedule
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="form-control"
                                        value={bookingTime}
                                        onChange={e => setBookingTime(e.target.value)}
                                    />
                                </div>

                                {/* Passenger Count */}
                                <div className="mb-4">
                                    <label className="form-label small fw-bold text-muted d-flex align-items-center gap-2">
                                        <User size={16} />
                                        Number of Passengers
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        className="form-control"
                                        value={passengerCount}
                                        onChange={e => setPassengerCount(e.target.value)}
                                    />
                                </div>

                                {/* Price Summary */}
                                {selectedTripResult && (
                                    <div className="p-3 bg-primary bg-opacity-10 rounded-3 mb-4">
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted">Price per seat:</span>
                                            <span className="fw-bold">₹{selectedTripResult.trip?.pricePerSeat || 150}</span>
                                        </div>
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted">Passengers:</span>
                                            <span className="fw-bold">× {passengerCount}</span>
                                        </div>
                                        <hr className="my-2" />
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-bold">Total Amount:</span>
                                            <span className="fw-bold text-primary fs-5">₹{(selectedTripResult.trip?.pricePerSeat || 150) * passengerCount}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="d-flex gap-2">
                                    <Button variant="ghost" className="flex-fill" onClick={() => {
                                        setShowBookingModal(false);
                                        setSelectedTripResult(null);
                                    }}>Cancel</Button>
                                    <Button className="flex-fill" onClick={confirmBooking}>Confirm Booking</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showReviewModal && (
                    <div className="modal-backdrop-glass d-flex align-items-center justify-content-center" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1060, background: 'rgba(0,0,0,0.5)' }}>
                        <Card className="p-4 text-center" style={{ width: '400px' }}>
                            <div className="mb-3">
                                <div className="d-inline-flex bg-warning bg-opacity-10 p-3 rounded-circle text-warning mb-3">
                                    <Star size={32} />
                                </div>
                                <h4>Rate your Trip</h4>
                            </div>
                            <div className="d-flex justify-content-center gap-2 mb-4">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star
                                        key={s}
                                        size={28}
                                        fill={s <= reviewForm.rating ? "orange" : "none"}
                                        color={s <= reviewForm.rating ? "orange" : "#ddd"}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                                    />
                                ))}
                            </div>
                            <textarea
                                className="form-control mb-3"
                                rows="3"
                                placeholder="How was your ride?"
                                value={reviewForm.comment}
                                onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                            ></textarea>
                            <Button className="w-100" onClick={submitReview}>Submit Feedback</Button>
                        </Card>
                    </div>
                )}



            </div>
            {
                popupInfo.show && (
                    <div className="modal-backdrop-glass position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.5)' }}>
                        <Card className="shadow-lg p-4 text-center" style={{ maxWidth: '400px' }}>
                            <h4 className={`mb-3 ${popupInfo.type === 'error' ? 'text-danger' : 'text-success'}`}>
                                {popupInfo.type === 'error' ? 'Error' : 'Success'}
                            </h4>
                            <p className="mb-4">{popupInfo.message}</p>
                            <Button
                                onClick={() => setPopupInfo({ ...popupInfo, show: false })}
                                variant={popupInfo.type === 'error' ? 'danger' : 'primary'}
                            >
                                OK
                            </Button>
                        </Card>
                    </div>
                )
            }
        </MainLayout >
    );
};

export default CustomerDashboard;

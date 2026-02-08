import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { MapPin, Navigation, Clock, Star, Battery, Calendar, CreditCard, ChevronRight, X, User } from 'lucide-react';

// Layout & Design System
import MainLayout from '../Layout/MainLayout';
import Card from '../Common/Card';
import Button from '../Common/Button';
import '../../styles/dashboard.css'; // Keep for some map transitions if needed

// Assets
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import DriverDetailsModal from './DriverDetailsModal';
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
    const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [bookingTime, setBookingTime] = useState(() => new Date().toTimeString().slice(0, 5));
    const [selectedDuration, setSelectedDuration] = useState(1);

    // Suggestion Data
    const [travelSuggestions, setTravelSuggestions] = useState([]);
    const [tripsResults, setTripsResults] = useState([]);
    const [selectedTripResult, setSelectedTripResult] = useState(null);

    // URL Param Check (for sidebar navigation)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'trips') {
            loadMyTrips();
        } else {
            setActiveView('book');
        }
    }, [window.location.search]);

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
            if (!pLoc || !dLoc) { alert("Location not found."); setLoading(false); return; }

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

                // Enhance Data for Visualization (Blue vs Green)
                let enhancedRoutes = [];
                if (data && data.length > 0) {
                    // 1. Optimal Route (Green)
                    enhancedRoutes.push({ ...data[0], type: 'optimal', color: '#2ecc71', id: 'opt-1' });

                    // 2. Simulated Alternative Route (Blue) if not present
                    if (data.length === 1) {
                        const altPath = data[0].path.map(p => [p[0] + 0.001, p[1] - 0.001]); // Slight offset
                        enhancedRoutes.push({
                            id: 'alt-1',
                            path: altPath,
                            duration: parseInt(data[0].duration.split(' ')[0]) + 5 + " mins",
                            distance: (parseFloat(data[0].distance.split(' ')[0]) + 1.2).toFixed(1) + " km",
                            type: 'possible',
                            color: '#0d6efd' // Blue
                        });
                    } else {
                        // If API returned more, color them blue
                        data.slice(1).forEach((r, idx) => {
                            enhancedRoutes.push({ ...r, type: 'possible', color: '#0d6efd', id: `alt-${idx}` });
                        });
                    }
                }
                setRoutes(enhancedRoutes);
                if (enhancedRoutes.length > 0) setSelectedRouteId(enhancedRoutes[0].id);

            } catch (err) { console.warn("Route fetch failed"); }

            // 2. Fetch Trips
            const searchDate = bookingDate;
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
            alert("Error searching for rides.");
        } finally {
            setLoading(false);
        }
    };

    const openBookingModal = (vehicle) => {
        setSelectedVehicle(vehicle);
        setShowBookingModal(true);
    };

    const confirmBooking = async () => {
        if (!selectedRouteId || !selectedVehicle) { alert("Select route and vehicle."); return; }
        const routeObj = routes.find(r => r.id === selectedRouteId);
        try {
            const payload = {
                userId: sessionStorage.getItem('userId') || 1,
                vehicleId: selectedVehicle.id || (selectedTripResult?.vehicle?.id), // Handle both cases
                driverId: selectedTripResult?.driver?.id, // Ensure driver info is passed if selected from trips list
                startLocation: pickup,
                startLat: pickupCoords ? pickupCoords[0] : null,
                startLng: pickupCoords ? pickupCoords[1] : null,
                endLocation: drop,
                endLat: dropCoords ? dropCoords[0] : null,
                endLng: dropCoords ? dropCoords[1] : null,
                price: (150 + (selectedVehicle.id || 0) * 10) + (selectedDuration * 125),
                estimatedTime: routeObj?.duration || "20 mins",
                routeId: selectedRouteId,
                scheduledStartTime: new Date(`${bookingDate}T${bookingTime}`).toISOString(),
                durationHours: selectedDuration
            };
            const response = await fetch('http://localhost:8083/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // User Requirement: "take to the my tips page... status need to show 'pending'"
                alert("Booking Requested! Details sent to driver.");
                setRoutes([]);
                setShowBookingModal(false);
                setSelectedTripResult(null);
                loadMyTrips(); // Refresh trips list
                setActiveView('trips'); // Go to My Trips
                setPickup(''); setDrop(''); // Clear search
            }
        } catch (error) {
            alert("Booking Failed");
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
            alert("Thanks for your review!");
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
            alert("Failed to load trips.");
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
                                color={r.color || '#2ecc71'}
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
                            <div className="p-4 flex-column h-100 overflow-auto">
                                <h4 className="fw-bold mb-4">Where to go?</h4>

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

                                        {/* Date Input */}
                                        <div className="mb-3 position-relative">
                                            <Calendar className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                            <input
                                                type="date"
                                                className="form-control ps-5 py-3 rounded-3"
                                                value={bookingDate}
                                                onChange={(e) => setBookingDate(e.target.value)}
                                                style={{ backgroundColor: 'var(--bg-app)', border: 'none', color: 'var(--text-main)' }}
                                            />
                                        </div>

                                        {/* Time Input */}
                                        <div className="mb-3 position-relative">
                                            <Clock className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                            <input
                                                type="time"
                                                className="form-control ps-5 py-3 rounded-3"
                                                value={bookingTime}
                                                onChange={(e) => setBookingTime(e.target.value)}
                                                style={{ backgroundColor: 'var(--bg-app)', border: 'none', color: 'var(--text-main)' }}
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
                                {tripsResults.length > 0 && !activeBooking && (
                                    <div className="flex-grow-1">
                                        <h6 className="text-muted text-uppercase small fw-bold mb-3">Available Rides</h6>
                                        <div className="d-flex flex-column gap-3">
                                            {tripsResults.map((res) => {
                                                const v = res.vehicle || {};
                                                const d = res.driver || {};
                                                return (
                                                    <div
                                                        key={res.trip.id}
                                                        className={`p-3 rounded-3 border hover-bg-light cursor-pointer transition-all ${selectedTripResult?.trip.id === res.trip.id ? 'border-primary ring-1' : ''}`}
                                                        onClick={() => { setSelectedTripResult(res); openBookingModal(v); }}
                                                    >
                                                        {/* Header: Model & Price */}
                                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                                            <div>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <h6 className="mb-0 fw-bold">{v.model || 'Vehicle'}</h6>
                                                                    {d.isOnline && <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.65rem' }}>ONLINE</span>}
                                                                </div>
                                                                <div className="d-flex gap-2 text-muted x-small mt-1">
                                                                    <span className="badge bg-light text-secondary border">{v.type || 'Sedan'}</span>
                                                                    {v.ev && <span className="badge bg-success-subtle text-success">EV</span>}
                                                                    <span className="align-self-center" style={{ fontSize: '0.75rem' }}>{v.numberPlate}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-end">
                                                                <span className="fw-bold text-primary d-block">₹{res.trip.pricePerSeat}</span>
                                                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>/seat</small>
                                                            </div>
                                                        </div>

                                                        <hr className="my-2 dashed text-muted opacity-25" />

                                                        {/* Footer: Driver & Stats */}
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <img
                                                                    src={v.driverPhotoUrl || "https://randomuser.me/api/portraits/men/32.jpg"}
                                                                    alt="Driver"
                                                                    className="rounded-circle border"
                                                                    width="24"
                                                                    height="24"
                                                                />
                                                                <small className="text-dark fw-medium">{d.name || 'Driver'}</small>
                                                            </div>
                                                            <div className="d-flex gap-3 small text-secondary">
                                                                <span className="d-flex align-items-center gap-1" title="Rating">
                                                                    <Star size={12} className="text-warning fill-warning" /> {v.driverRating || '4.8'}
                                                                </span>
                                                                <span className="d-flex align-items-center gap-1" title="Seats">
                                                                    <User size={12} /> {v.seats || 4}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
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
                                                        <span className={`badge ${trip.status === 'COMPLETED' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
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
                    <div className="modal-backdrop-glass d-flex align-items-center justify-content-center" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1050, background: 'rgba(0,0,0,0.5)' }}>
                        <div className="bg-white rounded-4 shadow-lg overflow-hidden" style={{ width: '450px', maxWidth: '90%' }}>
                            <div className="bg-primary p-3 text-white d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0">Confirm Booking</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowBookingModal(false)}></button>
                            </div>
                            <div className="p-4">
                                {/* Driver & Vehicle Header */}
                                <div className="d-flex align-items-center mb-4">
                                    <img
                                        src={selectedVehicle?.driverPhotoUrl || "https://randomuser.me/api/portraits/men/32.jpg"}
                                        className="rounded-circle border me-3"
                                        width="60" height="60"
                                        alt="Driver"
                                    />
                                    <div>
                                        <h5 className="fw-bold mb-0">{selectedVehicle?.driverName || 'Driver'}</h5>
                                        <div className="text-muted small mb-1">{selectedVehicle?.model} • {selectedVehicle?.numberPlate}</div>
                                        <div className="d-flex align-items-center gap-1 small text-warning">
                                            <Star size={12} fill="orange" />
                                            <span className="text-dark fw-bold">{selectedVehicle?.driverRating || '4.8'}</span>
                                        </div>
                                    </div>
                                </div>

                                <Card className="bg-light border-0 mb-4 p-3">
                                    <div className="d-flex justify-content-between mb-2">
                                        <small className="text-muted">From</small>
                                        <small className="fw-bold text-end">{pickup || 'Start Location'}</small>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                        <small className="text-muted">To</small>
                                        <small className="fw-bold text-end">{drop || 'End Location'}</small>
                                    </div>
                                    <hr className="my-2 dashed" />
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold text-primary">Est. Price</span>
                                        <span className="fw-bold fs-5">₹{150 + (selectedVehicle?.id || 0) * 10}</span>
                                    </div>
                                </Card>

                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted">Trip Schedule</label>
                                    <div className="d-flex gap-2">
                                        <input type="date" className="form-control" value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
                                        <input type="time" className="form-control" value={bookingTime} onChange={e => setBookingTime(e.target.value)} />
                                    </div>
                                </div>


                                <div className="d-flex gap-2 mt-4">
                                    <Button variant="ghost" className="flex-fill" onClick={() => setShowBookingModal(false)}>Cancel</Button>
                                    <Button className="flex-fill shadow" onClick={confirmBooking}>
                                        Confirm & Book
                                    </Button>
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

                {selectedTripResult && (
                    <DriverDetailsModal
                        result={selectedTripResult}
                        onClose={() => setSelectedTripResult(null)}
                        onSelect={() => openBookingModal(selectedTripResult.vehicle)}
                    />
                )}

            </div>
        </MainLayout>
    );
};

export default CustomerDashboard;

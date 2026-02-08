import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/dashboard.css';
import ProfileSection from './ProfileSection';
import TripPostingComponent from './TripPostingComponent';

// New Design System
import MainLayout from '../Layout/MainLayout';
import Card from '../Common/Card';
import Button from '../Common/Button';

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
    useEffect(() => { if (coords) map.setView(coords); }, [coords, map]);
    return null;
};

const DriverDashboard = ({ logout }) => {
    // 1. Core State
    const driverName = sessionStorage.getItem('name') || 'Driver';
    const driverId = sessionStorage.getItem('userId');
    const [driverEmail] = useState(sessionStorage.getItem('email'));
    const [activeView, setActiveView] = useState('dashboard');

    // Mission Control Tabs
    const [missionTab, setMissionTab] = useState('requests'); // 'requests' or 'current'

    // Vehicle State
    const [vehicle, setVehicle] = useState(null);
    const [loadingVehicle, setLoadingVehicle] = useState(true);
    const [showRegister, setShowRegister] = useState(false);

    // Mission State
    const [earnings, setEarnings] = useState({ totalEarnings: 0, completedTrips: 0, rating: 5.0 });
    const [reviews, setReviews] = useState([]);

    // Job Management
    const [activeBooking, setActiveBooking] = useState(null);
    const [jobRequests, setJobRequests] = useState([]);

    // Navigation State
    const [currentPos, setCurrentPos] = useState([13.0827, 80.2707]);
    const [polyline, setPolyline] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTripping, setIsTripping] = useState(false);
    const animationRef = useRef(null);

    // Post Trip State
    const [tripForm, setTripForm] = useState({ start: '', end: '', time: '' });
    const [tripSuccess, setTripSuccess] = useState(null);

    // Real-Time Telemetry State
    const [driverStatus, setDriverStatus] = useState('Available');
    const [telemetry, setTelemetry] = useState({ speed: 0, battery: 100, odometer: 0, fuelPercent: 100 });
    const telemetryInterval = useRef(null);

    const fetchBaseData = async () => {
        if (!driverName) return;
        try {
            const vRes = await axios.get(`http://localhost:8083/api/vehicles/driver/${driverName}`);
            if (vRes.data && vRes.data.driverName === driverName) {
                setVehicle(vRes.data);
                setTelemetry(prev => ({
                    ...prev,
                    battery: vRes.data.batteryPercent || prev.battery,
                    odometer: vRes.data.odometer || prev.odometer,
                    speed: vRes.data.speed || prev.speed
                }));
                if (vRes.data.status === 'Active') setDriverStatus('Available');
                else if (vRes.data.status === 'Maintenance') setDriverStatus('Maintenance');
                else if (vRes.data.status === 'Inactive') setDriverStatus('Offline');

                if (!isTripping && vRes.data.latitude && vRes.data.longitude) setCurrentPos([vRes.data.latitude, vRes.data.longitude]);
            } else { setVehicle(null); }
        } catch (error) { setVehicle(null); }
        finally { setLoadingVehicle(false); }
    };

    const refreshStats = async () => {
        try {
            const earnRes = await axios.get(`http://localhost:8083/api/driver/${driverName}/earnings`);
            setEarnings(earnRes.data);
            const revRes = await axios.get(`http://localhost:8083/api/driver/${driverName}/reviews`);
            setReviews(revRes.data);
        } catch (e) { }
    };

    // Telemetry Simulation
    useEffect(() => {
        if (!vehicle || vehicle.status === 'Pending') return;
        telemetryInterval.current = setInterval(() => {
            setTelemetry(prev => {
                let newSpeed = prev.speed;
                let newBattery = prev.battery;
                let newOdometer = prev.odometer;

                if (isTripping) {
                    newSpeed = Math.min(80, Math.max(20, prev.speed + (Math.random() - 0.5) * 10));
                    newBattery = Math.max(0, prev.battery - 0.05);
                    newOdometer = prev.odometer + (newSpeed / 3600);
                } else {
                    newSpeed = Math.max(0, prev.speed - 5);
                    if (driverStatus === 'Available' && prev.battery < 100) newBattery = Math.min(100, prev.battery + 0.1);
                }
                return {
                    speed: Math.round(newSpeed),
                    battery: Math.round(newBattery * 10) / 10,
                    odometer: Math.round(newOdometer * 10) / 10,
                    fuelPercent: prev.fuelPercent
                };
            });
        }, 1000);
        return () => { if (telemetryInterval.current) clearInterval(telemetryInterval.current); };
    }, [vehicle, isTripping, driverStatus]);

    // Live Location Sync
    useEffect(() => {
        if (isTripping && vehicle) {
            const syncInterval = setInterval(async () => {
                try {
                    // Update vehicle location in backend
                    await axios.put(`http://localhost:8083/api/vehicles/${vehicle.id}`, {
                        latitude: currentPos[0],
                        longitude: currentPos[1],
                        speed: telemetry.speed,
                        batteryPercent: telemetry.battery,
                        odometer: telemetry.odometer
                    });
                } catch (e) { console.error("Location sync failed", e); }
            }, 3000); // Sync every 3 seconds
            return () => clearInterval(syncInterval);
        }
    }, [isTripping, currentPos, vehicle, telemetry]);

    useEffect(() => {
        fetchBaseData();
        refreshStats();
        const interval = setInterval(fetchBaseData, 10000);
        return () => clearInterval(interval);
    }, [driverName, isTripping]);

    // Booking Management
    const checkBookings = async () => {
        if (!vehicle || vehicle.status === 'Pending') return;
        try {
            // Get all bookings for this driver (or vehicle)
            // Ideally backend filters this, but for now we might fetch list
            let bRes = await axios.get(`http://localhost:8083/api/driver/${driverName}/bookings`);
            const allBookings = bRes.data || [];

            // Filter Active Job
            const currentJob = allBookings.find(b => b.status === 'CONFIRMED' || b.status === 'ENROUTE');
            if (currentJob) {
                setActiveBooking(currentJob);
                setMissionTab('current'); // Switch to My Job if active
            } else {
                setActiveBooking(null);
            }

            // Filter Requests
            const requests = allBookings.filter(b => b.status === 'PENDING');
            setJobRequests(requests);

            // Notification for new request
            if (requests.length > 0 && !activeBooking) {
                // simple notify logic if needed
            }

        } catch (e) { console.error("Polling error:", e); }
    };

    useEffect(() => {
        checkBookings();
        const interval = setInterval(checkBookings, 5000);
        return () => clearInterval(interval);
    }, [driverName, vehicle, activeBooking]);

    const acceptJob = async (booking) => {
        if (activeBooking) {
            alert("You already have an active job! Complete it before accepting another.");
            return;
        }
        try {
            await axios.put(`http://localhost:8083/api/bookings/${booking.id}/status`, { status: "CONFIRMED" });
            setActiveBooking(booking);
            setJobRequests(prev => prev.filter(b => b.id !== booking.id));
            setMissionTab('current');
            alert("Job Accepted! Head to My Job tab.");
        } catch (e) {
            alert("Failed to accept job.");
        }
    };

    const rejectJob = async (booking) => {
        try {
            await axios.put(`http://localhost:8083/api/bookings/${booking.id}/status`, { status: "CANCELLED" });
            setJobRequests(prev => prev.filter(b => b.id !== booking.id));
        } catch (e) {
            alert("Failed to reject job.");
        }
    };

    useEffect(() => {
        if (activeBooking && (activeBooking.status === 'CONFIRMED' || activeBooking.status === 'ENROUTE')) {
            // Ensure we are in mission view if there is a job
            // setActiveView('mission'); 
        }
    }, [activeBooking]);

    const handleStatusChange = async (newStatus) => {
        if (!vehicle) return;
        try {
            let backendStatus = 'Active';
            let isOnline = true;

            if (newStatus === 'Maintenance') {
                backendStatus = 'Maintenance';
                isOnline = true;
            }
            else if (newStatus === 'Offline') {
                backendStatus = 'Inactive';
                isOnline = false;
            }

            await axios.put(`http://localhost:8083/api/vehicles/${vehicle.id}`, { status: backendStatus });
            if (driverId) {
                await axios.put(`http://localhost:8083/api/driver/${driverId}/online-status`, { isOnline });
            }

            setDriverStatus(newStatus);
            fetchBaseData();
        } catch (error) {
            console.error("Status update failed", error);
            alert("Failed to update status.");
        }
    };

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const registerVehicle = async (e) => {
        e.preventDefault();
        const form = e.target;
        try {
            const isFirstVehicle = !vehicle;
            let driverPhotoBase64, licenseBase64, govIdBase64, driverContact;

            if (isFirstVehicle) {
                driverPhotoBase64 = form.driverPhoto.files[0] ? await toBase64(form.driverPhoto.files[0]) : "https://randomuser.me/api/portraits/men/32.jpg";
                licenseBase64 = form.license.files[0] ? await toBase64(form.license.files[0]) : null;
                govIdBase64 = form.govId.files[0] ? await toBase64(form.govId.files[0]) : null;
                driverContact = form.phone.value;
            } else {
                driverPhotoBase64 = vehicle.driverPhotoUrl || "https://randomuser.me/api/portraits/men/32.jpg";
                licenseBase64 = vehicle.driverLicenseUrl;
                govIdBase64 = vehicle.identificationUrl;
                driverContact = vehicle.driverContact;
            }

            let vehiclePhotosArray = [];
            if (form.carPhotos.files && form.carPhotos.files.length > 0) {
                const filePromises = Array.from(form.carPhotos.files).map(file => toBase64(file));
                vehiclePhotosArray = await Promise.all(filePromises);
            } else {
                vehiclePhotosArray = ["https://cdni.iconscout.com/illustration/premium/thumb/electric-car-3454848-2886733.png"];
            }

            const newVehicle = {
                driverName, driverEmail, driverContact,
                driverPhotoUrl: driverPhotoBase64,
                driverLicenseUrl: licenseBase64,
                identificationUrl: govIdBase64,
                model: form.model.value,
                numberPlate: form.plate.value,
                type: form.type.value,
                seats: parseInt(form.seats.value),
                vehiclePhotoUrl: vehiclePhotosArray[0],
                vehiclePhotosList: JSON.stringify(vehiclePhotosArray),
                status: "Pending",
                documentStatus: "Pending",
                latitude: 13.0827, longitude: 80.2707,
                batteryPercent: 100, odometer: 0, driverRating: 5.0
            };

            await axios.post('http://localhost:8083/api/vehicles', newVehicle);
            alert(isFirstVehicle ? "Vehicle Registration Submitted!" : "New Vehicle Added!");
            fetchBaseData();
            setVehicle({ ...newVehicle, status: 'Pending' });
            setShowRegister(false);
        } catch (e) { alert("Registration failed."); }
    };

    const startTrip = async () => {
        if (!activeBooking) return;
        try {
            await axios.put(`http://localhost:8083/api/driver/${driverName}/status`, { status: 'ENROUTE' });
            await axios.put(`http://localhost:8083/api/bookings/${activeBooking.id}/status`, { status: 'ENROUTE' });

            // fetch optimized route
            const res = await axios.post('http://localhost:8083/api/fleet/optimize-route', {
                startLng: currentPos[1], startLat: currentPos[0],
                endLng: 80.2184, endLat: 12.9716 // Ideally use booking destination lat/lng
            });

            if (res.data && res.data.length > 0) {
                const selectedRoute = res.data[0];
                setPolyline(selectedRoute.path);
                setRouteInfo({ duration: selectedRoute.duration, distance: selectedRoute.distance, status: selectedRoute.trafficStatus });
                setCurrentIndex(0);
                setIsTripping(true);

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
                }, 2000); // reduced speed for better sync
            }
        } catch (e) { alert("System Busy: Could not fetch optimized path."); }
    };

    const completeTrip = async () => {
        if (!activeBooking) return;
        try {
            await axios.put(`http://localhost:8083/api/bookings/${activeBooking.id}/status`, { status: 'COMPLETED' });
            setIsTripping(false);
            setActiveBooking(null);
            setPolyline([]);
            setCurrentIndex(0);
            if (animationRef.current) clearInterval(animationRef.current);
            refreshStats();
            await axios.put(`http://localhost:8083/api/vehicles/driver/${sessionStorage.getItem('name')}/status`, { status: "Active" });
            setVehicle(prev => ({ ...prev, status: 'Active' }));
            setActiveView('dashboard');
            alert("Trip Completed Successfully!");
        } catch (e) { alert("Failed to complete trip."); }
    };

    const reRequestVehicle = async () => {
        try {
            const updated = { ...vehicle, status: 'Pending' };
            await axios.post('http://localhost:8083/api/vehicles', updated);
            setVehicle(updated);
            alert("Re-request submitted.");
        } catch (e) { alert("Failed to re-request."); }
    };

    return (
        <MainLayout title="Driver Console" role="driver" activeView={activeView} onViewChange={setActiveView} logout={logout}>
            {activeView === 'dashboard' && (
                <div className="p-4 h-100 overflow-auto">
                    {vehicle && vehicle.status !== 'Pending' && vehicle.status !== 'Rejected' && (
                        <Card className={`mb-4 border-0 text-white shadow-sm`} style={{
                            background: driverStatus === 'Available' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : driverStatus === 'Maintenance' ? 'var(--nfx-warning)' : '#4b4b4b'
                        }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 className="mb-1 fw-bold">Driver Status</h5>
                                    <small className="opacity-75">{driverStatus === 'Available' ? 'Ready to accept jobs' : 'Currently offline/maintenance'}</small>
                                </div>
                                <select className="form-select form-select-lg fw-bold shadow-sm" style={{ width: 'auto' }} value={driverStatus} onChange={(e) => handleStatusChange(e.target.value)}>
                                    <option value="Available">🟢 Available</option>
                                    <option value="Maintenance">🔧 Maintenance</option>
                                    <option value="Offline">🔴 Offline</option>
                                </select>
                            </div>
                        </Card>
                    )}

                    {vehicle && vehicle.status === 'Active' && driverStatus === 'Available' && (
                        <div className="row g-3 mb-4">
                            <div className="col-md-3">
                                <Card className="text-center p-3 h-100">
                                    <div className="text-primary mb-2 display-6">🚗</div>
                                    <h6 className="text-muted small">LIVE SPEED</h6>
                                    <h2 className="fw-bold mb-0">{telemetry.speed} <small className="text-muted fs-6">km/h</small></h2>
                                </Card>
                            </div>
                            <div className="col-md-3">
                                <Card className="text-center p-3 h-100">
                                    <div className="text-success mb-2 display-6">🔋</div>
                                    <h6 className="text-muted small">BATTERY</h6>
                                    <h2 className="fw-bold mb-0">{telemetry.battery}%</h2>
                                </Card>
                            </div>
                            <div className="col-md-3">
                                <Card className="text-center p-3 h-100">
                                    <div className="text-warning mb-2 display-6">🚙</div>
                                    <h6 className="text-muted small">VEHICLE ID</h6>
                                    <h4 className="fw-bold mb-0 text-dark">{vehicle.numberPlate}</h4>
                                </Card>
                            </div>
                            <div className="col-md-3">
                                <Card className="text-center p-3 h-100">
                                    <div className="text-info mb-2 display-6">📊</div>
                                    <h6 className="text-muted small">ODOMETER</h6>
                                    <h2 className="fw-bold mb-0">{telemetry.odometer.toFixed(1)} <small className="text-muted fs-6">km</small></h2>
                                </Card>
                            </div>
                        </div>
                    )}

                    <h3 className="mb-4 fw-bold">Vehicle Information</h3>
                    {vehicle && !showRegister ? (
                        <Card noPadding className="overflow-hidden mb-4">
                            <div className={`p-3 text-white ${vehicle.status === 'Pending' ? 'bg-warning text-dark' : vehicle.status === 'Active' ? 'bg-success' : 'bg-danger'}`}>
                                <h5 className="mb-0">{vehicle.status === 'Pending' ? '⚠️ Approval Pending' : vehicle.status === 'Active' ? '✅ Active Vehicle' : '🚫 Access Revoked'}</h5>
                            </div>
                            <div className="card-body p-4">
                                <div className="row">
                                    <div className="col-md-6">
                                        <h4 className="fw-bold">{vehicle.model}</h4>
                                        <p className="text-muted">{vehicle.numberPlate}</p>
                                        <span className="badge bg-secondary me-2">{vehicle.type}</span>
                                        <span className="badge bg-secondary">{vehicle.seats} Seats</span>
                                    </div>
                                    <div className="col-md-6 text-center">
                                        <img src={vehicle.vehiclePhotoUrl || "https://cdni.iconscout.com/illustration/premium/thumb/electric-car-3454848-2886733.png"} className="img-fluid" width="200" alt="Car" />
                                        {vehicle.status !== 'Pending' && (
                                            <div className="mt-3">
                                                <Button variant="outline" className="btn-sm" onClick={() => setShowRegister(true)}>Change Vehicle</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            <div className="d-flex justify-content-between mb-3">
                                <h5 className="fw-bold">Register Vehicle</h5>
                                {showRegister && <Button variant="ghost" onClick={() => setShowRegister(false)}>Cancel</Button>}
                            </div>
                            <form onSubmit={registerVehicle}>
                                <div className="row g-3">
                                    <div className="col-md-6"><label>Model</label><input className="form-control" name="model" required /></div>
                                    <div className="col-md-6"><label>Plate</label><input className="form-control" name="plate" required /></div>
                                    <div className="col-md-6"><label>Photos</label><input className="form-control" name="carPhotos" type="file" multiple /></div>
                                    <div className="col-md-3">
                                        <label>Type</label>
                                        <select className="form-select" name="type"><option>SUV</option><option>Sedan</option></select>
                                    </div>
                                    <div className="col-md-3">
                                        <label>Seats</label>
                                        <select className="form-select" name="seats"><option>4</option><option>6</option></select>
                                    </div>
                                </div>
                                <Button className="w-100 mt-4" type="submit">Submit for Approval</Button>
                            </form>
                        </Card>
                    )}
                </div>
            )}

            {activeView === 'post-trip' && (
                <div className="p-4 h-100 overflow-auto">
                    <TripPostingComponent vehicle={vehicle} onTripPosted={() => { fetchBaseData(); setActiveView('dashboard'); }} />
                </div>
            )}

            {activeView === 'mission' && (
                <div className="position-relative w-100 h-100">
                    {/* Mission Control Sub-Tabs */}
                    <div className="position-absolute top-0 start-0 w-100 p-3 d-flex gap-2" style={{ zIndex: 1001, pointerEvents: 'none' }}>
                        <div className="d-flex gap-2 w-100 justify-content-center" style={{ pointerEvents: 'auto' }}>
                            <Button variant={missionTab === 'requests' ? 'primary' : 'light'} onClick={() => setMissionTab('requests')} className="shadow-sm">
                                🔔 Job Requests {jobRequests.length > 0 && <span className="badge bg-danger ms-1">{jobRequests.length}</span>}
                            </Button>
                            <Button variant={missionTab === 'current' ? 'success' : 'light'} onClick={() => setMissionTab('current')} className="shadow-sm">
                                🚀 My Job {activeBooking && <span className="badge bg-white text-success ms-1">Active</span>}
                            </Button>
                        </div>
                    </div>

                    {missionTab === 'requests' && (
                        <div className="d-flex align-items-center justify-content-center h-100 bg-light">
                            <div className="container p-5 overflow-auto" style={{ maxHeight: '80vh', maxWidth: '600px' }}>
                                <h4 className="fw-bold mb-4">Job Requests</h4>
                                {jobRequests.length === 0 ? (
                                    <div className="text-center text-muted">
                                        <div className="display-4 mb-3">📭</div>
                                        <p>No new job requests pending.</p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {jobRequests.map(job => (
                                            <Card key={job.id} className="border-0 shadow-lg animate__animated animate__fadeInUp">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <h5 className="fw-bold text-primary mb-0">Ride Request #{job.id}</h5>
                                                    <span className="badge bg-warning text-dark">PENDING</span>
                                                </div>
                                                <div className="d-flex justify-content-between mb-3 border-bottom pb-3">
                                                    <div>
                                                        <small className="text-muted d-block">PICKUP</small>
                                                        <strong>{job.startLocation}</strong>
                                                    </div>
                                                    <div className="text-end">
                                                        <small className="text-muted d-block">DESTINATION</small>
                                                        <strong>{job.endLocation}</strong>
                                                    </div>
                                                </div>
                                                <div className="mb-3 bg-light p-2 rounded">
                                                    <div className="d-flex align-items-center mb-1">
                                                        <i className="bi bi-person-fill me-2"></i>
                                                        <span>{job.userName || 'Customer'}</span>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-calendar-event me-2"></i>
                                                        <span className="small">{new Date(job.scheduledStartTime).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <Button variant="success" className="w-50" onClick={() => acceptJob(job)} disabled={!!activeBooking}>
                                                        {activeBooking ? 'Complete Active Job First' : 'Accept Ride'}
                                                    </Button>
                                                    <Button variant="danger" className="w-50" onClick={() => rejectJob(job)}>Decline</Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {missionTab === 'current' && (
                        (!vehicle || vehicle.status === 'Pending') ? (
                            <div className="d-flex align-items-center justify-content-center h-100 flex-column text-muted">
                                <div className="display-1">🔒</div>
                                <h3>Mission Control Locked</h3>
                                <p>Waiting for vehicle approval.</p>
                            </div>
                        ) : (
                            <>
                                <div className="map-container w-100 h-100">
                                    <MapContainer center={currentPos} zoom={15} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                        <Marker position={currentPos} icon={CarIcon} />
                                        {polyline.length > 0 && <Polyline positions={polyline} color="blue" />}
                                        <RecenterMap coords={currentPos} />
                                    </MapContainer>
                                </div>

                                {activeBooking ? (
                                    <div className="position-absolute bottom-0 start-0 w-100 p-3" style={{ zIndex: 1000 }}>
                                        <Card className="shadow-lg animate__animated animate__slideInUp">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h5 className="fw-bold mb-0">Active Mission: {activeBooking.endLocation}</h5>
                                                    <small className="text-muted">Passenger: {activeBooking.userName}</small>
                                                </div>
                                                <div className="d-flex gap-2">
                                                    {!isTripping ? (
                                                        <Button variant="success" onClick={startTrip} disabled={isTripping}>Start Trip</Button>
                                                    ) : (
                                                        <Button variant="danger" onClick={completeTrip}>Complete Trip</Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="position-absolute bottom-0 start-0 w-100 p-3" style={{ zIndex: 1000 }}>
                                        <Card className="shadow-sm text-center p-3 opacity-75">
                                            <p className="mb-0 text-muted">No active job. Check <b>Job Requests</b> tab.</p>
                                        </Card>
                                    </div>
                                )}
                            </>
                        )
                    )}
                </div>
            )}

            {activeView === 'profile' && <div className="p-4"><ProfileSection userId={sessionStorage.getItem('userId')} /></div>}
        </MainLayout>
    );
};


export default DriverDashboard;

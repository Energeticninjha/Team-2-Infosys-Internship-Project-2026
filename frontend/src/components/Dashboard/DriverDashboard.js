import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/dashboard.css';
import ProfileSection from './ProfileSection';
import TripPostingComponent from './TripPostingComponent';
import MissionControl from './MissionControl';

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
    const [popupInfo, setPopupInfo] = useState({ show: false, message: '', type: 'success' });

    // Vehicle State
    const [vehicle, setVehicle] = useState(null);
    const [loadingVehicle, setLoadingVehicle] = useState(true);
    const [showRegister, setShowRegister] = useState(false);

    // Mission State
    const [earnings, setEarnings] = useState({ totalEarnings: 0, completedTrips: 0, rating: 5.0 });
    const [reviews, setReviews] = useState([]);
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
    const [lastTelemetryUpdate, setLastTelemetryUpdate] = useState(new Date());
    const [showBatteryAlert, setShowBatteryAlert] = useState(false);
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
            setLastTelemetryUpdate(new Date());
        }, 1000);
        return () => { if (telemetryInterval.current) clearInterval(telemetryInterval.current); };
    }, [vehicle, isTripping, driverStatus]);

    // Battery Alert Effect
    useEffect(() => {
        if (telemetry.battery < 20 && telemetry.battery > 0 && !showBatteryAlert) {
            setShowBatteryAlert(true);
        } else if (telemetry.battery >= 20 && showBatteryAlert) {
            setShowBatteryAlert(false);
        }
    }, [telemetry.battery]);

    useEffect(() => {
        fetchBaseData();
        refreshStats();
        const interval = setInterval(fetchBaseData, 10000);
        return () => clearInterval(interval);
    }, [driverName, isTripping]);

    // Push Location to Backend
    useEffect(() => {
        if (!vehicle || vehicle.status !== 'Active') return;

        const pushLocation = async () => {
            try {
                await axios.put(`http://localhost:8083/api/vehicles/${vehicle.id}`, {
                    latitude: currentPos[0],
                    longitude: currentPos[1]
                });
            } catch (e) { console.warn("Loc push failed"); }
        };

        if (isTripping || driverStatus === 'Available') {
            pushLocation();
            const locInterval = setInterval(pushLocation, 3000);
            return () => clearInterval(locInterval);
        }
    }, [vehicle, currentPos, isTripping, driverStatus]);

    // Force Online Status Sync on Mount
    useEffect(() => {
        const syncOnlineStatus = async () => {
            if (driverId && driverStatus === 'Available') {
                try {
                    console.log("🔄 Syncing Online Status for Driver:", driverId);
                    await axios.put(`http://localhost:8083/api/driver/${driverId}/online-status`, { isOnline: true });
                } catch (e) {
                    console.error("Failed to sync online status", e);
                }
            }
        };
        syncOnlineStatus();

        // Heartbeat every 30 seconds to keep online
        const heartbeat = setInterval(syncOnlineStatus, 30000);
        return () => clearInterval(heartbeat);
    }, [driverId, driverStatus]);



    const checkBookings = async () => {
        if (!vehicle || vehicle.status === 'Pending') return;
        try {
            // Fetch all bookings for this driver (assigned by vehicle)
            // Or fetch all available PENDING bookings if this is a marketplace model. 
            // Implementation: Fetch ALL bookings and filter.
            let bRes = await axios.get(`http://localhost:8083/api/bookings`);
            const allBookings = bRes.data;

            // 1. Check for Active Job (Confirmed/Enroute)
            const myJob = allBookings.find(b =>
                b.vehicle && b.vehicle.id === vehicle.id &&
                (b.status === 'CONFIRMED' || b.status === 'ENROUTE' || b.status === 'SCHEDULED')
            );

            if (myJob) {
                setActiveBooking(myJob);
                // If I have a job, I can't take requests. Clear requests or disable them.
                setJobRequests([]);
            } else {
                setActiveBooking(null);

                // 2. Check for Pending Requests targeted at this vehicle or matching route
                // Logic: PENDING and assigned to this vehicle (via pre-selection)
                const requests = allBookings.filter(b =>
                    b.status === 'PENDING' &&
                    b.vehicle && b.vehicle.id === vehicle.id
                );
                setJobRequests(requests);

                // Demo Hack: If no specific request, show unassigned pending requests? 
                // Requirement says "customer book/request raid fro THIL particular driver". So specific assignment is key.
            }

        } catch (e) { console.error("Polling error:", e); }
    };

    useEffect(() => {
        checkBookings();
        const interval = setInterval(checkBookings, 5000);
        return () => clearInterval(interval);
    }, [driverName, vehicle, activeBooking]);

    useEffect(() => {
        if (activeBooking && (activeBooking.status === 'CONFIRMED' || activeBooking.status === 'ENROUTE')) setActiveView('mission');
    }, [activeBooking]);

    const acceptBooking = async (bookingId) => {
        try {
            await axios.put(`http://localhost:8083/api/bookings/${bookingId}/status`, { status: "CONFIRMED" });
            fetchBaseData(); // Refresh vehicle status
            checkBookings(); // Refresh bookings
            setActiveView('mission');

            setPopupInfo({ show: true, message: "Job Accepted! Proceed to mission.", type: 'success' });
        } catch (e) { setPopupInfo({ show: true, message: "Failed to accept job.", type: 'error' }); }
    };

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

            // Update Vehicle Status
            await axios.put(`http://localhost:8083/api/vehicles/${vehicle.id}`, { status: backendStatus });

            // Update Driver Online Status
            if (driverId) {
                await axios.put(`http://localhost:8083/api/driver/${driverId}/online-status`, { isOnline });
            }

            setDriverStatus(newStatus);
            // alert(`Status changed to ${newStatus}`); // Removed alert for smoother UX
            fetchBaseData();
        } catch (error) {
            console.error("Status update failed", error);
            setPopupInfo({ show: true, message: "Failed to update status.", type: 'error' });
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
            setPopupInfo({ show: true, message: isFirstVehicle ? "Vehicle Registration Submitted!" : "New Vehicle Added!", type: 'success' });
            fetchBaseData();
            setVehicle({ ...newVehicle, status: 'Pending' });
            setShowRegister(false);
        } catch (e) {
            console.error("Registration failed:", e);
            setPopupInfo({ show: true, message: "Registration failed: " + (e.response?.data?.message || e.message), type: 'error' });
        }
    };

    const startTrip = async () => {
        if (!activeBooking) return;
        try {
            await axios.put(`http://localhost:8083/api/driver/${driverName}/status`, { status: 'ENROUTE' });
            await axios.put(`http://localhost:8083/api/bookings/${activeBooking.id}/status`, { status: 'ENROUTE' });

            // fetch optimized route
            const res = await axios.post('http://localhost:8083/api/fleet/optimize-route', {
                startLng: currentPos[1], startLat: currentPos[0],
                endLng: 80.2184, endLat: 12.9716
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
                }, 2000);
            }
        } catch (e) { setPopupInfo({ show: true, message: "System Busy: Could not fetch optimized path.", type: 'error' }); }
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
            setPopupInfo({ show: true, message: "Trip Completed Successfully!", type: 'success' });
        } catch (e) { setPopupInfo({ show: true, message: "Failed to complete trip.", type: 'error' }); }
    };

    const reRequestVehicle = async () => {
        try {
            const updated = { ...vehicle, status: 'Pending' };
            await axios.post('http://localhost:8083/api/vehicles', updated);
            setVehicle(updated);
            setPopupInfo({ show: true, message: "Re-request submitted.", type: 'success' });
        } catch (e) { setPopupInfo({ show: true, message: "Failed to re-request.", type: 'error' }); }
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

                    {/* Job Requests Section */}
                    {jobRequests.length > 0 && !activeBooking && (
                        <div className="mb-4">
                            <h4 className="fw-bold mb-3">Job Requests ({jobRequests.length})</h4>
                            {jobRequests.map(req => (
                                <Card key={req.id} className="mb-3 border-primary border-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h5 className="fw-bold text-primary mb-1">Trip Request: {req.startLocation} → {req.endLocation}</h5>
                                            <div className="text-muted small">
                                                <span className="me-3">📅 {new Date(req.scheduledStartTime).toLocaleString()}</span>
                                                <span className="me-3">👥 {req.passengerCount || 1} Passengers</span>
                                                <span>⏱ {req.estimatedDuration}</span>
                                            </div>
                                            <div className="mt-2">
                                                <strong>Passenger:</strong> {req.user ? req.user.name : 'Guest'} • {req.user ? req.user.phone : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="d-flex gap-2">
                                            <Button variant="outline-danger" onClick={() => { }}>Decline</Button>
                                            <Button variant="success" onClick={() => acceptBooking(req.id)}>Accept</Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {vehicle && vehicle.status === 'Active' && driverStatus === 'Available' && (
                        <>
                            {/* Battery Alert Banner */}
                            {showBatteryAlert && (
                                <div className="alert alert-danger d-flex align-items-center mb-3 animate__animated animate__shakeX" role="alert">
                                    <div className="display-6 me-3">⚠️</div>
                                    <div>
                                        <h5 className="alert-heading mb-1">Low Battery Warning!</h5>
                                        <p className="mb-0">Battery level is critically low at {telemetry.battery}%. Please charge your vehicle soon.</p>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5 className="fw-bold mb-0">Live Telemetry</h5>
                                <small className="text-muted">
                                    Last updated: {lastTelemetryUpdate.toLocaleTimeString()}
                                </small>
                            </div>

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
                        </>
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
                                        {vehicle.status === 'Inactive' && (
                                            <div className="mt-3">
                                                <Button variant="outline-danger" className="btn-sm" onClick={reRequestVehicle}>Re-request Activation</Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-md-6 text-center">
                                        <img src={vehicle.vehiclePhotoUrl || "https://cdni.iconscout.com/illustration/premium/thumb/electric-car-3454848-2886733.png"} className="img-fluid" width="200" />
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
                                {!vehicle && (
                                    <>
                                        <h6 className="border-bottom pb-2 mb-3">Driver Details</h6>
                                        <div className="row g-3 mb-3">
                                            <div className="col-md-6"><label>Phone</label><input className="form-control" name="phone" required /></div>
                                            <div className="col-md-6"><label>Photo</label><input className="form-control" name="driverPhoto" type="file" /></div>
                                            <div className="col-md-6"><label>License</label><input className="form-control" name="license" type="file" required /></div>
                                            <div className="col-md-6"><label>Govt ID</label><input className="form-control" name="govId" type="file" required /></div>
                                        </div>
                                    </>
                                )}
                                <h6 className="border-bottom pb-2 mb-3">Vehicle Details</h6>
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
                <MissionControl />
            )}


            {activeView === 'profile' && <div className="p-4"><ProfileSection userId={sessionStorage.getItem('userId')} /></div>}

            {popupInfo.show && (
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
            )}
        </MainLayout>
    );
};

export default DriverDashboard;

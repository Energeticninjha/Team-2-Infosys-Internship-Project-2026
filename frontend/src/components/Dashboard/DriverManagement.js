import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Card from '../Common/Card';
import Button from '../Common/Button';

// Fix Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DriverManagement = () => {
    const [drivers, setDrivers] = useState([]);
    const [driverCount, setDriverCount] = useState(0);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [showDriverDetails, setShowDriverDetails] = useState(false);
    const [showAddDriver, setShowAddDriver] = useState(false);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [driverDetails, setDriverDetails] = useState(null);

    const [activeTab, setActiveTab] = useState('all');
    const [onlineDrivers, setOnlineDrivers] = useState([]);
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapLocation, setMapLocation] = useState(null);

    const [newDriver, setNewDriver] = useState({ name: '', email: '', password: '', phone: '', licenseNumber: '' });
    const [newVehicle, setNewVehicle] = useState({
        name: '', model: '', numberPlate: '', driverName: '', driverEmail: '', driverContact: '', type: 'SUV', seats: 4, ev: false
    });

    useEffect(() => { fetchDrivers(); }, []);

    const fetchDrivers = async () => {
        try {
            const response = await axios.get('http://localhost:8083/api/manager/drivers');
            setDrivers(response.data.drivers || []);
            setDriverCount(response.data.count || 0);
        } catch (error) { console.error('Error fetching drivers:', error); }
    };

    const fetchOnlineDrivers = async () => {
        try {
            const response = await axios.get('http://localhost:8083/api/manager/drivers/online');
            setOnlineDrivers(response.data || []);
        } catch (error) { console.error(error); }
    };

    const openMap = (item) => {
        const { driver, activeTrip, activeBooking } = item;
        const lat = activeTrip?.fromLat || driver.currentLat;
        const lng = activeTrip?.fromLng || driver.currentLng;
        // For booking, we rely on driver current lat/lng as booking has no coords
        if (lat || lng) { // Relax check slightly or rely on driver.currentLat
            setMapLocation({
                lat: lat || driver.currentLat,
                lng: lng || driver.currentLng,
                name: driver.name,
                vehicle: driver.vehicleId,
                activeTrip,
                activeBooking, // Pass booking
                driverId: driver.id
            });
            setShowMapModal(true);
        } else { alert("Driver location not available yet."); }
    };

    // Live Tracking in Modal
    useEffect(() => {
        let interval;
        if (showMapModal && mapLocation?.driverId) {
            interval = setInterval(async () => {
                try {
                    const response = await axios.get('http://localhost:8083/api/manager/drivers/online');
                    const updated = response.data.find(d => d.driver.id === mapLocation.driverId);
                    if (updated) {
                        const { driver, activeTrip } = updated;
                        const lat = activeTrip?.fromLat || driver.currentLat;
                        const lng = activeTrip?.fromLng || driver.currentLng;
                        setMapLocation(prev => ({ ...prev, lat, lng, activeTrip }));
                    }
                } catch (e) { console.error("Tracking Error"); }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [showMapModal, mapLocation?.driverId]);

    const fetchDriverDetails = async (driverId) => {
        try {
            const response = await axios.get(`http://localhost:8083/api/manager/drivers/${driverId}`);
            setDriverDetails(response.data);
            setSelectedDriver(response.data.driver);
            setShowDriverDetails(true);
        } catch (error) { alert('Failed to fetch driver details'); }
    };

    const blockDriver = async (driverId) => {
        try {
            await axios.put(`http://localhost:8083/api/manager/drivers/${driverId}/block`);
            alert('Driver blocked successfully');
            fetchDrivers();
            if (showDriverDetails) fetchDriverDetails(driverId);
        } catch (error) { alert('Failed to block driver'); }
    };

    const unblockDriver = async (driverId) => {
        try {
            await axios.put(`http://localhost:8083/api/manager/drivers/${driverId}/unblock`);
            alert('Driver unblocked successfully');
            fetchDrivers();
            if (showDriverDetails) fetchDriverDetails(driverId);
        } catch (error) { alert('Failed to unblock driver'); }
    };

    const handleAddDriver = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8083/api/manager/drivers/add', newDriver);
            alert('Driver added successfully!');
            setShowAddDriver(false);
            setNewDriver({ name: '', email: '', password: '', phone: '', licenseNumber: '' });
            fetchDrivers();
        } catch (error) { alert(error.response?.data?.error || 'Failed to add driver'); }
    };

    const handleAddVehicle = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8083/api/manager/vehicles/add', newVehicle);
            alert('Vehicle added successfully!');
            setShowAddVehicle(false);
            setNewVehicle({ name: '', model: '', numberPlate: '', driverName: '', driverEmail: '', driverContact: '', type: 'SUV', seats: 4, ev: false });
        } catch (error) { alert('Failed to add vehicle'); }
    };

    const [viewLicenseUrl, setViewLicenseUrl] = useState(null);

    return (
        <div className="animate-fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>Driver Management</h3>
                    <p className="text-muted mb-0">Total Registered Drivers: <span className="fw-bold text-primary">{driverCount}</span></p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="primary" onClick={() => setShowAddDriver(true)}>+ Add Driver</Button>
                    <Button variant="success" onClick={() => setShowAddVehicle(true)}>+ Add Vehicle</Button>
                </div>
            </div>

            <div className="d-flex gap-2 mb-4">
                <Button variant={activeTab === 'all' ? 'primary' : 'ghost'} onClick={() => setActiveTab('all')}>All Drivers</Button>
                <Button variant={activeTab === 'online' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('online'); fetchOnlineDrivers(); }}>Available Drivers</Button>
            </div>

            {activeTab === 'all' ? (
                <Card noPadding>
                    <div className="table-responsive">
                        <table className="table align-middle mb-0" style={{ color: 'var(--text-main)' }}>
                            <thead className="bg-light">
                                <tr>
                                    <th className="px-4">Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drivers.map(driver => (
                                    <tr key={driver.id} className="clickable">
                                        <td className="px-4 fw-bold" onClick={() => fetchDriverDetails(driver.id)}>{driver.name}</td>
                                        <td>{driver.email}</td>
                                        <td>{driver.phone || '--'}</td>
                                        <td>
                                            <span className={`badge ${driver.isBlocked ? 'bg-danger' : 'bg-success'}`}>{driver.isBlocked ? 'Blocked' : 'Active'}</span>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <Button className="btn-sm" variant="outline" onClick={() => fetchDriverDetails(driver.id)}>View</Button>
                                                <Button className="btn-sm" variant={driver.isBlocked ? "success" : "danger"} onClick={() => driver.isBlocked ? unblockDriver(driver.id) : blockDriver(driver.id)}>
                                                    {driver.isBlocked ? "Unblock" : "Block"}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="row g-4">
                    {onlineDrivers.length > 0 ? onlineDrivers.map(item => (
                        <div key={item.driver.id} className="col-md-6 col-lg-4">
                            <Card className="h-100 hover-elevate">
                                <div className="d-flex align-items-center mb-3">
                                    <img src={item.driver.profilePhotoUrl || 'https://via.placeholder.com/60'} className="rounded-circle me-3" width="50" height="50" />
                                    <div>
                                        <h5 className="fw-bold mb-0">{item.driver.name}</h5>
                                        <small className="text-muted">{item.vehicle?.model || 'No Vehicle'}</small>
                                    </div>
                                    <span className="badge bg-success ms-auto">Online</span>
                                </div>
                                {item.activeTrip ? (
                                    <div className="py-2 bg-primary-subtle rounded px-3 mb-3 border border-primary-subtle text-primary">
                                        <small className="opacity-75 d-block text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>Active Trip</small>
                                        <strong>{item.activeTrip.fromLocation} ➝ {item.activeTrip.toLocation}</strong>
                                    </div>
                                ) : (
                                    <div className="py-2 bg-light rounded px-3 mb-3">
                                        <small className="text-muted d-block">Current Location</small>
                                        <strong>{item.driver.currentLat ? `${item.driver.currentLat}, ${item.driver.currentLng}` : 'Unknown'}</strong>
                                    </div>
                                )}
                                <Button variant="outline" className="w-100" onClick={() => openMap(item)}>Track Location</Button>
                            </Card>
                        </div>
                    )) : <div className="text-center p-5 text-muted">No drivers online.</div>}
                </div>
            )}

            {/* License Image Modal */}
            {viewLicenseUrl && (
                <div className="modal-backdrop-glass position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1060, background: 'rgba(0,0,0,0.8)' }}>
                    <div className="position-relative" style={{ maxWidth: '90%', maxHeight: '90%' }}>
                        <button className="btn-close btn-close-white position-absolute top-0 end-0 m-3" onClick={() => setViewLicenseUrl(null)}></button>
                        <img src={viewLicenseUrl} alt="License" className="img-fluid rounded shadow-lg" style={{ maxHeight: '80vh' }} />
                    </div>
                </div>
            )}

            {/* Modals reused logic... */}
            {(showDriverDetails || showAddDriver || showAddVehicle || showMapModal) && (
                <div className="modal-backdrop-glass position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1055, background: 'rgba(0,0,0,0.5)' }}>
                    <Card className="shadow-lg" style={{ width: showMapModal || showDriverDetails ? '700px' : '500px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                            <h5 className="fw-bold">
                                {showDriverDetails && `Driver: ${selectedDriver?.name}`}
                                {showAddDriver && 'Add New Driver'}
                                {showAddVehicle && 'Add New Vehicle'}
                                {showMapModal && 'Live Location'}
                            </h5>
                            <button className="btn-close" onClick={() => { setShowDriverDetails(false); setShowAddDriver(false); setShowAddVehicle(false); setShowMapModal(false) }}></button>
                        </div>

                        {/* Map Modal Body */}
                        {showMapModal && mapLocation && (
                            <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden' }}>
                                <MapContainer center={[mapLocation.lat, mapLocation.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[mapLocation.lat, mapLocation.lng]}><Popup>{mapLocation.name}</Popup></Marker>
                                    {mapLocation.activeTrip && mapLocation.activeTrip.toLat && (
                                        <>
                                            <Polyline
                                                positions={[
                                                    [mapLocation.lat, mapLocation.lng],
                                                    [mapLocation.activeTrip.toLat, mapLocation.activeTrip.toLng]
                                                ]}
                                                pathOptions={{ color: 'blue', dashArray: '10, 10' }}
                                            />
                                            <Marker position={[mapLocation.activeTrip.toLat, mapLocation.activeTrip.toLng]}>
                                                <Popup>Destination: {mapLocation.activeTrip.toLocation}</Popup>
                                            </Marker>
                                        </>
                                    )}
                                </MapContainer>
                            </div>
                        )}

                        {/* Driver Details Modal Body */}
                        {showDriverDetails && driverDetails && (
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <h6 className="fw-bold">Personal Info</h6>
                                    <p className="mb-1"><strong>Email:</strong> {selectedDriver.email}</p>
                                    <p className="mb-1">
                                        <strong>Phone:</strong> {selectedDriver.phone || driverDetails.vehicle?.driverContact || <span className="text-muted">--</span>}
                                    </p>
                                    <div className="mb-1 d-flex align-items-center">
                                        <strong className="me-2">License:</strong>
                                        {driverDetails.vehicle?.driverLicenseUrl ? (
                                            <span
                                                className="text-primary text-decoration-underline cursor-pointer clickable"
                                                onClick={() => setViewLicenseUrl(driverDetails.vehicle.driverLicenseUrl)}
                                            >
                                                View License
                                            </span>
                                        ) : (
                                            <span>{selectedDriver.licenseNumber || '--'}</span>
                                        )}
                                    </div>
                                    <p><strong>Score:</strong> ⭐ {selectedDriver.performanceScore?.toFixed(1) || 5.0}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="fw-bold">Vehicle Info</h6>
                                    {driverDetails.vehicle ? (
                                        <>
                                            <p className="mb-1">{driverDetails.vehicle.model}</p>
                                            <p className="mb-1 text-muted">{driverDetails.vehicle.numberPlate}</p>
                                            <span className="badge bg-secondary">{driverDetails.vehicle.type}</span>
                                        </>
                                    ) : <span className="text-muted">No vehicle assigned</span>}
                                </div>
                            </div>
                        )}

                        {/* Add Driver Form */}
                        {showAddDriver && (
                            <form onSubmit={handleAddDriver}>
                                <div className="mb-3"><label>Name</label><input className="form-control" value={newDriver.name} onChange={e => setNewDriver({ ...newDriver, name: e.target.value })} required /></div>
                                <div className="mb-3"><label>Email</label><input className="form-control" value={newDriver.email} onChange={e => setNewDriver({ ...newDriver, email: e.target.value })} required /></div>
                                <div className="mb-3"><label>Password</label><input className="form-control" type="password" value={newDriver.password} onChange={e => setNewDriver({ ...newDriver, password: e.target.value })} required /></div>
                                <div className="mb-3"><label>Phone</label><input className="form-control" value={newDriver.phone} onChange={e => setNewDriver({ ...newDriver, phone: e.target.value })} /></div>
                                <div className="mb-3"><label>License</label><input className="form-control" value={newDriver.licenseNumber} onChange={e => setNewDriver({ ...newDriver, licenseNumber: e.target.value })} /></div>
                                <Button type="submit" className="w-100">Add Driver</Button>
                            </form>
                        )}

                        {/* Add Vehicle Form */}
                        {showAddVehicle && (
                            <form onSubmit={handleAddVehicle}>
                                <div className="row g-2">
                                    <div className="col-6"><label>ID</label><input className="form-control" value={newVehicle.name} onChange={e => setNewVehicle({ ...newVehicle, name: e.target.value })} required /></div>
                                    <div className="col-6"><label>Model</label><input className="form-control" value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} required /></div>
                                    <div className="col-6"><label>Plate</label><input className="form-control" value={newVehicle.numberPlate} onChange={e => setNewVehicle({ ...newVehicle, numberPlate: e.target.value })} required /></div>
                                    <div className="col-6"><label>Type</label><select className="form-select" value={newVehicle.type} onChange={e => setNewVehicle({ ...newVehicle, type: e.target.value })}><option>SUV</option><option>Sedan</option></select></div>
                                    <div className="col-12"><label>Driver Email</label><input className="form-control" value={newVehicle.driverEmail} onChange={e => setNewVehicle({ ...newVehicle, driverEmail: e.target.value })} required /></div>
                                </div>
                                <Button type="submit" className="w-100 mt-3">Add Vehicle</Button>
                            </form>
                        )}

                    </Card>
                </div>
            )}
        </div>
    );
};

export default DriverManagement;

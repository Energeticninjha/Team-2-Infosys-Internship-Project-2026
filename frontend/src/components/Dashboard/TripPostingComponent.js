import React, { useState } from 'react';
import axios from 'axios';
import Card from '../Common/Card';
import Button from '../Common/Button';

const TripPostingComponent = ({ vehicle, onTripPosted }) => {
    const [formData, setFormData] = useState({
        fromLocation: '', toLocation: '', availableDate: '', availableTime: '',
        seatsAvailable: vehicle ? vehicle.seats - 1 : 3, pricePerSeat: ''
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [activeField, setActiveField] = useState(null);

    const handleLocationSearch = async (query, field) => {
        setFormData({ ...formData, [field]: query });
        if (query.length > 2) {
            try {
                const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=in&limit=5&accept-language=en`);
                setSuggestions(res.data);
                setActiveField(field);
            } catch (e) { console.error("Geocoding error", e); }
        } else { setSuggestions([]); }
    };

    const selectSuggestion = (suggestion) => {
        setFormData({
            ...formData,
            [activeField]: suggestion.display_name.split(',')[0],
            [activeField + 'Lat']: parseFloat(suggestion.lat),
            [activeField + 'Lng']: parseFloat(suggestion.lon)
        });
        setSuggestions([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const driverId = sessionStorage.getItem('userId');
            let { fromLocationLat: startLat, fromLocationLng: startLng, toLocationLat: endLat, toLocationLng: endLng } = formData;

            // Attempt Geocoding if coordinates are missing
            if (!startLat && formData.fromLocation) {
                try {
                    const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${formData.fromLocation}&limit=1&accept-language=en`);
                    if (res.data[0]) { startLat = parseFloat(res.data[0].lat); startLng = parseFloat(res.data[0].lon); }
                } catch (e) { }
            }
            if (!endLat && formData.toLocation) {
                try {
                    const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${formData.toLocation}&limit=1&accept-language=en`);
                    if (res.data[0]) { endLat = parseFloat(res.data[0].lat); endLng = parseFloat(res.data[0].lon); }
                } catch (e) { }
            }

            const tripData = {
                driverId, ...formData,
                seatsAvailable: parseInt(formData.seatsAvailable),
                pricePerSeat: parseFloat(formData.pricePerSeat),
                fromLat: startLat || 11.0168, fromLng: startLng || 76.9558,
                toLat: endLat || 13.0827, toLng: endLng || 80.2707
            };

            await axios.post('http://localhost:8083/api/trips/post', tripData);
            setMessage({ type: 'success', text: 'Trip Posted Successfully! You are now ONLINE.' });
            if (onTripPosted) onTripPosted();
        } catch (error) {
            setMessage({ type: 'danger', text: 'Failed to post trip: ' + (error.response?.data || error.message) });
        } finally { setLoading(false); }
    };

    return (
        <Card noPadding className="animate-fade-in">
            <div className="p-4 border-bottom d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                    <i className="bi bi-map fs-4"></i>
                </div>
                <div>
                    <h4 className="fw-bold mb-0">Post a New Trip</h4>
                    <small className="text-muted">Set your route and availability</small>
                </div>
            </div>

            <div className="p-4">
                {message && (
                    <div className={`alert alert-${message.type} border-0 shadow-sm mb-4`}>
                        <i className={`bi bi-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="row g-4">
                        <div className="col-md-6 position-relative">
                            <label className="form-label fw-bold text-secondary">From Location</label>
                            <input
                                type="text" className="form-control bg-light" placeholder="City, Area"
                                value={formData.fromLocation}
                                onChange={(e) => handleLocationSearch(e.target.value, 'fromLocation')}
                                required
                            />
                            {activeField === 'fromLocation' && suggestions.length > 0 && (
                                <ul className="list-group position-absolute w-100 shadow z-3 mt-1">
                                    {suggestions.map((s, i) => (
                                        <li key={i} className="list-group-item list-group-item-action cursor-pointer" onClick={() => selectSuggestion(s)}>{s.display_name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="col-md-6 position-relative">
                            <label className="form-label fw-bold text-secondary">To Location</label>
                            <input
                                type="text" className="form-control bg-light" placeholder="Destination City"
                                value={formData.toLocation}
                                onChange={(e) => handleLocationSearch(e.target.value, 'toLocation')}
                                required
                            />
                            {activeField === 'toLocation' && suggestions.length > 0 && (
                                <ul className="list-group position-absolute w-100 shadow z-3 mt-1">
                                    {suggestions.map((s, i) => (
                                        <li key={i} className="list-group-item list-group-item-action cursor-pointer" onClick={() => selectSuggestion(s)}>{s.display_name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="col-md-3">
                            <label className="form-label fw-bold text-secondary">Date</label>
                            <input type="date" className="form-control" value={formData.availableDate} onChange={(e) => setFormData({ ...formData, availableDate: e.target.value })} min={new Date().toISOString().split('T')[0]} required />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold text-secondary">Time</label>
                            <input type="time" className="form-control" value={formData.availableTime} onChange={(e) => setFormData({ ...formData, availableTime: e.target.value })} required />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold text-secondary">Seats</label>
                            <select className="form-select" value={formData.seatsAvailable} onChange={(e) => setFormData({ ...formData, seatsAvailable: e.target.value })}>
                                {[...Array(vehicle ? vehicle.seats : 4).keys()].map(i => <option key={i + 1} value={i + 1}>{i + 1} Seats</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold text-secondary">Price / Seat (₹)</label>
                            <input type="number" className="form-control" placeholder="500" value={formData.pricePerSeat} onChange={(e) => setFormData({ ...formData, pricePerSeat: e.target.value })} required />
                        </div>

                        <div className="col-12">
                            <div className="alert alert-info py-2 small border-0 bg-opacity-10 bg-info text-info-emphasis">
                                <i className="bi bi-info-circle me-2"></i> Posting this trip will make you <b>ONLINE</b>.
                            </div>
                        </div>

                        <div className="col-12 mt-2">
                            <Button type="submit" variant="primary" className="w-100 py-3 fw-bold" disabled={loading}>
                                {loading ? 'Posting...' : 'Post Trip & Go Online'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </Card>
    );
};

export default TripPostingComponent;

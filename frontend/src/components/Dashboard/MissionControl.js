import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../Common/Card';
import Button from '../Common/Button';
import { User, MapPin, Clock, Phone, Mail, Calendar, DollarSign } from 'lucide-react';

const MissionControl = () => {
    const driverId = sessionStorage.getItem('userId');
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'jobs'
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popupInfo, setPopupInfo] = useState({ show: false, message: '', type: 'success' });

    const fetchPendingRequests = async () => {
        if (!driverId) return;
        try {
            const res = await axios.get(`http://localhost:8083/api/bookings/driver/${driverId}/pending-requests`);
            setPendingRequests(res.data || []);
        } catch (e) {
            console.error('Failed to fetch pending requests:', e);
        }
    };

    const fetchActiveJobs = async () => {
        if (!driverId) return;
        try {
            const res = await axios.get(`http://localhost:8083/api/bookings/driver/${driverId}/active-jobs`);
            setActiveJobs(res.data || []);
        } catch (e) {
            console.error('Failed to fetch active jobs:', e);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
        fetchActiveJobs();

        // Poll every 5 seconds
        const interval = setInterval(() => {
            fetchPendingRequests();
            fetchActiveJobs();
        }, 5000);

        return () => clearInterval(interval);
    }, [driverId]);

    const acceptBooking = async (bookingId) => {
        setLoading(true);
        try {
            await axios.put(`http://localhost:8083/api/bookings/${bookingId}/accept`);
            setPopupInfo({ show: true, message: '✅ Job Accepted! The customer has been notified.', type: 'success' });
            fetchPendingRequests();
            fetchActiveJobs();
        } catch (e) {
            setPopupInfo({ show: true, message: 'Failed to accept job. Please try again.', type: 'error' });
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-4 h-100 overflow-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold mb-0">🎯 Mission Control</h3>
                <div className="d-flex gap-2">
                    <span className="badge bg-primary fs-6">{pendingRequests.length} Pending</span>
                    <span className="badge bg-success fs-6">{activeJobs.length} Active</span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="btn-group w-100 mb-4" role="group">
                <button
                    type="button"
                    className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-outline-primary'} fw-bold`}
                    onClick={() => setActiveTab('requests')}
                >
                    📬 Job Requests ({pendingRequests.length})
                </button>
                <button
                    type="button"
                    className={`btn ${activeTab === 'jobs' ? 'btn-success' : 'btn-outline-success'} fw-bold`}
                    onClick={() => setActiveTab('jobs')}
                >
                    🚗 My Jobs ({activeJobs.length})
                </button>
            </div>

            {/* Job Requests Tab */}
            {activeTab === 'requests' && (
                <div>
                    {pendingRequests.length === 0 ? (
                        <Card className="text-center py-5">
                            <div className="display-1 mb-3">📭</div>
                            <h5 className="text-muted">No Pending Requests</h5>
                            <p className="text-muted small">New booking requests will appear here</p>
                        </Card>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {pendingRequests.map((request) => (
                                <Card key={request.id} className="border-primary border-2 shadow-sm">
                                    <div className="row">
                                        {/* Customer Info */}
                                        <div className="col-md-4 border-end">
                                            <h6 className="text-muted text-uppercase small mb-3">Customer Details</h6>
                                            <div className="d-flex align-items-center gap-3 mb-3">
                                                <img
                                                    src={request.customer?.profilePhotoUrl || 'https://randomuser.me/api/portraits/men/32.jpg'}
                                                    className="rounded-circle"
                                                    width="60"
                                                    height="60"
                                                    alt="Customer"
                                                />
                                                <div>
                                                    <h6 className="fw-bold mb-1">{request.customer?.name || 'Guest'}</h6>
                                                    <div className="d-flex flex-column gap-1 small text-muted">
                                                        <span className="d-flex align-items-center gap-1">
                                                            <Phone size={14} /> {request.customer?.phone || 'N/A'}
                                                        </span>
                                                        <span className="d-flex align-items-center gap-1">
                                                            <Mail size={14} /> {request.customer?.email || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trip Details */}
                                        <div className="col-md-5">
                                            <h6 className="text-muted text-uppercase small mb-3">Trip Details</h6>
                                            <div className="mb-3">
                                                <div className="d-flex align-items-start gap-2 mb-2">
                                                    <MapPin size={18} className="text-success mt-1" />
                                                    <div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>PICKUP</small>
                                                        <strong>{request.startLocation}</strong>
                                                    </div>
                                                </div>
                                                <div className="ps-2 border-start border-2 border-primary ms-2" style={{ height: '20px' }}></div>
                                                <div className="d-flex align-items-start gap-2">
                                                    <MapPin size={18} className="text-danger mt-1" />
                                                    <div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>DROP-OFF</small>
                                                        <strong>{request.endLocation}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-3 small text-muted">
                                                <span className="d-flex align-items-center gap-1">
                                                    <Calendar size={14} /> {formatDateTime(request.scheduledStartTime)}
                                                </span>
                                                <span className="d-flex align-items-center gap-1">
                                                    <User size={14} /> {request.passengerCount || 1} Passenger(s)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="col-md-3 d-flex flex-column justify-content-center align-items-center">
                                            <div className="mb-3 text-center">
                                                <h3 className="fw-bold text-success mb-0">₹{request.amount || 0}</h3>
                                                <small className="text-muted">Fare Amount</small>
                                            </div>
                                            <div className="d-flex flex-column gap-2 w-100">
                                                <Button
                                                    variant="success"
                                                    className="w-100"
                                                    onClick={() => acceptBooking(request.id)}
                                                    disabled={loading}
                                                >
                                                    ✅ Accept Job
                                                </Button>
                                                <Button variant="outline-danger" className="w-100" disabled={loading}>
                                                    ❌ Decline
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* My Jobs Tab */}
            {activeTab === 'jobs' && (
                <div>
                    {activeJobs.length === 0 ? (
                        <Card className="text-center py-5">
                            <div className="display-1 mb-3">🚗</div>
                            <h5 className="text-muted">No Active Jobs</h5>
                            <p className="text-muted small">Accepted jobs will appear here</p>
                        </Card>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {activeJobs.map((job) => (
                                <Card key={job.id} className="border-success border-2 shadow-sm">
                                    <div className="row">
                                        {/* Customer Info */}
                                        <div className="col-md-4 border-end">
                                            <h6 className="text-muted text-uppercase small mb-3">Customer Details</h6>
                                            <div className="d-flex align-items-center gap-3 mb-3">
                                                <img
                                                    src={job.customer?.profilePhotoUrl || 'https://randomuser.me/api/portraits/men/32.jpg'}
                                                    className="rounded-circle"
                                                    width="60"
                                                    height="60"
                                                    alt="Customer"
                                                />
                                                <div>
                                                    <h6 className="fw-bold mb-1">{job.customer?.name || 'Guest'}</h6>
                                                    <div className="d-flex flex-column gap-1 small text-muted">
                                                        <span className="d-flex align-items-center gap-1">
                                                            <Phone size={14} /> {job.customer?.phone || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trip Details */}
                                        <div className="col-md-5">
                                            <h6 className="text-muted text-uppercase small mb-3">Trip Details</h6>
                                            <div className="mb-3">
                                                <div className="d-flex align-items-start gap-2 mb-2">
                                                    <MapPin size={18} className="text-success mt-1" />
                                                    <div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>PICKUP</small>
                                                        <strong>{job.startLocation}</strong>
                                                    </div>
                                                </div>
                                                <div className="ps-2 border-start border-2 border-success ms-2" style={{ height: '20px' }}></div>
                                                <div className="d-flex align-items-start gap-2">
                                                    <MapPin size={18} className="text-danger mt-1" />
                                                    <div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>DROP-OFF</small>
                                                        <strong>{job.endLocation}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-3 small text-muted flex-wrap">
                                                <span className="d-flex align-items-center gap-1">
                                                    <Clock size={14} /> {job.estimatedDuration || 'N/A'}
                                                </span>
                                                <span className="d-flex align-items-center gap-1">
                                                    <User size={14} /> {job.passengerCount || 1} Passenger(s)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status & Amount */}
                                        <div className="col-md-3 d-flex flex-column justify-content-center align-items-center">
                                            <span className={`badge ${job.status === 'CONFIRMED' ? 'bg-success' : 'bg-primary'} mb-3 fs-6`}>
                                                {job.status}
                                            </span>
                                            <div className="text-center">
                                                <h3 className="fw-bold text-success mb-0">₹{job.amount || 0}</h3>
                                                <small className="text-muted">Fare Amount</small>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
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
        </div>
    );
};

export default MissionControl;

import React from 'react';
import { X, Star, User, Car } from 'lucide-react';
import Card from '../Common/Card';
import Button from '../Common/Button';

const DriverDetailsModal = ({ result, onClose, onSelect }) => {
    if (!result) return null;
    const { driver, vehicle, trip } = result;

    return (
        <div className="modal-backdrop-glass d-flex align-items-center justify-content-center" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1050, background: 'rgba(0,0,0,0.5)' }}>
            <div className="bg-white rounded-4 shadow-lg overflow-hidden animate__animated animate__fadeInUp" style={{ width: '500px', maxWidth: '90%' }}>
                {/* Header */}
                <div className="bg-light p-3 border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">Driver & Vehicle Details</h5>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                    {/* Driver Section */}
                    <div className="text-center mb-4">
                        <div className="position-relative d-inline-block">
                            <img
                                src={driver?.profilePhotoUrl || "https://randomuser.me/api/portraits/men/32.jpg"}
                                className="rounded-circle border border-3 border-white shadow-sm"
                                width="100" height="100"
                                alt="Driver"
                            />
                            {driver?.isOnline && (
                                <span className="position-absolute bottom-0 end-0 p-2 bg-success border border-white rounded-circle"></span>
                            )}
                        </div>
                        <h4 className="fw-bold mt-2 mb-1">{driver?.name || "Unknown Driver"}</h4>
                        <div className="d-flex justify-content-center gap-2 text-muted small">
                            <span>{driver?.email}</span>
                            <span>•</span>
                            <span>{driver?.phone || "N/A"}</span>
                        </div>
                        <div className="d-flex justify-content-center align-items-center gap-1 mt-2 text-warning fw-bold">
                            <Star size={16} fill="orange" />
                            <span>{vehicle?.driverRating || '4.8'}</span>
                            <span className="text-muted fw-normal">Rating</span>
                        </div>
                    </div>

                    {/* Vehicle Card */}
                    <Card className="mb-4 bg-light border-0">
                        <div className="d-flex gap-3 align-items-center">
                            <div className="bg-white p-2 rounded shadow-sm">
                                <img
                                    src={vehicle?.vehiclePhotoUrl || "https://cdni.iconscout.com/illustration/premium/thumb/electric-car-3454848-2886733.png"}
                                    width="60"
                                    alt="Car"
                                />
                            </div>
                            <div>
                                <h6 className="fw-bold mb-1">{vehicle?.model || "Standard Vehicle"}</h6>
                                <div className="text-muted small">{vehicle?.numberPlate}</div>
                                <div className="d-flex gap-2 mt-1">
                                    <span className="badge bg-white text-secondary border">{vehicle?.type || 'Sedan'}</span>
                                    {vehicle?.ev && <span className="badge bg-success-subtle text-success">EV</span>}
                                    <span className="badge bg-white text-dark border">{vehicle?.seats || 4} Seats</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Stats Grid */}
                    <div className="row g-2 mb-4">
                        <div className="col-6">
                            <div className="p-3 bg-light rounded text-center">
                                <small className="text-muted d-block uppercase x-small">TOTAL TRIPS</small>
                                <span className="fw-bold fs-5">142</span>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="p-3 bg-light rounded text-center">
                                <small className="text-muted d-block uppercase x-small">EXPERIENCE</small>
                                <span className="fw-bold fs-5">4.5 Yrs</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 border-top bg-light d-flex gap-2 justify-content-end">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button className="px-4" onClick={onSelect}>
                        Proceed to Book
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DriverDetailsModal;

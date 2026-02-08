import React from 'react';

const DriverDetailsModal = ({ result, onClose, onSelect }) => {
    if (!result) return null;
    const { driver, vehicle, trip } = result;

    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered animate__animated animate__zoomIn">
                <div className="modal-content text-white" style={{ background: '#1e2126', border: '1px solid #2c3e50' }}>

                    {/* Header */}
                    <div className="modal-header border-bottom border-secondary">
                        <h5 className="modal-title text-info fw-bold">
                            <i className="bi bi-car-front-fill me-2"></i> Ride Details
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    {/* Body */}
                    <div className="modal-body p-4">
                        <div className="row g-4">

                            {/* Vehicle Image */}
                            <div className="col-12 text-center mb-2">
                                <img
                                    src={vehicle?.vehiclePhotoUrl || 'https://via.placeholder.com/600x300?text=Vehicle+Photo'}
                                    className="img-fluid rounded-3 shadow-lg object-fit-cover"
                                    style={{ maxHeight: '250px', width: '100%', objectPosition: 'center' }}
                                    alt="Vehicle"
                                />
                            </div>

                            {/* Driver Info */}
                            <div className="col-md-6 border-end border-secondary">
                                <h6 className="text-secondary text-uppercase fw-bold small mb-3">Driver Information</h6>
                                <div className="d-flex align-items-center mb-3">
                                    <img
                                        src={driver?.profilePhotoUrl || 'https://via.placeholder.com/100'}
                                        className="rounded-circle border border-primary p-1 me-3"
                                        style={{ width: '60px', height: '60px' }}
                                        alt="Driver"
                                    />
                                    <div>
                                        <h5 className="fw-bold mb-0">{driver?.name}</h5>
                                        <div className="text-warning small">
                                            {[...Array(5)].map((_, i) => (
                                                <i key={i} className={`bi bi-star${i < (driver?.performanceScore || 5) ? '-fill' : ''}`}></i>
                                            ))}
                                            <span className="ms-1 text-white">({driver?.performanceScore || '5.0'})</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="ps-2">
                                    <p className="mb-1"><i className="bi bi-telephone me-2 text-info"></i> {driver?.phone}</p>
                                    <p className="mb-0"><i className="bi bi-envelope me-2 text-info"></i> {driver?.email}</p>
                                </div>
                            </div>

                            {/* Vehicle Info */}
                            <div className="col-md-6 ps-md-4">
                                <h6 className="text-secondary text-uppercase fw-bold small mb-3">Vehicle Information</h6>
                                <ul className="list-unstyled">
                                    <li className="mb-2 d-flex justify-content-between">
                                        <span>Model:</span> <span className="fw-bold">{vehicle?.model}</span>
                                    </li>
                                    <li className="mb-2 d-flex justify-content-between">
                                        <span>Type:</span> <span className="badge bg-primary">{vehicle?.type}</span>
                                    </li>
                                    <li className="mb-2 d-flex justify-content-between">
                                        <span>Plate No:</span> <span className="fw-mono text-warning">{vehicle?.numberPlate}</span>
                                    </li>
                                    <li className="mb-2 d-flex justify-content-between">
                                        <span>Seats:</span> <span>{vehicle?.seats} Seater</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Trip Info Section */}
                            <div className="col-12 mt-4 pt-3 border-top border-secondary">
                                <h6 className="text-secondary text-uppercase fw-bold small mb-3">Journey Details</h6>
                                <div className="d-flex justify-content-between align-items-center bg-dark p-3 rounded-3 border border-secondary">
                                    <div className="text-start">
                                        <div className="text-secondary small">FROM</div>
                                        <div className="fw-bold fs-5">{trip?.fromLocation}</div>
                                        <div className="text-info small">{trip?.availableTime}</div>
                                    </div>
                                    <div className="text-center px-3">
                                        <i className="bi bi-arrow-right fs-4 text-white"></i>
                                        <div className="badge bg-success mt-1">₹{trip?.pricePerSeat} / Seat</div>
                                    </div>
                                    <div className="text-end">
                                        <div className="text-secondary small">TO</div>
                                        <div className="fw-bold fs-5">{trip?.toLocation}</div>
                                        <div className="text-info small">{trip?.availableDate}</div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer border-top border-secondary">
                        <button type="button" className="btn btn-outline-light" onClick={onClose}>Close</button>
                        <button type="button" className="btn btn-primary fw-bold px-4" onClick={() => onSelect(result)}>
                            <i className="bi bi-check-circle-fill me-2"></i> Select This Ride
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DriverDetailsModal;

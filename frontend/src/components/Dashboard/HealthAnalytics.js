import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Pie } from 'react-chartjs-2';
import Card from '../Common/Card';
import Button from '../Common/Button';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const HealthAnalytics = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [healthTrends, setHealthTrends] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [filter, setFilter] = useState('ALL'); // 'ALL', 'GOOD', 'MODERATE', 'CRITICAL', 'MAINTENANCE'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vehiclesRes, trendsRes] = await Promise.all([
                    axios.get('http://localhost:8083/api/vehicles'),
                    axios.get('http://localhost:8083/api/vehicles/health/trends?days=7')
                ]);
                setVehicles(vehiclesRes.data);
                setHealthTrends(trendsRes.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching health data", err);
                setLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Prepare line chart data from real historical data
    const lineData = healthTrends ? {
        labels: healthTrends.labels.map(label => {
            const date = new Date(label);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
            {
                label: 'Avg Engine Health (%)',
                data: healthTrends.engineHealth,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.3
            },
            {
                label: 'Avg Battery Health (%)',
                data: healthTrends.batteryHealth,
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                tension: 0.3
            },
            {
                label: 'Avg Tire Wear (%)',
                data: healthTrends.tireWear,
                borderColor: 'rgb(255, 206, 86)',
                backgroundColor: 'rgba(255, 206, 86, 0.5)',
                tension: 0.3
            },
            {
                label: 'Avg Fuel Level (%)',
                data: healthTrends.fuelLevels || [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.3
            }
        ]
    } : {
        labels: ['Loading...'],
        datasets: [
            { label: 'Avg Engine Health (%)', data: [100], borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', tension: 0.3 },
            { label: 'Avg Battery Health (%)', data: [100], borderColor: 'rgb(53, 162, 235)', backgroundColor: 'rgba(53, 162, 235, 0.5)', tension: 0.3 }
        ]
    };

    const criticalCount = vehicles.filter(v => (v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30 || v.fuelPercent < 10)).length;
    const dueCount = vehicles.filter(v => (v.engineHealth < 60 || v.tireWear > 60 || v.batteryHealth < 60 || v.fuelPercent < 25)).length - criticalCount;
    const healthyCount = vehicles.length - criticalCount - dueCount;

    const pieData = {
        labels: ['Healthy', 'Due for Service', 'Critical'],
        datasets: [{
            data: [healthyCount || 1, dueCount || 0, criticalCount || 0],
            backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(255, 99, 132, 0.7)'],
            borderWidth: 1,
        }],
    };

    const handleMaintenance = async (id, isCritical) => {
        try {
            if (isCritical) {
                // If critical, manager sends it to maintenance (status change only)
                await axios.put(`http://localhost:8083/api/vehicles/maintenance/schedule/${id}`);
                alert("Vehicle Scheduled for Maintenance. Driver notified.");
            } else {
                // If just scheduling, also send to maintenance mode
                await axios.put(`http://localhost:8083/api/vehicles/maintenance/schedule/${id}`);
                alert("Maintenance Scheduled.");
            }
            // Trigger refresh
            const res = await axios.get('http://localhost:8083/api/vehicles');
            setVehicles(res.data);
        } catch (err) { console.error(err); }
    };

    const exportIndividualReport = (vehicle) => {
        const reportContent = `
VEHICLE HEALTH REPORT
---------------------
Date: ${new Date().toLocaleString()}
Vehicle ID: ${vehicle.numberPlate}
Model: ${vehicle.model || 'N/A'}
Driver: ${vehicle.driverName || 'N/A'}

HEALTH METRICS
--------------
Engine Health: ${vehicle.engineHealth?.toFixed(1)}%
Battery Health: ${vehicle.batteryHealth?.toFixed(1)}%
Tire Wear: ${vehicle.tireWear?.toFixed(1)}%
Fuel Level: ${vehicle.fuelPercent}%
Tire Pressure: ${vehicle.tirePressure} PSI
Odometer: ${vehicle.odometer?.toFixed(1)} km

STATUS
------
Current Status: ${vehicle.status}
Next Maintenance: ${new Date(vehicle.nextMaintenanceDate).toLocaleDateString()}

RECOMMENDATION
--------------
${(vehicle.engineHealth < 30 || vehicle.tireWear > 80 || vehicle.batteryHealth < 30) ? 'URGENT MAINTENANCE REQUIRED' : 'Vehicle is in good condition.'}
        `;
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Health_Report_${vehicle.numberPlate}.txt`;
        a.click();
    };

    if (loading) return <div>Loading Analytics...</div>;

    return (
        <div className="animate-fade-in">
            <div className="row g-4 mb-4">
                <div className="col-md-8">
                    <Card className="h-100 p-4">
                        <h5 className="fw-bold mb-4">📈 Wear Over Time (Avg Fleet Scores)</h5>
                        <div style={{ height: '300px' }}><Line data={lineData} options={{ maintainAspectRatio: false, responsive: true }} /></div>
                    </Card>
                </div>
                <div className="col-md-4">
                    <Card className="h-100 p-4">
                        <h5 className="fw-bold mb-4">🛠️ Fleet Health Dist.</h5>
                        <div style={{ height: '300px' }}><Pie data={pieData} options={{ maintainAspectRatio: false, responsive: true }} /></div>
                    </Card>
                </div>
            </div>

            <Card noPadding>
                <div className="p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <h5 className="mb-0 fw-bold">🚨 Maintenance Alerts & Diagnostics</h5>

                    <div className="d-flex gap-2 flex-wrap">
                        <select className="form-select form-select-sm" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="ALL">All Status</option>
                            <option value="GOOD">✅ Full Health</option>
                            <option value="MODERATE">⚠️ Moderate</option>
                            <option value="CRITICAL">🚨 Critical/Low</option>
                            <option value="MAINTENANCE">🔧 Under Maintenance</option>
                        </select>

                        <div className="btn-group">
                            <Button
                                variant={viewMode === 'list' ? 'primary' : 'outline'}
                                className="btn-sm"
                                onClick={() => setViewMode('list')}
                            >
                                List
                            </Button>
                            <Button
                                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                                className="btn-sm"
                                onClick={() => setViewMode('grid')}
                            >
                                Card
                            </Button>
                        </div>
                        <a href="http://localhost:8083/api/vehicles/telemetry/export" className="btn btn-sm btn-success">
                            📥 Export
                        </a>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <div className="table-responsive">
                        <table className="table align-middle mb-0" style={{ color: 'var(--text-main)' }}>
                            <thead className="bg-light">
                                <tr>
                                    <th className="px-4">Vehicle ID</th>
                                    <th>Engine</th>
                                    <th>Fuel</th>
                                    <th>Battery</th>
                                    <th>Tires</th>
                                    <th>Next Overhaul</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.filter(v => {
                                    if (filter === 'ALL') return true;
                                    if (filter === 'MAINTENANCE') return v.status === 'Maintenance';

                                    const isCritical = v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30 || v.fuelPercent < 15;
                                    if (filter === 'CRITICAL') return isCritical;

                                    const isModerate = !isCritical && (v.engineHealth < 70 || v.tireWear > 50 || v.batteryHealth < 70);
                                    if (filter === 'MODERATE') return isModerate;

                                    if (filter === 'GOOD') return !isCritical && !isModerate && v.status !== 'Maintenance';
                                    return true;
                                }).sort((a, b) => {
                                    const aCrit = a.engineHealth < 30 || a.tireWear > 80;
                                    const bCrit = b.engineHealth < 30 || b.tireWear > 80;
                                    return bCrit - aCrit;
                                }).map(v => {
                                    const isCritical = v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30 || v.fuelPercent < 10;
                                    return (
                                        <tr key={v.id} className={isCritical ? 'table-danger' : ''}>
                                            <td className="px-4 fw-bold text-primary">
                                                {v.numberPlate}
                                                {isCritical && <span className="ms-2 badge bg-danger animate__animated animate__flash animate__infinite">CRITICAL</span>}
                                                {v.fuelPercent < 15 && <span className="ms-2 badge bg-warning text-dark">LOW FUEL</span>}
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-2 small">{v.engineHealth?.toFixed(1)}%</span>
                                                    <div className="progress flex-grow-1" style={{ height: '5px', width: '60px' }}>
                                                        <div className={`progress-bar ${v.engineHealth < 40 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${v.engineHealth}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <span className={`me-2 small fw-bold ${v.fuelPercent < 15 ? 'text-danger' : ''}`}>{v.fuelPercent}%</span>
                                                    <div className="progress flex-grow-1" style={{ height: '5px', width: '60px' }}>
                                                        <div className={`progress-bar ${v.fuelPercent < 15 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${v.fuelPercent}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{v.batteryHealth?.toFixed(1)}%</td>
                                            <td>{v.tireWear?.toFixed(1)}% Wear</td>
                                            <td>{new Date(v.nextMaintenanceDate).toLocaleDateString()}</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        className={`btn-sm ${isCritical ? 'px-3 animate__animated animate__pulse animate__infinite' : ''}`}
                                                        variant={isCritical ? 'danger' : 'outline'}
                                                        disabled={v.status === 'Maintenance'}
                                                        onClick={() => handleMaintenance(v.id, isCritical)}
                                                    >
                                                        {v.status === 'Maintenance' ? '🔧 In Repair' : isCritical ? '🚨 Send to Maint.' : 'Schedule'}
                                                    </Button>
                                                    <Button className="btn-sm btn-secondary" onClick={() => exportIndividualReport(v)}>📄</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-4 bg-light">
                        <div className="row g-4">
                            {vehicles.filter(v => {
                                if (filter === 'ALL') return true;
                                if (filter === 'MAINTENANCE') return v.status === 'Maintenance';

                                const isCritical = v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30 || v.fuelPercent < 15;
                                if (filter === 'CRITICAL') return isCritical;

                                const isModerate = !isCritical && (v.engineHealth < 70 || v.tireWear > 50 || v.batteryHealth < 70);
                                if (filter === 'MODERATE') return isModerate;

                                if (filter === 'GOOD') return !isCritical && !isModerate && v.status !== 'Maintenance';
                                return true;
                            }).map(v => {
                                const isCritical = v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30 || v.fuelPercent < 10;
                                return (
                                    <div className="col-md-6 col-lg-4" key={v.id}>
                                        <div className={`card h-100 shadow-sm ${isCritical ? 'border-danger' : ''}`}>
                                            <div className={`card-header d-flex justify-content-between align-items-center ${isCritical ? 'bg-danger text-white' : 'bg-white'}`}>
                                                <h6 className="mb-0 fw-bold">{v.numberPlate}</h6>
                                                <span className="badge bg-dark">{v.model}</span>
                                            </div>
                                            <div className="card-body">
                                                <div className="mb-3">
                                                    <label className="small text-muted mb-1">Engine Health</label>
                                                    <div className="progress" style={{ height: '8px' }}>
                                                        <div className={`progress-bar ${v.engineHealth < 40 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${v.engineHealth}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="small text-muted mb-1">Fuel Level</label>
                                                    <div className="progress" style={{ height: '8px' }}>
                                                        <div className={`progress-bar ${v.fuelPercent < 15 ? 'bg-danger' : 'bg-info'}`} style={{ width: `${v.fuelPercent}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="row mb-3 small">
                                                    <div className="col-6">
                                                        <span className="d-block text-muted">Battery</span>
                                                        <span className={`fw-bold ${v.batteryHealth < 30 ? 'text-danger' : ''}`}>{v.batteryHealth?.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="col-6">
                                                        <span className="d-block text-muted">Tire Wear</span>
                                                        <span className={`fw-bold ${v.tireWear > 80 ? 'text-danger' : ''}`}>{v.tireWear?.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                                <div className="text-center p-2 bg-light rounded mb-3">
                                                    <small className="d-block text-muted">Next Maintenance</small>
                                                    <strong>{new Date(v.nextMaintenanceDate).toLocaleDateString()}</strong>
                                                </div>
                                                <div className="d-grid gap-2">
                                                    <Button
                                                        variant={isCritical ? 'danger' : 'outline'}
                                                        onClick={() => handleMaintenance(v.id, isCritical)}
                                                        disabled={v.status === 'Maintenance'}
                                                        className={isCritical ? 'animate__animated animate__pulse animate__infinite' : ''}
                                                    >
                                                        {v.status === 'Maintenance' ? '🔧 Currently in Maintenance' : isCritical ? '🚨 SEND TO SHOP' : 'Schedule Maintenance'}
                                                    </Button>
                                                    <Button variant="secondary" className="btn-sm" onClick={() => exportIndividualReport(v)}>
                                                        📄 View Full Report
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Card >
        </div >
    );
};

export default HealthAnalytics;

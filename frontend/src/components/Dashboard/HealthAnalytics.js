import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const HealthAnalytics = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('http://localhost:8080/api/vehicles');
                setVehicles(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching health data", err);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Mock Historical Data for Line Chart (7 Days)
    const lineData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Avg Engine Health (%)',
                data: [98, 97, 96.5, 96, 95.8, 95.2, 94.5],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.3
            },
            {
                label: 'Avg Battery Health (%)',
                data: [99, 98.5, 98, 97.4, 97, 96.2, 95.5],
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                tension: 0.3
            }
        ]
    };

    // Calculate Distribution for Pie Chart
    const criticalCount = vehicles.filter(v => (v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30)).length;
    const dueCount = vehicles.filter(v => (v.engineHealth < 60 || v.tireWear > 60 || v.batteryHealth < 60)).length - criticalCount;
    const healthyCount = vehicles.length - criticalCount - dueCount;

    const pieData = {
        labels: ['Healthy', 'Due for Service', 'Critical'],
        datasets: [
            {
                data: [healthyCount || 1, dueCount || 0, criticalCount || 0],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const handleMaintenance = async (id) => {
        try {
            await axios.put(`http://localhost:8080/api/vehicles/maintenance/reset/${id}`);
            alert("Vehicle sent to maintenance. Health restored!");
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div>Loading Analytics...</div>;

    return (
        <div className="animate__animated animate__fadeIn">
            <div className="row g-4 mb-4">
                <div className="col-md-8">
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                        <h5 className="fw-bold mb-4">📈 Wear Over Time (Avg Fleet Scores)</h5>
                        <div style={{ height: '300px' }}>
                            <Line data={lineData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                        <h5 className="fw-bold mb-4">🛠️ Fleet Health Dist.</h5>
                        <div style={{ height: '300px' }}>
                            <Pie data={pieData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="card-header bg-white border-0 py-3">
                    <h5 className="mb-0 fw-bold">🚨 Maintenance Alerts & Diagnostics</h5>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="px-4">Vehicle ID</th>
                                    <th>Engine</th>
                                    <th>Battery</th>
                                    <th>Tires</th>
                                    <th>Next Overhaul</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.sort((a, b) => {
                                    const aCrit = a.engineHealth < 30 || a.tireWear > 80;
                                    const bCrit = b.engineHealth < 30 || b.tireWear > 80;
                                    return bCrit - aCrit;
                                }).map(v => {
                                    const isCritical = v.engineHealth < 30 || v.tireWear > 80 || v.batteryHealth < 30;
                                    return (
                                        <tr key={v.id} className={isCritical ? 'table-danger' : ''}>
                                            <td className="px-4 fw-bold text-primary">
                                                {v.numberPlate}
                                                {isCritical && <span className="ms-2 badge bg-danger animate__animated animate__flash animate__infinite">CRITICAL</span>}
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-2 small">{v.engineHealth?.toFixed(1)}%</span>
                                                    <div className="progress flex-grow-1" style={{ height: '5px', width: '60px' }}>
                                                        <div className={`progress-bar ${v.engineHealth < 40 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${v.engineHealth}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{v.batteryHealth?.toFixed(1)}%</td>
                                            <td>{v.tireWear?.toFixed(1)}% Wear</td>
                                            <td>{new Date(v.nextMaintenanceDate).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className={`btn btn-sm fw-bold ${isCritical ? 'btn-danger px-3 animate__animated animate__pulse animate__infinite' : 'btn-outline-warning text-dark'}`}
                                                    onClick={() => handleMaintenance(v.id)}
                                                >
                                                    {isCritical ? '🚨 Action Needed' : 'Schedule'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HealthAnalytics;

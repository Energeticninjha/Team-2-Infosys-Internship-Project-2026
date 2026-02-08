import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Home, Clock, CreditCard, Settings, LogOut, Car, User,
    MapPin, CheckSquare, Activity, Users, Clipboard, PlusCircle, Gauge
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const NAV_CONFIG = {
    customer: [
        { icon: <Home size={20} />, label: 'Book Ride', view: 'book', to: '/customer-dashboard' },
        { icon: <Clock size={20} />, label: 'My Trips', view: 'trips', to: '/customer-dashboard?view=trips' },
        { icon: <CreditCard size={20} />, label: 'Wallet', view: 'wallet', to: '/wallet' },
    ],
    manager: [
        { icon: <MapPin size={20} />, label: 'Live Tracking', view: 'tracking' },
        { icon: <CheckSquare size={20} />, label: 'Approval', view: 'approvals' },
        { icon: <Clipboard size={20} />, label: 'Assignments', view: 'assignments' },
        { icon: <Activity size={20} />, label: 'Health', view: 'health' },
        { icon: <Users size={20} />, label: 'Drivers', view: 'drivers' },
    ],
    driver: [
        { icon: <Gauge size={20} />, label: 'Dashboard', view: 'dashboard' },
        { icon: <PlusCircle size={20} />, label: 'Post Trip', view: 'post-trip' },
        { icon: <Car size={20} />, label: 'Mission Control', view: 'mission' },
        { icon: <Clock size={20} />, label: 'Trip History', view: 'trips' },
        { icon: <CreditCard size={20} />, label: 'Earnings', view: 'earnings' },
        { icon: <User size={20} />, label: 'My Profile', view: 'profile' },
    ]
};

const Sidebar = ({ role = 'customer', activeView, onViewChange, logout }) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const items = NAV_CONFIG[role] || NAV_CONFIG.customer;

    // Helper to determine if active
    const isActive = (item) => {
        if (activeView) return activeView === item.view;
        if (item.to) {
            // Check if URL matches
            if (item.to.includes('?')) {
                return location.search === item.to.split('?')[1] && location.pathname === item.to.split('?')[0];
            }
            return location.pathname === item.to && !location.search;
        }
        return false;
    };

    const handleClick = (item, e) => {
        if (onViewChange && item.view) {
            e.preventDefault();
            onViewChange(item.view);
            // If it has a route, we could optionally push it, but let's rely on internal state if onViewChange is provided
        } else if (item.to && !onViewChange) {
            navigate(item.to);
        }
    };

    return (
        <aside className="nfx-sidebar d-flex flex-column" style={{
            width: '260px',
            backgroundColor: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-subtle)',
            height: '100vh',
            position: 'sticky',
            top: 0,
            zIndex: 1020,
            transition: 'all 0.3s ease'
        }}>
            <div className="p-4 d-flex align-items-center gap-2 border-bottom border-light-subtle">
                <div className="bg-primary rounded-3 p-1 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                    <Car className="text-white" size={20} />
                </div>
                <div className="d-flex flex-column">
                    <span className="fw-bold fs-5" style={{ color: 'var(--text-main)', fontFamily: 'Inter', lineHeight: 1 }}>NeuroFleetX</span>
                    <small className="text-uppercase text-muted" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>{role}</small>
                </div>
            </div>

            <div className="p-3 flex-grow-1 overflow-auto">
                <div className="d-flex flex-column gap-1">
                    {items.map((item, index) => {
                        const active = isActive(item);
                        return (
                            <button
                                key={index}
                                onClick={(e) => handleClick(item, e)}
                                className={`d-flex align-items-center gap-3 px-3 py-3 rounded-3 text-decoration-none transition-all w-100 border-0 ${active ? 'bg-primary text-white shadow-sm' : 'bg-transparent'}`}
                                style={{
                                    color: active ? '#fff' : 'var(--text-secondary)',
                                    fontWeight: active ? '600' : '500',
                                    textAlign: 'left',
                                    cursor: 'pointer'
                                }}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-3 border-top border-light-subtle">
                <button
                    onClick={logout}
                    className="d-flex align-items-center gap-3 px-3 py-3 rounded-3 w-100 border-0 bg-transparent text-danger transition-all hover-bg-danger-subtle"
                    style={{ fontWeight: '600' }}
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

import React from 'react';
import { Sun, Moon, Bell, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Topbar = ({ title, onProfileClick }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header
            className="d-flex align-items-center justify-content-between px-4 py-3"
            style={{
                backgroundColor: 'var(--bg-panel)', // Matches sidebar
                borderBottom: '1px solid var(--border-subtle)',
                height: '70px'
            }}
        >
            <h4 className="m-0 fw-bold" style={{ color: 'var(--text-main)' }}>{title}</h4>

            <div className="d-flex align-items-center gap-4">
                {/* Search Bar - Optional aesthetics */}
                <div className="d-none d-md-flex item-center bg-light rounded-pill px-3 py-2 border" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }}>
                    <Search size={18} className="text-muted me-2" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="border-0 bg-transparent p-0 small"
                        style={{ outline: 'none', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: 40, height: 40, backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>

                    <button
                        className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center position-relative"
                        style={{ width: 40, height: 40, backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    >
                        <Bell size={20} />
                        <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                            <span className="visually-hidden">New alerts</span>
                        </span>
                    </button>

                    <div className="d-flex align-items-center gap-2 ms-2">
                        <div
                            onClick={onProfileClick}
                            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold cursor-pointer"
                            style={{ width: 36, height: 36, fontSize: '14px', cursor: 'pointer' }}
                        >
                            U
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;

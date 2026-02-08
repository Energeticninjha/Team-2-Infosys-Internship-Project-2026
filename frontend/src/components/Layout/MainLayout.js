import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout = ({ children, title = 'Dashboard', role, activeView, onViewChange, logout }) => {
    return (
        <div className="d-flex min-vh-100" style={{ backgroundColor: 'var(--bg-app)' }}>
            <Sidebar role={role} activeView={activeView} onViewChange={onViewChange} logout={logout} />

            <div className="flex-grow-1 d-flex flex-column w-100" style={{ overflowX: 'hidden' }}>
                <Topbar title={title} onProfileClick={() => onViewChange && onViewChange('profile')} />
                <main className="p-0 position-relative flex-grow-1 h-100">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;

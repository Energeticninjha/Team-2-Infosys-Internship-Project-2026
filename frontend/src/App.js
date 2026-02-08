import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';


// Import Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Welcome from './components/Welcome';
// RolePicker removed as requested
import AdminDashboard from './components/Dashboard/AdminDashboard';
import ManagerDashboard from './components/Dashboard/ManagerDashboard';
import CustomerDashboard from './components/Dashboard/CustomerDashboard';
import DriverDashboard from './components/Dashboard/DriverDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const [role, setRole] = useState(sessionStorage.getItem('role') || '');

  const updateToken = (newToken) => {
    setToken(newToken);
    if (newToken) sessionStorage.setItem('token', newToken);
    else sessionStorage.removeItem('token');
  };

  const logout = async () => {
    const email = sessionStorage.getItem('email');
    if (email) {
      try {
        // Use sendBeacon for reliable logout on tab close
        const data = JSON.stringify({ email });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('http://localhost:8083/api/auth/logout', blob);

        // Also try fetch for normal clicks (redundant but safe)
        await fetch('http://localhost:8083/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      } catch (e) {
        console.error("Logout API failed", e);
      }
    }
    sessionStorage.clear();
    setToken(null);
    setRole('');
    window.location.href = '/login';
  };

  // Handle Tab Close / Unload
  React.useEffect(() => {
    const handleTabClose = () => {
      const email = sessionStorage.getItem('email');
      if (email) {
        const data = JSON.stringify({ email });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('http://localhost:8083/api/auth/logout', blob);
      }
    };

    window.addEventListener('beforeunload', handleTabClose);
    return () => window.removeEventListener('beforeunload', handleTabClose);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-vh-100">
        <Routes>

          {/* Welcome Route */}
          <Route path="/" element={<Welcome />} />

          {/* Login & Register (Auto-logout handled in Login component) */}
          <Route path="/login" element={<Login updateToken={updateToken} setRole={setRole} />} />
          <Route path="/register" element={<Register updateToken={updateToken} setRole={setRole} />} />


          {/* Dashboard Routes - Restored */}
          <Route path="/admin-dashboard" element={
            <ProtectedRoute role={role} allowedRole="admin">
              <AdminDashboard logout={logout} />
            </ProtectedRoute>
          } />
          <Route path="/manager-dashboard" element={
            <ProtectedRoute role={role} allowedRole="manager">
              <ManagerDashboard logout={logout} />
            </ProtectedRoute>
          } />
          <Route path="/customer-dashboard" element={
            <ProtectedRoute role={role} allowedRole="customer">
              <CustomerDashboard logout={logout} />
            </ProtectedRoute>
          } />
          <Route path="/driver-dashboard" element={
            <ProtectedRoute role={role} allowedRole="driver">
              <DriverDashboard logout={logout} />
            </ProtectedRoute>
          } />

          {/* Fallback for 404 - Redirect to Welcome */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

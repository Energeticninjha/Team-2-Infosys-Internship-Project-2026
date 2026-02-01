import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
// RolePicker removed as requested
import AdminDashboard from './components/Dashboard/AdminDashboard';
import ManagerDashboard from './components/Dashboard/ManagerDashboard';
import CustomerDashboard from './components/Dashboard/CustomerDashboard';
import DriverDashboard from './components/Dashboard/DriverDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role') || '');

  const updateToken = (newToken) => {
    setToken(newToken);
    if (newToken) localStorage.setItem('token', newToken);
    else localStorage.removeItem('token');
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole('');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <div className="min-vh-100 bg-light">
        <Routes>
          <Route path="/login" element={!token ? <Login updateToken={updateToken} setRole={setRole} /> : <Navigate to={`/${(role || 'customer').toLowerCase()}-dashboard`} />} />
          <Route path="/register" element={!token ? <Register updateToken={updateToken} setRole={setRole} /> : <Navigate to={`/${(role || 'customer').toLowerCase()}-dashboard`} />} />

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

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* Fallback for 404 */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

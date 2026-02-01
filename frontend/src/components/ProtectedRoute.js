import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role, allowedRole }) => {
    // If no role in state, try reading from localStorage as fallback
    const currentRole = role || localStorage.getItem('role') || '';

    // Normalize casing
    const userRole = currentRole.toLowerCase();
    const requiredRole = allowedRole.toLowerCase();

    if (!userRole) {
        return <Navigate to="/login" replace />;
    }

    if (userRole !== requiredRole) {
        // Redirect to their appropriate dashboard if they try to access wrong one
        if (userRole === 'admin') return <Navigate to="/admin-dashboard" replace />;
        if (userRole === 'manager') return <Navigate to="/manager-dashboard" replace />;
        if (userRole === 'customer') return <Navigate to="/customer-dashboard" replace />;
        if (userRole === 'driver') return <Navigate to="/driver-dashboard" replace />;
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;

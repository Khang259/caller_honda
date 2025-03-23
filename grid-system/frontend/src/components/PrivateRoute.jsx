import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PrivateRoute = ({ children }) => {
    const auth = useAuth();

    if (!auth) {
        console.error("useAuth() returned undefined");
        return <Navigate to="/login" />;
    }

    const { currentUser } = auth;

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    return children;
};

export const AdminRoute = ({ children }) => {
    const auth = useAuth();

    if (!auth) {
        console.error("useAuth() returned undefined");
        return <Navigate to="/login" />;
    }

    const { currentUser, isAdmin } = auth;

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (!isAdmin()) {
        return <Navigate to="/" />;
    }

    return children;
};
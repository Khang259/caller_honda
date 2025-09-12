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

export const UserAE3Route = ({ children }) => {
    const auth = useAuth();

    if (!auth) {
        console.error("useAuth() returned undefined");
        return <Navigate to="/login" />;
    }

    const { currentUser, isUserAE3 } = auth;

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (!isUserAE3()) {
        return <Navigate to="/" />;
    }

    return children;
};

export const UserAE4Route = ({ children }) => {
    const auth = useAuth();

    if (!auth) {
        console.error("useAuth() returned undefined");
        return <Navigate to="/login" />;
    }

    const { currentUser, isUserAE4 } = auth;

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (!isUserAE4()) {
        return <Navigate to="/" />;
    }

    return children;
};

export const UserMainOVHRoute = ({ children }) => {
    const auth = useAuth();

    if (!auth) {
        console.error("useAuth() returned undefined");
        return <Navigate to="/login" />;
    }

    const { currentUser, isUserMainOvh } = auth;

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (!isUserMainOvh()) {
        return <Navigate to="/" />;
    }

    return children;
};
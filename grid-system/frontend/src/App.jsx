import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Settings from './components/Settings';
import HistoryComponent from './components/HistoryComponent';
import Khu4Component from './pages/Khu4Component';
import Khu5Component from './pages/Khu5Component';
import Login from './components/Login';
import { PrivateRoute, AdminRoute } from './components/PrivateRoute';
import AllKhuDisplay from './components/AllKhuDisplay';
import AuthProvider from './contexts/AuthContext';
import { SettingsProvider } from "./contexts/SettingsContext";
import { HistoryProvider } from './contexts/HistoryContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
    return (
        <AuthProvider>
            <SettingsProvider>
                <HistoryProvider>
                    <Router>
                        <Routes>
                            <Route path="/login" element={<Login />} />

                            <Route path="/" element={
                                <Layout>
                                    <AllKhuDisplay />
                                </Layout>
                            } />

                            <Route path="/khu4" element={
                                <Layout>
                                    <Khu4Component />
                                </Layout>
                            } />

                            <Route path="/khu5" element={
                                <Layout>
                                    <Khu5Component />
                                </Layout>
                            } />

                            <Route path="/history" element={
                                <Layout>
                                    <HistoryComponent />
                                </Layout>
                            } />

                            <Route path="/settings" element={
                                <Layout>
                                    <Settings />
                                </Layout>
                            } />
                        </Routes>
                    </Router>
                </HistoryProvider>
            </SettingsProvider>
        </AuthProvider>
    );
}

export default App;
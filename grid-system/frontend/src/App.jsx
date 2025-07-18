
// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import { TaskProvider } from './contexts/TaskContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import AreaPage from './pages/AreaPage';
import SettingsForm from './components/SettingsForm';
import Login from './components/Login'; 

const App = () => {
  return (
    <SettingsProvider>
      <TaskProvider>
        <HistoryProvider>
          <AuthProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route
                    path="/SupplyAndDemand"
                    element={<AreaPage khu="SupplyAndDemand" />}
                  />
                  <Route path="/Supply" element={<AreaPage khu="Supply" />} />
                  <Route path="/Demand" element={<AreaPage khu="Demand" />} />
                  <Route path="/settings" element={<SettingsForm />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<AreaPage khu="SupplyAndDemand" />} />
                </Routes>
              </Layout>
            </Router>
          </AuthProvider>
        </HistoryProvider>
      </TaskProvider>
    </SettingsProvider>
  );
};

export default App;
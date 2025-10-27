import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import Login from '@/pages/Login';
import CashierPOS from '@/pages/CashierPOS';
import AdminDashboard from '@/pages/AdminDashboard';
import MenuManagement from '@/pages/MenuManagement';
import TableManagement from '@/pages/TableManagement';
import TransactionHistory from '@/pages/TransactionHistory';
import Settings from '@/pages/Settings';
import UserManagement from '@/pages/UserManagement';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Setup axios defaults
axios.defaults.baseURL = API;

// Add request interceptor to include token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? 
                <Navigate to={user.role === 'admin' ? '/admin' : '/cashier'} /> : 
                <Login onLogin={handleLogin} />
            } 
          />
          
          <Route 
            path="/cashier" 
            element={
              user ? 
                <CashierPOS user={user} onLogout={handleLogout} /> : 
                <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              user?.role === 'admin' ? 
                <AdminDashboard user={user} onLogout={handleLogout} /> : 
                <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/admin/menu" 
            element={
              user?.role === 'admin' ? 
                <MenuManagement user={user} onLogout={handleLogout} /> : 
                <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/admin/tables" 
            element={
              user?.role === 'admin' ? 
                <TableManagement user={user} onLogout={handleLogout} /> : 
                <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/admin/transactions" 
            element={
              user?.role === 'admin' ? 
                <TransactionHistory user={user} onLogout={handleLogout} /> : 
                <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/admin/settings" 
            element={
              user?.role === 'admin' ? 
                <Settings user={user} onLogout={handleLogout} /> : 
                <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/admin/users" 
            element={
              user?.role === 'admin' ? 
                <UserManagement user={user} onLogout={handleLogout} /> : 
                <Navigate to="/login" />
            } 
          />
          
          <Route 
            path="/" 
            element={
              <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/cashier') : '/login'} />
            } 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, ShoppingBag, Users, Settings as SettingsIcon, LogOut, TrendingUp, DollarSign, ShoppingCart, Package } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-6" data-testid="admin-dashboard-page">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Selamat datang kembali, {user.full_name}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="soft-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-lg">Hari Ini</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1" data-testid="revenue-today">
              Rp {stats?.total_revenue_today?.toLocaleString('id-ID') || 0}
            </h3>
            <p className="text-sm text-gray-600">Pendapatan Hari Ini</p>
          </div>

          <div className="soft-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">Hari Ini</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1" data-testid="transactions-today">
              {stats?.total_transactions_today || 0}
            </h3>
            <p className="text-sm text-gray-600">Transaksi Hari Ini</p>
          </div>

          <div className="soft-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-lg">Pending</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1" data-testid="pending-orders">
              {stats?.pending_orders || 0}
            </h3>
            <p className="text-sm text-gray-600">Pesanan Pending</p>
          </div>

          <div className="soft-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-lg">Total</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1" data-testid="total-menu">
              {stats?.total_menu_items || 0}
            </h3>
            <p className="text-sm text-gray-600">Item Menu</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="soft-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Pendapatan 7 Hari Terakhir</h2>
            <div className="space-y-3">
              {stats?.revenue_chart?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  <div className="flex-1 h-8 rounded-lg overflow-hidden bg-gray-100">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-end pr-2"
                      style={{ width: `${(item.revenue / Math.max(...stats.revenue_chart.map(r => r.revenue))) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">
                        Rp {item.revenue.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="soft-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Item Terlaris</h2>
            <div className="space-y-3">
              {stats?.top_selling_items?.map((item, idx) => (
                <div key={idx} className="glass-effect rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-800">{item.name}</h4>
                    <span className="text-sm font-semibold text-teal-600">{item.quantity} terjual</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Total Pendapatan</span>
                    <span className="font-semibold">Rp {item.revenue.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
              {(!stats?.top_selling_items || stats.top_selling_items.length === 0) && (
                <p className="text-center text-gray-500 py-8">Belum ada data penjualan</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
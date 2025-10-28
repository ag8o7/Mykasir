import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Download
} from 'lucide-react';
import { format, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function Reports({ user, onLogout }) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [selectedDate, reportType]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = '';
      let params = {};

      if (reportType === 'daily') {
        url = `${API_URL}/api/reports/daily`;
        params = { date: format(selectedDate, 'yyyy-MM-dd') };
      } else if (reportType === 'weekly') {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        url = `${API_URL}/api/reports/weekly`;
        params = { start_date: format(weekStart, 'yyyy-MM-dd') };
      } else if (reportType === 'monthly') {
        url = `${API_URL}/api/reports/monthly`;
        params = { 
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth() + 1
        };
      }

      const response = await axios.get(url, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getReportTitle = () => {
    if (reportType === 'daily') {
      return `Laporan Harian - ${format(selectedDate, 'dd MMMM yyyy', { locale: id })}`;
    } else if (reportType === 'weekly') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return `Laporan Mingguan - ${format(weekStart, 'dd MMM', { locale: id })} - ${format(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), 'dd MMM yyyy', { locale: id })}`;
    } else {
      return `Laporan Bulanan - ${format(selectedDate, 'MMMM yyyy', { locale: id })}`;
    }
  };

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Laporan</h1>
            <p className="text-gray-600 mt-1">Lihat laporan penjualan dan analisis bisnis</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, 'dd MMM yyyy', { locale: id })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Report Type Tabs */}
        <Tabs value={reportType} onValueChange={setReportType}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="daily">Harian</TabsTrigger>
            <TabsTrigger value="weekly">Mingguan</TabsTrigger>
            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
          </TabsList>

          <TabsContent value={reportType} className="space-y-6 mt-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : reportData ? (
              <>
                {/* Report Title */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{getReportTitle()}</h2>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(reportData.total_revenue)}</div>
                      {reportData.revenue_growth !== undefined && (
                        <div className={`flex items-center gap-1 text-xs ${getGrowthColor(reportData.revenue_growth)}`}>
                          {getGrowthIcon(reportData.revenue_growth)}
                          <span>{Math.abs(reportData.revenue_growth).toFixed(1)}% dari periode sebelumnya</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{reportData.total_transactions}</div>
                      {reportData.transaction_growth !== undefined && (
                        <div className={`flex items-center gap-1 text-xs ${getGrowthColor(reportData.transaction_growth)}`}>
                          {getGrowthIcon(reportData.transaction_growth)}
                          <span>{Math.abs(reportData.transaction_growth).toFixed(1)}% dari periode sebelumnya</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(reportData.average_transaction)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Per transaksi
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Method Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Metode Pembayaran</CardTitle>
                      <CardDescription>Breakdown berdasarkan metode pembayaran</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {reportData.payment_breakdown?.map((payment, index) => {
                          const percentage = (payment.amount / reportData.total_revenue * 100).toFixed(1);
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium capitalize">{payment.method}</span>
                                <span>{formatCurrency(payment.amount)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-600">{percentage}% dari total</div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Type Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tipe Pesanan</CardTitle>
                      <CardDescription>Breakdown berdasarkan tipe pesanan</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {reportData.order_type_breakdown?.map((orderType, index) => {
                          const total = reportData.order_type_breakdown.reduce((sum, ot) => sum + ot.count, 0);
                          const percentage = (orderType.count / total * 100).toFixed(1);
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium capitalize">
                                  {orderType.type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
                                </span>
                                <span>{orderType.count} pesanan</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-600">{percentage}% dari total</div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Selling Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Menu Terlaris</CardTitle>
                    <CardDescription>10 menu dengan penjualan terbanyak</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">#</th>
                            <th className="text-left py-3 px-4">Nama Menu</th>
                            <th className="text-right py-3 px-4">Jumlah Terjual</th>
                            <th className="text-right py-3 px-4">Total Pendapatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.top_selling_items?.map((item, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">{index + 1}</td>
                              <td className="py-3 px-4 font-medium">{item.name}</td>
                              <td className="py-3 px-4 text-right">{item.quantity}</td>
                              <td className="py-3 px-4 text-right">{formatCurrency(item.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Daily/Weekly Breakdown for Weekly and Monthly Reports */}
                {(reportType === 'weekly' || reportType === 'monthly') && reportData.daily_breakdown && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Breakdown {reportType === 'weekly' ? 'Harian' : 'Per Hari'}</CardTitle>
                      <CardDescription>Detail penjualan per hari</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4">Tanggal</th>
                              <th className="text-right py-3 px-4">Transaksi</th>
                              <th className="text-right py-3 px-4">Pendapatan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.daily_breakdown.map((day, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">{format(new Date(day.date), 'dd MMM yyyy', { locale: id })}</td>
                                <td className="py-3 px-4 text-right">{day.transactions}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(day.revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Weekly Breakdown for Monthly Report */}
                {reportType === 'monthly' && reportData.weekly_breakdown && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Breakdown Mingguan</CardTitle>
                      <CardDescription>Detail penjualan per minggu</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4">Minggu</th>
                              <th className="text-right py-3 px-4">Transaksi</th>
                              <th className="text-right py-3 px-4">Pendapatan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.weekly_breakdown.map((week, index) => (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4">{week.week}</td>
                                <td className="py-3 px-4 text-right">{week.transactions}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(week.revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Tidak ada data untuk ditampilkan
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default Reports;

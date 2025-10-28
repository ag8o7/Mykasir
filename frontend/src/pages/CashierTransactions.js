import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CashierLayout from '../components/CashierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Search, Printer, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import axios from 'axios';
import ReceiptPrint from '../components/ReceiptPrint';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function CashierTransactions({ user, onLogout }) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetchTransactions();
    fetchSettings();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchQuery, transactions]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
      setFilteredTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    if (!searchQuery.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = transactions.filter(trans =>
      trans.transaction_number.toLowerCase().includes(query) ||
      trans.cashier.toLowerCase().includes(query) ||
      trans.payment_method.toLowerCase().includes(query)
    );
    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentMethodBadge = (method) => {
    const colors = {
      cash: 'bg-green-100 text-green-800',
      debit: 'bg-blue-100 text-blue-800',
      credit: 'bg-purple-100 text-purple-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const handleViewReceipt = async (transaction) => {
    try {
      const token = localStorage.getItem('token');
      const orderResponse = await axios.get(`${API_URL}/api/orders/${transaction.order_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSelectedTransaction({
        transaction,
        order: orderResponse.data
      });
      setShowReceipt(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <CashierLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Riwayat Transaksi</h1>
            <p className="text-gray-600 mt-1">Lihat dan print ulang transaksi</p>
          </div>
          <Button onClick={fetchTransactions} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cari berdasarkan nomor transaksi, kasir, atau metode pembayaran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Transaksi</CardTitle>
            <CardDescription>
              Menampilkan {filteredTransactions.length} transaksi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'Tidak ada transaksi yang sesuai dengan pencarian' : 'Belum ada transaksi'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">No. Transaksi</th>
                      <th className="text-left py-3 px-4">Tanggal</th>
                      <th className="text-left py-3 px-4">Kasir</th>
                      <th className="text-left py-3 px-4">Metode</th>
                      <th className="text-right py-3 px-4">Total</th>
                      <th className="text-center py-3 px-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{transaction.transaction_number}</td>
                        <td className="py-3 px-4">
                          {format(new Date(transaction.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                        </td>
                        <td className="py-3 px-4">{transaction.cashier}</td>
                        <td className="py-3 px-4">
                          <Badge className={getPaymentMethodBadge(transaction.payment_method)}>
                            {transaction.payment_method.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(transaction.total)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewReceipt(transaction)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Lihat
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Struk Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <>
              <div className="print-area">
                <ReceiptPrint
                  settings={settings}
                  order={selectedTransaction.order}
                  transaction={selectedTransaction.transaction}
                />
              </div>
              <div className="flex gap-2 no-print">
                <Button onClick={handlePrintReceipt} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Struk
                </Button>
                <Button variant="outline" onClick={() => setShowReceipt(false)}>
                  Tutup
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </CashierLayout>
  );
}

export default CashierTransactions;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Receipt, Eye } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';

const TransactionHistory = ({ user, onLogout }) => {
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, ordersRes] = await Promise.all([
        axios.get('/transactions'),
        axios.get('/orders')
      ]);
      setTransactions(transRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      toast.error('Gagal memuat data transaksi');
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = (transaction) => {
    const order = orders.find(o => o.id === transaction.order_id);
    setSelectedTransaction({ ...transaction, order });
    setShowDetail(true);
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
      <div className="p-6 space-y-6" data-testid="transaction-history-page">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Histori Transaksi</h1>
          <p className="text-gray-600">Daftar semua transaksi yang telah dilakukan</p>
        </div>

        <div className="soft-card rounded-2xl p-6">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-3">
              {transactions.map(trans => {
                const order = orders.find(o => o.id === trans.order_id);
                return (
                  <div
                    key={trans.id}
                    className="glass-effect rounded-xl p-4 hover:shadow-md transition-all"
                    data-testid={`transaction-${trans.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{trans.transaction_number}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(trans.created_at).toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-gray-500">Kasir: {trans.cashier}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-teal-600">
                          Rp {trans.total.toLocaleString('id-ID')}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">{trans.payment_method}</p>
                        {order && (
                          <p className="text-xs text-gray-500">
                            {order.order_type === 'dine-in' ? `Meja ${order.table_number}` : 'Takeaway'}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewDetail(trans)}
                        className="rounded-xl"
                        data-testid={`view-detail-${trans.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Detail
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {transactions.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Belum ada transaksi</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="soft-card rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="glass-effect rounded-xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">No. Transaksi:</span>
                    <span className="font-semibold">{selectedTransaction.transaction_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tanggal:</span>
                    <span className="font-semibold">
                      {new Date(selectedTransaction.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kasir:</span>
                    <span className="font-semibold">{selectedTransaction.cashier}</span>
                  </div>
                  {selectedTransaction.order && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipe Order:</span>
                        <span className="font-semibold capitalize">{selectedTransaction.order.order_type}</span>
                      </div>
                      {selectedTransaction.order.table_number && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Meja:</span>
                          <span className="font-semibold">{selectedTransaction.order.table_number}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {selectedTransaction.order && (
                <div className="glass-effect rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Item Pesanan</h4>
                  <div className="space-y-2">
                    {selectedTransaction.order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div>
                          <span className="font-medium">{item.menu_item_name}</span>
                          <span className="text-gray-600 ml-2">x{item.quantity}</span>
                        </div>
                        <span className="font-semibold">Rp {item.subtotal.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass-effect rounded-xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">Rp {selectedTransaction.order?.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pajak:</span>
                    <span className="font-semibold">Rp {selectedTransaction.order?.tax.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-teal-600">Rp {selectedTransaction.total.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="glass-effect rounded-xl p-4 bg-green-50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Metode Pembayaran:</span>
                    <span className="font-semibold capitalize">{selectedTransaction.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jumlah Bayar:</span>
                    <span className="font-semibold">Rp {selectedTransaction.amount_paid.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kembalian:</span>
                    <span className="font-semibold text-green-600">Rp {selectedTransaction.change_amount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TransactionHistory;
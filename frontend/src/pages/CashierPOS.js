import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import CashierLayout from '@/components/CashierLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign, Printer } from 'lucide-react';
import ReceiptPrint from '@/components/ReceiptPrint';

const CashierPOS = ({ user, onLogout }) => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderType, setOrderType] = useState('dine-in');
  const [selectedTable, setSelectedTable] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [settings, setSettings] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, menuRes, tablesRes, settingsRes] = await Promise.all([
        axios.get('/categories'),
        axios.get('/menu-items'),
        axios.get('/tables'),
        axios.get('/settings')
      ]);
      setCategories(categoriesRes.data);
      setMenuItems(menuRes.data);
      setTables(tablesRes.data.filter(t => t.status === 'available'));
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find(c => c.menu_item_id === item.id);
    if (existingItem) {
      setCart(cart.map(c => 
        c.menu_item_id === item.id 
          ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.price }
          : c
      ));
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        menu_item_name: item.name,
        quantity: 1,
        price: item.price,
        subtotal: item.price,
        notes: ''
      }]);
    }
    toast.success(`${item.name} ditambahkan`);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(cart.map(c => {
      if (c.menu_item_id === itemId) {
        const newQty = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQty, subtotal: newQty * c.price };
      }
      return c;
    }));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(c => c.menu_item_id !== itemId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * (settings?.tax_percentage || 10) / 100;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong!');
      return;
    }
    if (orderType === 'dine-in' && !selectedTable) {
      toast.error('Pilih meja terlebih dahulu!');
      return;
    }
    setShowPayment(true);
  };

  const processPayment = async () => {
    const { subtotal, tax, total } = calculateTotals();
    const paid = parseFloat(amountPaid);
    
    if (isNaN(paid) || paid < total) {
      toast.error('Jumlah pembayaran tidak cukup!');
      return;
    }

    try {
      // Create order
      const orderData = {
        table_id: selectedTable?.id || null,
        table_number: selectedTable?.table_number || null,
        order_type: orderType,
        items: cart,
        subtotal,
        tax,
        total
      };
      
      const orderRes = await axios.post('/orders', orderData);
      
      // Create transaction
      const transactionData = {
        order_id: orderRes.data.id,
        payment_method: paymentMethod,
        amount_paid: paid,
        change_amount: paid - total,
        total
      };
      
      const transRes = await axios.post('/transactions', transactionData);
      
      // Prepare receipt data
      setReceiptData({
        transaction: transRes.data,
        order: orderRes.data,
        settings: settings,
        change: paid - total
      });
      
      toast.success('Pembayaran berhasil!');
      setShowPayment(false);
      setShowReceipt(true);
      
      // Reset
      setCart([]);
      setSelectedTable(null);
      setAmountPaid('');
      fetchData();
    } catch (error) {
      toast.error('Pembayaran gagal!');
    }
  };

  const filteredItems = selectedCategory === 'all' 
    ? menuItems.filter(item => item.available)
    : menuItems.filter(item => item.category_id === selectedCategory && item.available);

  const { subtotal, tax, total } = calculateTotals();
  const changeAmount = amountPaid ? parseFloat(amountPaid) - total : 0;

  return (
    <CashierLayout user={user} onLogout={onLogout}>
      <div className="p-4" data-testid="cashier-pos-page">
        {/* Header */}
        <div className="soft-card rounded-2xl p-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kasir POS</h1>
            <p className="text-sm text-gray-600">Halo, {user.full_name}</p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Menu Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Type & Table Selection */}
          <div className="soft-card rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Order</label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger className="rounded-xl h-11" data-testid="order-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine-in">Dine In</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {orderType === 'dine-in' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Meja</label>
                  <Select value={selectedTable?.id} onValueChange={(val) => setSelectedTable(tables.find(t => t.id === val))}>
                    <SelectTrigger className="rounded-xl h-11" data-testid="table-select">
                      <SelectValue placeholder="Pilih meja" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          Meja {table.table_number} ({table.capacity} orang)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="soft-card rounded-2xl p-4">
            <div className="flex gap-2 overflow-x-auto">
              <Button
                onClick={() => setSelectedCategory('all')}
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className={`rounded-xl whitespace-nowrap ${selectedCategory === 'all' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white' : ''}`}
                data-testid="category-all"
              >
                Semua
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  className={`rounded-xl whitespace-nowrap ${selectedCategory === cat.id ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white' : ''}`}
                  data-testid={`category-${cat.id}`}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Menu Items */}
          <ScrollArea className="h-[calc(100vh-360px)]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="soft-card rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all"
                  data-testid={`menu-item-${item.id}`}
                >
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 mb-3 flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">{item.name}</h3>
                  <p className="text-lg font-bold text-teal-600">
                    Rp {item.price.toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <div className="soft-card rounded-2xl p-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Keranjang</h2>
            
            <ScrollArea className="h-[calc(100vh-480px)] mb-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Keranjang kosong</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.menu_item_id} className="glass-effect rounded-xl p-3" data-testid={`cart-item-${item.menu_item_id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800 flex-1">{item.menu_item_name}</h4>
                        <button
                          onClick={() => removeFromCart(item.menu_item_id)}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`remove-item-${item.menu_item_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 rounded-lg"
                            onClick={() => updateQuantity(item.menu_item_id, -1)}
                            data-testid={`decrease-qty-${item.menu_item_id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-semibold w-8 text-center" data-testid={`qty-${item.menu_item_id}`}>{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0 rounded-lg"
                            onClick={() => updateQuantity(item.menu_item_id, 1)}
                            data-testid={`increase-qty-${item.menu_item_id}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="font-bold text-teal-600" data-testid={`item-subtotal-${item.menu_item_id}`}>
                          Rp {item.subtotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold" data-testid="cart-subtotal">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pajak ({settings?.tax_percentage || 10}%)</span>
                <span className="font-semibold" data-testid="cart-tax">Rp {tax.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span className="text-gray-800">Total</span>
                <span className="text-teal-600" data-testid="cart-total">Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full mt-4 h-12 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold shadow-lg"
              data-testid="checkout-button"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Proses Pembayaran
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="soft-card rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Pembayaran</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="glass-effect rounded-xl p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Pembayaran</p>
                <p className="text-3xl font-bold text-teal-600" data-testid="payment-total">
                  Rp {total.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="rounded-xl h-11" data-testid="payment-method-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="debit">Kartu Debit</SelectItem>
                  <SelectItem value="credit">Kartu Kredit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Bayar</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="number"
                  placeholder="Masukkan jumlah"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                  data-testid="amount-paid-input"
                />
              </div>
            </div>

            {amountPaid && changeAmount >= 0 && (
              <div className="glass-effect rounded-xl p-4 bg-green-50">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Kembalian</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="change-amount">
                    Rp {changeAmount.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={processPayment}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold"
              data-testid="confirm-payment-button"
            >
              Konfirmasi Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="soft-card rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Struk Pembayaran</DialogTitle>
          </DialogHeader>
          
          {receiptData && <ReceiptPrint data={receiptData} />}
          
          <DialogFooter>
            <Button
              onClick={() => setShowReceipt(false)}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold"
              data-testid="close-receipt-button"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </CashierLayout>
  );
};

export default CashierPOS;
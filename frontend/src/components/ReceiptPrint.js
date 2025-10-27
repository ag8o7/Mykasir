import React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ReceiptPrint = ({ data }) => {
  const { transaction, order, settings, change } = data;

  const printReceipt = () => {
    // ESC/POS commands for thermal printer
    const ESC = '\x1B';
    const GS = '\x1D';
    
    let receipt = '';
    
    // Initialize
    receipt += ESC + '@'; // Initialize printer
    
    // Header - Center align
    receipt += ESC + 'a' + '\x01'; // Center
    receipt += GS + '!' + '\x11'; // Double size
    receipt += settings.restaurant_name + '\n';
    receipt += GS + '!' + '\x00'; // Normal size
    receipt += settings.address + '\n';
    receipt += settings.phone + '\n';
    receipt += '--------------------------------\n';
    
    // Transaction info - Left align
    receipt += ESC + 'a' + '\x00'; // Left
    receipt += 'No. Transaksi: ' + transaction.transaction_number + '\n';
    receipt += 'Tanggal: ' + new Date(transaction.created_at).toLocaleString('id-ID') + '\n';
    receipt += 'Kasir: ' + transaction.cashier + '\n';
    if (order.table_number) {
      receipt += 'Meja: ' + order.table_number + '\n';
    }
    receipt += 'Tipe: ' + (order.order_type === 'dine-in' ? 'Dine In' : 'Takeaway') + '\n';
    receipt += '--------------------------------\n';
    
    // Items
    order.items.forEach(item => {
      receipt += item.menu_item_name + '\n';
      receipt += '  ' + item.quantity + ' x Rp ' + item.price.toLocaleString('id-ID');
      receipt += ' = Rp ' + item.subtotal.toLocaleString('id-ID') + '\n';
    });
    
    receipt += '--------------------------------\n';
    
    // Totals
    receipt += 'Subtotal: Rp ' + order.subtotal.toLocaleString('id-ID') + '\n';
    receipt += 'Pajak (' + settings.tax_percentage + '%): Rp ' + order.tax.toLocaleString('id-ID') + '\n';
    receipt += GS + '!' + '\x11'; // Double size
    receipt += 'TOTAL: Rp ' + order.total.toLocaleString('id-ID') + '\n';
    receipt += GS + '!' + '\x00'; // Normal size
    
    // Payment
    receipt += '--------------------------------\n';
    receipt += 'Bayar: Rp ' + transaction.amount_paid.toLocaleString('id-ID') + '\n';
    receipt += 'Kembali: Rp ' + change.toLocaleString('id-ID') + '\n';
    receipt += 'Metode: ' + transaction.payment_method.toUpperCase() + '\n';
    
    // Footer - Center
    receipt += '--------------------------------\n';
    receipt += ESC + 'a' + '\x01'; // Center
    receipt += 'Terima Kasih\n';
    receipt += 'Atas Kunjungan Anda\n';
    receipt += '\n\n\n';
    
    // Cut paper
    receipt += GS + 'V' + '\x41' + '\x03';
    
    // Try to print via Web Bluetooth
    printViaBluetooth(receipt);
  };

  const printViaBluetooth = async (data) => {
    try {
      if (!navigator.bluetooth) {
        toast.error('Bluetooth tidak didukung di browser ini');
        return;
      }

      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], // Generic printer service
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // Convert string to bytes
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      
      // Send data in chunks
      const chunkSize = 20;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      toast.success('Struk berhasil dicetak!');
    } catch (error) {
      console.error('Bluetooth print error:', error);
      toast.error('Gagal mencetak via Bluetooth. Silakan coba lagi atau gunakan Print biasa.');
    }
  };

  return (
    <div className="space-y-4" data-testid="receipt-container">
      {/* Receipt Preview */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 font-mono text-sm">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold">{settings.restaurant_name}</h3>
          <p className="text-xs">{settings.address}</p>
          <p className="text-xs">{settings.phone}</p>
        </div>
        
        <div className="border-t border-b border-gray-300 py-2 my-2">
          <p className="text-xs">No: {transaction.transaction_number}</p>
          <p className="text-xs">Tanggal: {new Date(transaction.created_at).toLocaleString('id-ID')}</p>
          <p className="text-xs">Kasir: {transaction.cashier}</p>
          {order.table_number && <p className="text-xs">Meja: {order.table_number}</p>}
        </div>
        
        <div className="space-y-2 my-3">
          {order.items.map((item, idx) => (
            <div key={idx}>
              <p className="font-semibold">{item.menu_item_name}</p>
              <div className="flex justify-between text-xs pl-2">
                <span>{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</span>
                <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-300 pt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span>Subtotal:</span>
            <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Pajak ({settings.tax_percentage}%):</span>
            <span>Rp {order.tax.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
            <span>TOTAL:</span>
            <span>Rp {order.total.toLocaleString('id-ID')}</span>
          </div>
        </div>
        
        <div className="border-t border-gray-300 mt-2 pt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Bayar:</span>
            <span>Rp {transaction.amount_paid.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Kembali:</span>
            <span>Rp {change.toLocaleString('id-ID')}</span>
          </div>
        </div>
        
        <div className="text-center mt-4 text-xs">
          <p>Terima Kasih</p>
          <p>Atas Kunjungan Anda</p>
        </div>
      </div>

      {/* Print Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={printReceipt}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
          data-testid="print-bluetooth-button"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Bluetooth
        </Button>
        <Button
          onClick={() => window.print()}
          variant="outline"
          className="rounded-xl"
          data-testid="print-normal-button"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Biasa
        </Button>
      </div>
    </div>
  );
};

export default ReceiptPrint;
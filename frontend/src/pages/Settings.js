import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

const Settings = ({ user, onLogout }) => {
  const [form, setForm] = useState({
    restaurant_name: '',
    address: '',
    phone: '',
    tax_percentage: '',
    logo_url: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/settings');
      setForm({
        restaurant_name: response.data.restaurant_name,
        address: response.data.address,
        phone: response.data.phone,
        tax_percentage: response.data.tax_percentage.toString(),
        logo_url: response.data.logo_url || ''
      });
    } catch (error) {
      toast.error('Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        tax_percentage: parseFloat(form.tax_percentage)
      };
      await axios.put('/settings', data);
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan');
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
      <div className="p-6 space-y-6" data-testid="settings-page">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Pengaturan</h1>
          <p className="text-gray-600">Kelola pengaturan restoran</p>
        </div>

        <div className="soft-card rounded-2xl p-6 max-w-2xl">
          <div className="space-y-6">
            <div>
              <Label className="text-gray-700 font-medium">Nama Restoran</Label>
              <Input
                value={form.restaurant_name}
                onChange={(e) => setForm({ ...form, restaurant_name: e.target.value })}
                className="rounded-xl mt-2 h-11"
                data-testid="restaurant-name-input"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium">Alamat</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="rounded-xl mt-2 h-11"
                data-testid="address-input"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium">Nomor Telepon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-xl mt-2 h-11"
                data-testid="phone-input"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium">Persentase Pajak (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.tax_percentage}
                onChange={(e) => setForm({ ...form, tax_percentage: e.target.value })}
                className="rounded-xl mt-2 h-11"
                data-testid="tax-percentage-input"
              />
              <p className="text-sm text-gray-500 mt-1">Contoh: 10 untuk 10%</p>
            </div>

            <div>
              <Label className="text-gray-700 font-medium">URL Logo (Opsional)</Label>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="rounded-xl mt-2 h-11"
                data-testid="logo-url-input"
              />
            </div>

            <Button
              onClick={handleSave}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
              data-testid="save-settings-button"
            >
              <Save className="w-5 h-5 mr-2" />
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
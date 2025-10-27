import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

const TableManagement = ({ user, onLogout }) => {
  const [tables, setTables] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [form, setForm] = useState({
    table_number: '',
    capacity: '',
    status: 'available'
  });

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await axios.get('/tables');
      setTables(response.data);
    } catch (error) {
      toast.error('Gagal memuat data meja');
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        capacity: parseInt(form.capacity)
      };
      
      if (editingTable) {
        await axios.put(`/tables/${editingTable.id}`, data);
        toast.success('Meja berhasil diupdate');
      } else {
        await axios.post('/tables', data);
        toast.success('Meja berhasil ditambahkan');
      }
      setShowDialog(false);
      setForm({ table_number: '', capacity: '', status: 'available' });
      setEditingTable(null);
      fetchTables();
    } catch (error) {
      toast.error('Gagal menyimpan meja');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus meja ini?')) return;
    try {
      await axios.delete(`/tables/${id}`);
      toast.success('Meja berhasil dihapus');
      fetchTables();
    } catch (error) {
      toast.error('Gagal menghapus meja');
    }
  };

  const openEdit = (table) => {
    setEditingTable(table);
    setForm({
      table_number: table.table_number,
      capacity: table.capacity.toString(),
      status: table.status
    });
    setShowDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'occupied':
        return 'bg-red-100 text-red-700';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Tersedia';
      case 'occupied':
        return 'Terisi';
      case 'reserved':
        return 'Direservasi';
      default:
        return status;
    }
  };

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-6" data-testid="table-management-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Manajemen Meja</h1>
            <p className="text-gray-600">Kelola meja restoran</p>
          </div>
          <Button
            onClick={() => {
              setEditingTable(null);
              setForm({ table_number: '', capacity: '', status: 'available' });
              setShowDialog(true);
            }}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            data-testid="add-table-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Meja
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tables.map(table => (
            <div
              key={table.id}
              className="soft-card rounded-2xl p-6 hover:shadow-lg transition-all"
              data-testid={`table-card-${table.id}`}
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{table.table_number}</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-lg ${getStatusColor(table.status)}`}>
                  {getStatusText(table.status)}
                </span>
              </div>
              
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">Kapasitas</p>
                <p className="font-semibold text-gray-800">{table.capacity} orang</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(table)}
                  className="flex-1 rounded-xl"
                  data-testid={`edit-table-${table.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(table.id)}
                  className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50"
                  data-testid={`delete-table-${table.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {tables.length === 0 && (
          <div className="soft-card rounded-2xl p-12 text-center">
            <p className="text-gray-500">Belum ada meja. Tambahkan meja pertama Anda!</p>
          </div>
        )}
      </div>

      {/* Table Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="soft-card rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Meja' : 'Tambah Meja'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nomor Meja</Label>
              <Input
                value={form.table_number}
                onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                placeholder="Contoh: 1, A1, VIP-1"
                className="rounded-xl mt-2"
                data-testid="table-number-input"
              />
            </div>
            <div>
              <Label>Kapasitas (orang)</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="4"
                className="rounded-xl mt-2"
                data-testid="table-capacity-input"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger className="rounded-xl mt-2" data-testid="table-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Tersedia</SelectItem>
                  <SelectItem value="occupied">Terisi</SelectItem>
                  <SelectItem value="reserved">Direservasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="rounded-xl" data-testid="save-table-button">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TableManagement;
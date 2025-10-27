import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, User } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

const UserManagement = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'kasir'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Gagal memuat data staff');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post('/auth/register', form);
      toast.success('Staff berhasil ditambahkan');
      setShowDialog(false);
      setForm({ username: '', password: '', full_name: '', role: 'kasir' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menambahkan staff');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Yakin ingin menghapus staff ini?')) return;
    try {
      await axios.delete(`/users/${userId}`);
      toast.success('Staff berhasil dihapus');
      fetchUsers();
    } catch (error) {
      toast.error('Gagal menghapus staff');
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
      <div className="p-6 space-y-6" data-testid="user-management-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Manajemen Staff</h1>
            <p className="text-gray-600">Kelola staff dan kasir</p>
          </div>
          <Button
            onClick={() => {
              setForm({ username: '', password: '', full_name: '', role: 'kasir' });
              setShowDialog(true);
            }}
            className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            data-testid="add-user-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Staff
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className="soft-card rounded-2xl p-6" data-testid={`user-card-${u.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{u.full_name}</h3>
                    <p className="text-sm text-gray-600">@{u.username}</p>
                  </div>
                </div>
                {u.id !== user.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(u.id)}
                    className="h-8 w-8 p-0 text-red-600"
                    data-testid={`delete-user-${u.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Role:</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Kasir'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Bergabung:</span>
                  <span className="font-medium">
                    {new Date(u.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="soft-card rounded-2xl p-12 text-center">
            <p className="text-gray-500">Belum ada staff. Tambahkan staff pertama Anda!</p>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="soft-card rounded-3xl">
          <DialogHeader>
            <DialogTitle>Tambah Staff Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nama Lengkap</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Doe"
                className="rounded-xl mt-2"
                data-testid="user-fullname-input"
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="johndoe"
                className="rounded-xl mt-2"
                data-testid="user-username-input"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="rounded-xl mt-2"
                data-testid="user-password-input"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger className="rounded-xl mt-2" data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kasir">Kasir</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} className="rounded-xl" data-testid="save-user-button">
              Tambah Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UserManagement;
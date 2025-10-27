import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';

const MenuManagement = ({ user, onLogout }) => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({
    name: '',
    category_id: '',
    price: '',
    description: '',
    available: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        axios.get('/categories'),
        axios.get('/menu-items')
      ]);
      setCategories(catRes.data);
      setMenuItems(itemRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await axios.put(`/categories/${editingCategory.id}`, categoryForm);
        toast.success('Kategori berhasil diupdate');
      } else {
        await axios.post('/categories', categoryForm);
        toast.success('Kategori berhasil ditambahkan');
      }
      setShowCategoryDialog(false);
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      toast.error('Gagal menyimpan kategori');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kategori ini?')) return;
    try {
      await axios.delete(`/categories/${id}`);
      toast.success('Kategori berhasil dihapus');
      fetchData();
    } catch (error) {
      toast.error('Gagal menghapus kategori');
    }
  };

  const handleSaveItem = async () => {
    try {
      const data = {
        ...itemForm,
        price: parseFloat(itemForm.price)
      };
      
      if (editingItem) {
        await axios.put(`/menu-items/${editingItem.id}`, data);
        toast.success('Item berhasil diupdate');
      } else {
        await axios.post('/menu-items', data);
        toast.success('Item berhasil ditambahkan');
      }
      setShowItemDialog(false);
      setItemForm({ name: '', category_id: '', price: '', description: '', available: true });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error('Gagal menyimpan item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Yakin ingin menghapus item ini?')) return;
    try {
      await axios.delete(`/menu-items/${id}`);
      toast.success('Item berhasil dihapus');
      fetchData();
    } catch (error) {
      toast.error('Gagal menghapus item');
    }
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, description: category.description || '' });
    setShowCategoryDialog(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category_id: item.category_id,
      price: item.price.toString(),
      description: item.description || '',
      available: item.available
    });
    setShowItemDialog(true);
  };

  return (
    <AdminLayout user={user} onLogout={onLogout}>
      <div className="p-6 space-y-6" data-testid="menu-management-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Manajemen Menu</h1>
            <p className="text-gray-600">Kelola kategori dan item menu restoran</p>
          </div>
        </div>

        {/* Categories Section */}
        <div className="soft-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Kategori</h2>
            <Button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '' });
                setShowCategoryDialog(true);
              }}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
              data-testid="add-category-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kategori
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="glass-effect rounded-xl p-4" data-testid={`category-item-${cat.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-800">{cat.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditCategory(cat)}
                      className="h-8 w-8 p-0"
                      data-testid={`edit-category-${cat.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="h-8 w-8 p-0 text-red-600"
                      data-testid={`delete-category-${cat.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {cat.description && (
                  <p className="text-sm text-gray-600">{cat.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items Section */}
        <div className="soft-card rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Item Menu</h2>
            <Button
              onClick={() => {
                setEditingItem(null);
                setItemForm({ name: '', category_id: '', price: '', description: '', available: true });
                setShowItemDialog(true);
              }}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
              data-testid="add-menu-item-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Item
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => {
              const category = categories.find(c => c.id === item.category_id);
              return (
                <div key={item.id} className="glass-effect rounded-xl p-4" data-testid={`menu-item-${item.id}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{item.name}</h3>
                      <span className="text-xs px-2 py-1 rounded-lg bg-teal-100 text-teal-700">
                        {category?.name || 'Uncategorized'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditItem(item)}
                        className="h-8 w-8 p-0"
                        data-testid={`edit-item-${item.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteItem(item.id)}
                        className="h-8 w-8 p-0 text-red-600"
                        data-testid={`delete-item-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Harga:</span>
                      <span className="font-bold text-teal-600">
                        Rp {item.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`text-xs px-2 py-1 rounded-lg ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.available ? 'Tersedia' : 'Tidak Tersedia'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="soft-card rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nama Kategori</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Contoh: Makanan"
                className="rounded-xl mt-2"
                data-testid="category-name-input"
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Input
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Deskripsi kategori (opsional)"
                className="rounded-xl mt-2"
                data-testid="category-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCategory} className="rounded-xl" data-testid="save-category-button">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="soft-card rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Tambah Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nama Item</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="Contoh: Nasi Goreng"
                className="rounded-xl mt-2"
                data-testid="item-name-input"
              />
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={itemForm.category_id} onValueChange={(val) => setItemForm({ ...itemForm, category_id: val })}>
                <SelectTrigger className="rounded-xl mt-2" data-testid="item-category-select">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Harga</Label>
              <Input
                type="number"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                placeholder="25000"
                className="rounded-xl mt-2"
                data-testid="item-price-input"
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Input
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Deskripsi item (opsional)"
                className="rounded-xl mt-2"
                data-testid="item-description-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="available"
                checked={itemForm.available}
                onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })}
                className="rounded"
                data-testid="item-available-checkbox"
              />
              <Label htmlFor="available">Tersedia</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveItem} className="rounded-xl" data-testid="save-item-button">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default MenuManagement;
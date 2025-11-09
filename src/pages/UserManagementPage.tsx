import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { getAuthToken } from '../lib/auth';
import { Plus, Edit, Trash2, Users as UsersIcon, Shield, Wrench, Building2 } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'hall';
  club_id: number | null;
  created_at: string;
  clubs?: {
    name: string;
    city: string;
  };
}

interface Club {
  id: number;
  name: string;
  city: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'technician' | 'hall';
  club_id: number | null;
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'technician',
    club_id: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
    loadClubs();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError('');
    
    try {
      const token = await getAuthToken();
      
      // Check if user is authenticated
      if (!token) {
        throw new Error('Niste prijavljeni. Molimo prijavite se ponovno.');
      }
      
      // Check if user has admin role
      if (!user || user.role !== 'admin') {
        throw new Error('Nemate dozvolu za pristup ovoj stranici. Potrebna je administratorska uloga.');
      }

      const { data, error: funcError } = await supabase.functions.invoke('users-list', {
        headers: {
          'x-user-token': token
        }
      });

      if (funcError || data.error) {
        const errorMessage = funcError?.message || data.error?.message || 'Failed to load users';
        console.error('Function error:', funcError || data.error);
        throw new Error(errorMessage);
      }

      setUsers(data.data.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadClubs() {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name');

      if (error) throw error;
      setClubs(data || []);
    } catch (err: any) {
      console.error('Failed to load clubs:', err);
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-5 h-5 text-red-600" />;
      case 'technician': return <Wrench className="w-5 h-5 text-blue-600" />;
      case 'club': return <Building2 className="w-5 h-5 text-green-600" />;
      default: return <UsersIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'technician': return 'Tehničar';
      case 'club': return 'Klub';
      default: return role;
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'technician',
      club_id: null
    });
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      club_id: user.club_id
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Niste prijavljeni. Molimo prijavite se ponovno.');
      }
      
      if (user?.role !== 'admin') {
        throw new Error('Nemate dozvolu za ovu akciju. Potrebna je administratorska uloga.');
      }
      
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          user_id: editingUser.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          club_id: formData.club_id
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        const { data, error: funcError } = await supabase.functions.invoke('users-update', {
          headers: {
            'x-user-token': token
          },
          body: updateData
        });

        if (funcError || data.error) {
          const errorMessage = funcError?.message || data.error?.message || 'Failed to update user';
          console.error('Update error:', funcError || data.error);
          throw new Error(errorMessage);
        }
      } else {
        // Create new user
        const { data, error: funcError } = await supabase.functions.invoke('users-create', {
          headers: {
            'x-user-token': token
          },
          body: formData
        });

        if (funcError || data.error) {
          const errorMessage = funcError?.message || data.error?.message || 'Failed to create user';
          console.error('Create error:', funcError || data.error);
          throw new Error(errorMessage);
        }
      }

      setShowModal(false);
      await loadUsers();
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (!confirm(`Sigurno želite obrisati korisnika "${userToDelete.name}"?`)) {
      return;
    }

    try {
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Niste prijavljeni. Molimo prijavite se ponovno.');
      }
      
      if (user?.role !== 'admin') {
        throw new Error('Nemate dozvolu za ovu akciju. Potrebna je administratorska uloga.');
      }
      
      const { data, error: funcError } = await supabase.functions.invoke('users-delete', {
        headers: {
          'x-user-token': token
        },
        body: { user_id: userToDelete.id }
      });

      if (funcError || data.error) {
        const errorMessage = funcError?.message || data.error?.message || 'Failed to delete user';
        console.error('Delete error:', funcError || data.error);
        throw new Error(errorMessage);
      }

      await loadUsers();
    } catch (err: any) {
      console.error('Delete user error:', err);
      setError(err.message);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Layout title="Užerske privilegije">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Nemate dozvolu za pristup ovoj stranici.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title="Upravljanje korisnicima">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Učitavanje...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Upravljanje korisnicima">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Ukupno korisnika: {users.length}
          </h2>
          <button
            onClick={handleAddUser}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj korisnika
          </button>
        </div>

        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getRoleIcon(user.role)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-gray-700">
                        {getRoleName(user.role)}
                      </span>
                      {user.clubs && (
                        <span className="text-sm text-gray-500">
                          • {user.clubs.name} ({user.clubs.city})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Kreiran: {new Date(user.created_at).toLocaleDateString('hr-HR')}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Uredi korisnika"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Obriši korisnika"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nema korisnika u sustavu.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingUser ? 'Uredi korisnika' : 'Dodaj novog korisnika'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ime i prezime
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite ime i prezime"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite email adresu"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? 'Nova lozinka (ostavite prazno ako ne mijenjate)' : 'Lozinka'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Unesite lozinku"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uloga
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      role: e.target.value as 'admin' | 'technician' | 'hall',
                      club_id: e.target.value === 'hall' ? formData.club_id : null
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="technician">Tehničar</option>
                    <option value="hall">Klub</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {formData.role === 'hall' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Klub
                    </label>
                    <select
                      required
                      value={formData.club_id || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        club_id: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Odaberite klub</option>
                      {clubs.map((club) => (
                        <option key={club.id} value={club.id}>
                          {club.name} ({club.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Otkaži
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Sprema...' : (editingUser ? 'Ažuriraj' : 'Kreiraj')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
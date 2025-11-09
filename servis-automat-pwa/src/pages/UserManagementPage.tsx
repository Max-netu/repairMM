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
  role: 'admin' | 'technician' | 'club';
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
  role: 'admin' | 'technician' | 'club';
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'technician': return 'Tehničar';
      case 'club': return 'Klub';
      default: return role;
    }
  };

  const getClubName = (clubId: number | null) => {
    if (!clubId) return 'Nije dodeljen';
    const club = clubs.find(c => c.id === clubId);
    return club ? `${club.name}, ${club.city}` : 'Nepoznat klub';
  };

  const openModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        role: userToEdit.role,
        club_id: userToEdit.club_id
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'technician',
        club_id: null
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'technician',
      club_id: null
    });
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
          <div className="flex">
            <Shield className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Nemate dozvolu za pristup
              </h3>
              <p className="text-sm text-red-700">
                Ova stranica je dostupna samo administratorima.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Upravljanje korisnicima">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <UsersIcon className="h-6 w-6 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">Upravljanje korisnicima</h1>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Dodaj korisnika</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <Shield className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Greška</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Ukupno korisnika</dt>
                <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Lista korisnika</h2>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Učitavanje korisnika...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-600">Nema korisnika u sustavu.</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Korisnik
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uloga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Klub
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum kreiranja
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRoleIcon(userItem.role)}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userItem.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {userItem.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getRoleLabel(userItem.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getClubName(userItem.club_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(userItem.created_at).toLocaleDateString('hr-HR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openModal(userItem)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Uredi korisnika"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userItem)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Obriši korisnika"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {editingUser ? 'Uredi korisnika' : 'Dodaj novog korisnika'}
                  </h3>
                  
                  <div className="space-y-4">
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
                        Lozinka {editingUser && '(ostavite prazno ako ne želite mijenjati)'}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={editingUser ? 'Ostavite prazno da zadržite trenutnu lozinku' : 'Unesite lozinku'}
                        required={!editingUser}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Uloga
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'technician' | 'club' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="technician">Tehničar</option>
                        <option value="club">Klub</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Klub
                      </label>
                      <select
                        value={formData.club_id || ''}
                        onChange={(e) => setFormData({ ...formData, club_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Nije dodeljen</option>
                        {clubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.name}, {club.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingUser ? 'Ažuriranje...' : 'Kreiranje...'}
                      </div>
                    ) : (
                      editingUser ? 'Ažuriraj' : 'Kreiraj'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Otkaži
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
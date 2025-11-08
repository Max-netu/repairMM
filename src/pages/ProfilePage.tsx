import { useAuth } from '../lib/AuthContext';
import Layout from '../components/Layout';
import { User, Mail, Building2, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  const getRoleName = () => {
    switch (user?.role) {
      case 'admin': return 'Administrator';
      case 'technician': return 'Tehničar';
      case 'club': return 'Klub';
      default: return 'Korisnik';
    }
  };

  return (
    <Layout title="Profil">
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-600">{getRoleName()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>

            {user?.club_id && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Klub</p>
                  <p className="font-medium text-gray-900">Klub ID: {user.club_id}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Odjavi se
        </button>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">O aplikaciji</h3>
          <p className="text-sm text-blue-700">
            Servis Automat Klub PWA v1.0
          </p>
          <p className="text-sm text-blue-600 mt-1">
            Sustav za upravljanje servisnim prijavama
          </p>
        </div>
      </div>
    </Layout>
  );
}
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase, DashboardStats } from '../lib/supabase';
import { getAuthToken } from '../lib/auth';
import { Activity, AlertCircle, CheckCircle, Clock, Package, FileText } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError('');
    
    try {
      const token = await getAuthToken();
      const { data, error: funcError } = await supabase.functions.invoke('dashboard-stats', {
        headers: {
          'x-user-token': token || ''
        }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Failed to load stats');
      }

      setStats(data.data.stats);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout title="Statistika">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Učitavanje...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Statistika">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <p className="text-sm sm:text-base text-red-600">{error}</p>
        </div>
      </Layout>
    );
  }

  const getRoleName = () => {
    switch (user?.role) {
      case 'admin': return 'Administrator';
      case 'technician': return 'Tehničar';
      case 'hall': return 'Klub';
      default: return 'Korisnik';
    }
  };

  return (
    <Layout title="Statistika">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 sm:p-6 text-white">
          <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Dobrodošli, {user?.name}!</h2>
          <p className="text-blue-100 text-sm sm:text-base">{getRoleName()}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm sm:shadow p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            <p className="text-xs sm:text-sm text-gray-600">Ukupno prijava</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm sm:shadow p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.novo || 0}</p>
            <p className="text-xs sm:text-sm text-gray-600">Nove prijave</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm sm:shadow p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.u_tijeku || 0}</p>
            <p className="text-xs sm:text-sm text-gray-600">U obradi</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm sm:shadow p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats?.zatvoreno || 0}</p>
            <p className="text-xs sm:text-sm text-gray-600">Zatvoreno</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Status prijava</h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-700">Nove</span>
              <span className="font-semibold text-red-600 text-sm sm:text-base">{stats?.by_status.novo || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-700">U obradi</span>
              <span className="font-semibold text-yellow-600 text-sm sm:text-base">{stats?.by_status.u_tijeku || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-700">Čeka dijelove</span>
              <span className="font-semibold text-orange-600 text-sm sm:text-base">{stats?.by_status['čeka se rezervni dio'] || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm sm:text-base text-gray-700">Čeka poreznu</span>
              <span className="font-semibold text-purple-600 text-sm sm:text-base">{stats?.by_status['čeka se porezna'] || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm sm:text-base text-gray-700">Zatvoreno</span>
              <span className="font-semibold text-green-600 text-sm sm:text-base">{stats?.by_status.zatvoreno || 0}</span>
            </div>
          </div>
        </div>

        {user?.role === 'admin' && stats?.by_club && stats.by_club.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Po klubovima</h3>
            <div className="space-y-3">
              {stats.by_club.map((club) => (
                <div key={club.club_id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{club.club_name}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-600">Ukupno</p>
                      <p className="font-semibold">{club.total}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Nove</p>
                      <p className="font-semibold text-red-600">{club.novo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">U obradi</p>
                      <p className="font-semibold text-yellow-600">{club.u_tijeku}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Zatvoreno</p>
                      <p className="font-semibold text-green-600">{club.zatvoreno}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
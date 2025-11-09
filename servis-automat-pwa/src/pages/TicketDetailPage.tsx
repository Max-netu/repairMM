import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase, Ticket, User } from '../lib/supabase';
import { getAuthToken } from '../lib/auth';
import { ArrowLeft, MapPin, Wrench, User as UserIcon, Calendar, Image as ImageIcon, History, MessageSquare } from 'lucide-react';

interface StatusHistory {
  id: number;
  old_status: string;
  new_status: string;
  comment: string;
  changed_by: number;
  created_at: string;
  user?: User;
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');

  useEffect(() => {
    loadTicket();
    loadStatusHistory();
    if (user?.role === 'admin') {
      loadTechnicians();
    }
  }, [id]);

  async function loadTicket() {
    setLoading(true);
    setError('');

    try {
      const token = await getAuthToken();
      const { data, error: funcError } = await supabase.functions.invoke('tickets-detail', {
        headers: {
          'x-user-token': token || ''
        },
        body: { id }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Neuspješno učitavanje zahtjeva');
      }

      setTicket(data.data.ticket);
    } catch (err: any) {
      console.error('Failed to load ticket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStatusHistory() {
    try {
      const token = await getAuthToken();
      const { data, error } = await supabase
        .from('request_status_history')
        .select(`
          *,
          user:users!changed_by(name, email)
        `)
        .eq('request_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (err: any) {
      console.error('Failed to load status history:', err);
    }
  }

  async function loadTechnicians() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'technician')
        .order('name');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (err: any) {
      console.error('Failed to load technicians:', err);
    }
  }

  async function handleUpdateStatus() {
    if (!newStatus || !statusComment) {
      setError('Status i komentar su obavezni');
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const token = await getAuthToken();
      const { data, error: funcError } = await supabase.functions.invoke('tickets-update', {
        headers: {
          'x-user-token': token || ''
        },
        body: {
          ticketId: parseInt(id!),
          status: newStatus,
          comment: statusComment
        }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Neuspješno ažuriranje statusa');
      }

      // Reload ticket and history
      await loadTicket();
      await loadStatusHistory();
      
      setShowStatusForm(false);
      setNewStatus('');
      setStatusComment('');
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      novo: 'Novo',
      u_tijeku: 'U tijeku',
      'čeka se rezervni dio': 'Čeka se rezervni dio',
      'čeka se porezna': 'Čeka se porezna',
      zatvoreno: 'Zatvoreno'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      novo: 'text-red-600 bg-red-50 border-red-200',
      u_tijeku: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'čeka se rezervni dio': 'text-orange-600 bg-orange-50 border-orange-200',
      'čeka se porezna': 'text-purple-600 bg-purple-50 border-purple-200',
      zatvoreno: 'text-green-600 bg-green-50 border-green-200'
    };
    return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <Layout title="Detalji zahtjeva">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Učitavanje zahtjeva...</div>
        </div>
      </Layout>
    );
  }

  if (error && !ticket) {
    return (
      <Layout title="Detalji zahtjeva">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout title="Detalji zahtjeva">
        <div className="text-center py-8 text-gray-500">
          Zahtjev nije pronađen
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Detalji zahtjeva">
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/tickets')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Nazad na listu</span>
        </button>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Ticket details */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl font-semibold text-gray-800">{ticket.title}</h1>
            <span className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold">{getStatusLabel(ticket.status)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Kreirao:</span>
              <span>{ticket.created_by?.name}</span>
            </div>
            {ticket.assigned_technician && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tehničar:</span>
                <span>{ticket.assigned_technician.name}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Kreiran:</span>
              <span>{new Date(ticket.created_at).toLocaleString('hr-HR')}</span>
            </div>
            {ticket.closed_at && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Zatvoren:</span>
                <span>{new Date(ticket.closed_at).toLocaleString('hr-HR')}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {ticket.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Opis problema</h3>
              <p className="text-gray-600 bg-gray-50 p-3 rounded">{ticket.description}</p>
            </div>
          )}

          {/* Comments */}
          {ticket.comments && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Komentari</h3>
              <div className="text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                {ticket.comments}
              </div>
            </div>
          )}
        </div>

        {/* Status change form (for authorized users) */}
        {user?.role !== 'hall' && (
          <div className="bg-white rounded-lg shadow p-6">
            {!showStatusForm ? (
              <button
                onClick={() => setShowStatusForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Promijeni status
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Novi status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Odaberite status</option>
                    <option value="novo">Novo</option>
                    <option value="u_tijeku">U tijeku</option>
                    <option value="čeka se rezervni dio">Čeka se rezervni dio</option>
                    <option value="čeka se porezna">Čeka se porezna</option>
                    <option value="zatvoreno">Zatvoreno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Komentar (obavezan)
                  </label>
                  <textarea
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Obrazložite promjenu statusa..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Ažuriranje...' : 'Ažuriraj'}
                  </button>
                  <button
                    onClick={() => {
                      setShowStatusForm(false);
                      setNewStatus('');
                      setStatusComment('');
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Otkaži
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status history */}
        {statusHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Historija promjena
            </h3>
            
            <div className="space-y-4">
              {statusHistory.map((history) => (
                <div key={history.id} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">
                      {getStatusLabel(history.old_status)} → {getStatusLabel(history.new_status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(history.created_at).toLocaleString('hr-HR')}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{history.comment}</p>
                  {history.user && (
                    <p className="text-xs text-gray-500 mt-1">
                      Korisnik: {history.user.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
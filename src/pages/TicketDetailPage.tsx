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

  async function updateStatus() {
    if (!newStatus || !statusComment.trim()) {
      setError('Status i komentar su obavezni');
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const token = await getAuthToken();
      const { data, error: funcError } = await supabase.functions.invoke('tickets-update', {
        body: {
          ticketId: ticket?.id,
          status: newStatus,
          comment: statusComment.trim()
        },
        headers: {
          'x-user-token': token || ''
        }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Neuspješno ažuriranje statusa');
      }

      setShowStatusForm(false);
      setNewStatus('');
      setStatusComment('');
      await loadTicket();
      await loadStatusHistory();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function assignTechnician(technicianId: number) {
    setUpdating(true);
    setError('');

    try {
      const token = await getAuthToken();
      const { data, error: funcError } = await supabase.functions.invoke('tickets-assign', {
        body: {
          ticketId: ticket?.id,
          technicianId
        },
        headers: {
          'x-user-token': token || ''
        }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Neuspješno dodjela tehničara');
      }

      await loadTicket();
    } catch (err: any) {
      console.error('Failed to assign technician:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      novo: 'Novo',
      u_tijeku: 'U tijeku',
      'čeka se rezervni dio': 'Čeka se rezervni dio',
      'čeka se porezna': 'Čeka se porezna',
      zatvoreno: 'Zatvoreno'
    };
    return statusLabels[status] || status;
  };

  const canUpdateStatus = user?.role === 'technician' || user?.role === 'admin';
  const canAssign = user?.role === 'admin';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Učitavanje...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !ticket) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || 'Zahtjev nije pronađen'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Nazad
        </button>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            {ticket.request_number && (
              <div className="inline-block bg-blue-100 text-blue-800 text-sm font-mono px-3 py-1 rounded mb-2">
                #{ticket.request_number}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{ticket.club?.name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Wrench className="w-4 h-4" />
                <span>Automat: {ticket.machine?.number} - {ticket.machine?.model}</span>
              </div>

              {ticket.employee_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <UserIcon className="w-4 h-4" />
                  <span>Djelatnik: {ticket.employee_name}</span>
                </div>
              )}

              {ticket.manufacturer && ticket.game_name && (
                <div className="text-sm text-gray-600">
                  <strong>Proizvođač i igra:</strong> {ticket.manufacturer} - {ticket.game_name}
                </div>
              )}

              {ticket.can_play && (
                <div className="text-sm text-gray-600">
                  <strong>Može igrati:</strong> 
                  <span className={`ml-1 ${ticket.can_play === 'da' ? 'text-green-600' : 'text-red-600'}`}>
                    {ticket.can_play === 'da' ? 'Da' : 'Ne'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="font-semibold">{getStatusLabel(ticket.status)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Prioritet:</span>
                <span className="font-semibold">{ticket.priority}</span>
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
                <span className="text-gray-600">Kreirano:</span>
                <span>
                  {new Date(ticket.created_at).toLocaleDateString('hr-HR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {ticket.description && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-gray-900 mb-2">Opis problema</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          {ticket.comments && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Komentari
              </h3>
              <div className="text-gray-700 whitespace-pre-wrap">{ticket.comments}</div>
            </div>
          )}

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Fotografije ({ticket.attachments.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {ticket.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={att.file_url}
                      alt={att.filename}
                      className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status History */}
        {statusHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Povijest promjena statusa
            </h3>
            <div className="space-y-3">
              {statusHistory.map((history) => (
                <div key={history.id} className="border-l-4 border-blue-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {getStatusLabel(history.new_status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(history.created_at).toLocaleString('hr-HR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{history.comment}</p>
                  <div className="text-xs text-gray-500">
                    {history.user?.name} ({history.user?.email})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assignment */}
        {canAssign && !ticket.assigned_technician_id && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Dodijeli tehničaru</h3>
            <div className="space-y-2">
              {technicians.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => assignTechnician(tech.id)}
                  disabled={updating}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <UserIcon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">{tech.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Update Form */}
        {canUpdateStatus && ticket.status !== 'zatvoreno' && !showStatusForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Ažuriranje statusa</h3>
            
            <div className="space-y-2">
              {ticket.status === 'novo' && (
                <button
                  onClick={() => { setNewStatus('u_tijeku'); setShowStatusForm(true); }}
                  disabled={updating}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  Započni obradu
                </button>
              )}

              {ticket.status === 'u_tijeku' && (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => { setNewStatus('čeka se rezervni dio'); setShowStatusForm(true); }}
                    disabled={updating}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Čeka se rezervni dio
                  </button>
                  <button
                    onClick={() => { setNewStatus('čeka se porezna'); setShowStatusForm(true); }}
                    disabled={updating}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Čeka se porezna
                  </button>
                  <button
                    onClick={() => { setNewStatus('zatvoreno'); setShowStatusForm(true); }}
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Zatvori zahtjev
                  </button>
                </div>
              )}

              {(ticket.status === 'čeka se rezervni dio' || ticket.status === 'čeka se porezna') && (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => { setNewStatus('u_tijeku'); setShowStatusForm(true); }}
                    disabled={updating}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Nastavi obradu
                  </button>
                  <button
                    onClick={() => { setNewStatus('zatvoreno'); setShowStatusForm(true); }}
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Zatvori zahtjev
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Update Form with Comment */}
        {showStatusForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Promijeni status u: {getStatusLabel(newStatus)}
            </h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Komentar (obavezno, minimalno 10 znakova) *
                </label>
                <textarea
                  id="comment"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Obrazložite promjenu statusa..."
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {statusComment.length}/10 znakova
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={updateStatus}
                  disabled={updating || statusComment.length < 10}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Ažuriranje...' : 'Potvrdi'}
                </button>
                <button
                  onClick={() => {
                    setShowStatusForm(false);
                    setNewStatus('');
                    setStatusComment('');
                    setError('');
                  }}
                  disabled={updating}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Otkaži
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
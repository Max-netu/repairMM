import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase, Ticket, User } from '../lib/supabase';
import { getAuthToken } from '../lib/auth';
import { ArrowLeft, MapPin, Wrench, User as UserIcon, Calendar, Image as ImageIcon } from 'lucide-react';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTicket();
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
        throw new Error(funcError?.message || data.error?.message || 'Failed to load ticket');
      }

      setTicket(data.data.ticket);
    } catch (err: any) {
      console.error('Failed to load ticket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    setError('');

    try {
      const token = await getAuthToken();
      const { data, error: funcError } = await supabase.functions.invoke('tickets-update', {
        body: {
          ticketId: ticket?.id,
          status: newStatus
        },
        headers: {
          'x-user-token': token || ''
        }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Failed to update ticket');
      }

      await loadTicket();
    } catch (err: any) {
      console.error('Failed to update ticket:', err);
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
        throw new Error(funcError?.message || data.error?.message || 'Failed to assign ticket');
      }

      await loadTicket();
    } catch (err: any) {
      console.error('Failed to assign ticket:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

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
          <p className="text-red-600">{error || 'Prijava nije pronađena'}</p>
        </div>
      </Layout>
    );
  }

  const canUpdateStatus = user?.role === 'technician' || user?.role === 'admin';
  const canAssign = user?.role === 'admin';

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

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{ticket.club?.name}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Wrench className="w-4 h-4" />
            <span>Automat: {ticket.machine?.number} - {ticket.machine?.model}</span>
          </div>

          {ticket.description && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-gray-900 mb-2">Opis</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold">{ticket.status}</span>
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

          {canAssign && !ticket.assigned_technician_id && (
            <div className="pt-4 border-t">
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

          {canUpdateStatus && ticket.status !== 'closed' && (
            <div className="pt-4 border-t space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Promijeni status</h3>
              
              {ticket.status === 'new' && (
                <button
                  onClick={() => updateStatus('in_progress')}
                  disabled={updating}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  U obradi
                </button>
              )}

              {ticket.status === 'in_progress' && (
                <>
                  <button
                    onClick={() => updateStatus('waiting_parts')}
                    disabled={updating}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Čeka dijelove
                  </button>
                  <button
                    onClick={() => updateStatus('waiting_tax')}
                    disabled={updating}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Čeka poreznu
                  </button>
                </>
              )}

              {(ticket.status === 'waiting_parts' || ticket.status === 'waiting_tax') && (
                <button
                  onClick={() => updateStatus('in_progress')}
                  disabled={updating}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  Nastavi obradu
                </button>
              )}

              {ticket.status !== 'new' && (
                <button
                  onClick={() => updateStatus('closed')}
                  disabled={updating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  Zatvori prijavu
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

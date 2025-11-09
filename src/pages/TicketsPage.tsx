import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase, Ticket } from '../lib/supabase';
import { getAuthToken } from '../lib/auth';
import { Circle, Clock, Package, FileX, CheckCircle, ChevronRight } from 'lucide-react';

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    setError('');

    try {
      const token = await getAuthToken();
      const { data, error: funcError } = await supabase.functions.invoke('tickets-list', {
        headers: {
          'x-user-token': token || ''
        }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Neuspješno učitavanje zahtjeva');
      }

      setTickets(data.data.tickets || []);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: any }> = {
      novo: { label: 'Novo', color: 'bg-red-100 text-red-700 border-red-200', icon: Circle },
      u_tijeku: { label: 'U tijeku', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      'čeka se rezervni dio': { label: 'Čeka se rezervni dio', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Package },
      'čeka se porezna': { label: 'Čeka se porezna', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: FileX },
      zatvoreno: { label: 'Zatvoreno', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
    };

    const badge = badges[status] || badges.novo;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-red-100 text-red-700',
    };

    const labels: Record<string, string> = {
      low: 'Nizak',
      normal: 'Normalan',
      high: 'Visok',
    };

    return (
      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${colors[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filter);

  if (loading) {
    return (
      <Layout title="Zahtjevi">
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
    <Layout title="Zahtjevi">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Svi ({tickets.length})
          </button>
          <button
            onClick={() => setFilter('novo')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'novo'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Novi ({tickets.filter(t => t.status === 'novo').length})
          </button>
          <button
            onClick={() => setFilter('u_tijeku')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'u_tijeku'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            U tijeku ({tickets.filter(t => t.status === 'u_tijeku').length})
          </button>
          <button
            onClick={() => setFilter('zatvoreno')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === 'zatvoreno'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Zatvoreni ({tickets.filter(t => t.status === 'zatvoreno').length})
          </button>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Nema zahtjeva</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {ticket.request_number && (
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          #{ticket.request_number}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{ticket.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{ticket.club?.name}</span>
                      <span>•</span>
                      <span>Automat #{ticket.machine?.number}</span>
                      {ticket.employee_name && (
                        <>
                          <span>•</span>
                          <span>{ticket.employee_name}</span>
                        </>
                      )}
                    </div>
                    {ticket.manufacturer && ticket.game_name && (
                      <div className="text-sm text-gray-500 mt-1">
                        {ticket.manufacturer} - {ticket.game_name}
                        {ticket.can_play && (
                          <span className="ml-2 text-xs">
                            ({ticket.can_play === 'da' ? 'Može igrati' : 'Ne može igrati'})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(ticket.status)}
                  {getPriorityBadge(ticket.priority)}
                </div>

                {ticket.assigned_technician && (
                  <div className="text-xs text-gray-600">
                    Tehničar: {ticket.assigned_technician.name}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2">
                  {new Date(ticket.created_at).toLocaleDateString('hr-HR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
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

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: Circle };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === filter);

  const getFilterLabel = (filter: string) => {
    const labels: Record<string, string> = {
      all: 'Svi',
      novo: 'Novi',
      u_tijeku: 'U tijeku',
      zatvoreno: 'Zatvoreni'
    };
    return labels[filter] || filter;
  };

  if (loading) {
    return (
      <Layout title="Prijave">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Učitavanje zahtjeva...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Prijave">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Prijave">
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {['all', 'novo', 'u_tijeku', 'zatvoreno'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {getFilterLabel(tab)}
            </button>
          ))}
        </div>

        {/* Tickets list */}
        <div className="space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filter === 'all' 
                ? 'Nema zahtjeva' 
                : `Nema zahtjeva sa statusom "${getFilterLabel(filter)}"`
              }
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(ticket.status)}
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
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
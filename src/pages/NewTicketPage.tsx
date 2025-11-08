import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase, Machine } from '../lib/supabase';
import { getAuthToken } from '../lib/auth';
import { Camera, X } from 'lucide-react';

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    machineId: '',
    title: '',
    description: '',
    priority: 'normal'
  });
  
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string }>>([]);

  useEffect(() => {
    loadMachines();
  }, []);

  async function loadMachines() {
    if (!user?.club_id) return;

    try {
      const token = await getAuthToken();
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('club_id', user.club_id)
        .order('number');

      if (error) throw error;
      setMachines(data || []);
    } catch (err: any) {
      console.error('Failed to load machines:', err);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setAttachments([...attachments, ...newAttachments]);
  }

  function removeAttachment(index: number) {
    URL.revokeObjectURL(attachments[index].preview);
    setAttachments(attachments.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!user?.club_id) {
        throw new Error('Club ID not found');
      }

      const token = await getAuthToken();

      // Convert files to base64
      const attachmentsData = await Promise.all(
        attachments.map(async (att) => {
          return new Promise<{ fileData: string; fileName: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                fileData: reader.result as string,
                fileName: att.file.name
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(att.file);
          });
        })
      );

      const { data, error: funcError } = await supabase.functions.invoke('tickets-create', {
        body: {
          clubId: user.club_id,
          machineId: parseInt(formData.machineId),
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          attachments: attachmentsData
        },
        headers: {
          'x-user-token': token || ''
        }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Failed to create ticket');
      }

      // Clean up
      attachments.forEach(att => URL.revokeObjectURL(att.preview));
      
      // Navigate to tickets list
      navigate('/tickets');
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (user?.role !== 'club') {
    return (
      <Layout title="Nova Prijava">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">Samo klubovi mogu kreirati prijave</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Nova Prijava">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label htmlFor="machine" className="block text-sm font-medium text-gray-700 mb-2">
              Automat *
            </label>
            <select
              id="machine"
              value={formData.machineId}
              onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Odaberite automat</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.number} - {machine.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Naslov *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Kratak opis problema"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Opis
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detaljniji opis problema..."
            />
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Prioritet
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Nizak</option>
              <option value="normal">Normalan</option>
              <option value="high">Visok</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotografije
            </label>
            
            <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
              <div className="text-center">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-600">Dodaj fotografije</span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {attachments.map((att, index) => (
                  <div key={index} className="relative">
                    <img
                      src={att.preview}
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Kreiranje...' : 'Kreiraj Prijavu'}
        </button>
      </form>
    </Layout>
  );
}
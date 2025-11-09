import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase, Machine, User } from '../lib/supabase';
import { getAuthToken } from '../lib/auth';
import { Camera, X } from 'lucide-react';

// Predefined manufacturer options from workflow specification
const MANUFACTURERS = [
  'APEX', 'ATRONIC', 'EGT', 'IGT', 'KAJOT', 'MERKUR', 'NOVOMATIC', 'ALFASTREET', 'SYNOT'
];

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    machineId: '',
    title: '',
    description: '',
    employeeName: '',
    manufacturer: '',
    gameName: '',
    canPlay: 'da', // Default to 'da'
    assignedTechnicianId: ''
  });
  
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string }>>([]);

  useEffect(() => {
    loadMachines();
    loadTechnicians();
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

  async function loadTechnicians() {
    try {
      const token = await getAuthToken();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'technician')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setTechnicians(data || []);
    } catch (err: any) {
      console.error('Failed to load technicians:', err);
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
    setSuccess('');
    setLoading(true);

    try {
      if (!user?.club_id) {
        throw new Error('Club ID nije pronađen');
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
          employeeName: formData.employeeName,
          manufacturer: formData.manufacturer,
          gameName: formData.gameName,
          canPlay: formData.canPlay,
          assignedTechnicianId: formData.assignedTechnicianId ? parseInt(formData.assignedTechnicianId) : null,
          attachments: attachmentsData
        },
        headers: {
          'x-user-token': token || ''
        }
      });

      if (funcError || data.error) {
        throw new Error(funcError?.message || data.error?.message || 'Neuspješno kreiranje zahtjeva');
      }

      // Clean up
      attachments.forEach(att => URL.revokeObjectURL(att.preview));
      
      // Show success message with request number
      setSuccess(data.data.message || 'Zahtjev uspješno kreiran!');
      
      // Navigate to tickets list after 2 seconds
      setTimeout(() => {
        navigate('/tickets');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (user?.role !== 'hall') {
    return (
      <Layout title="Novi Zahtjev">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">Samo djelatnici klubova mogu kreirati zahtjeve</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Novi Zahtjev">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Osnovne informacije</h3>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Naslov zahtjeva *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Kratko opisanje problema"
            />
          </div>

          <div>
            <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700 mb-2">
              Ime i prezime djelatnika *
            </label>
            <input
              id="employeeName"
              type="text"
              value={formData.employeeName}
              onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ime i prezime djelatnika koji prijavljuje"
            />
          </div>

          <div>
            <label htmlFor="machine" className="block text-sm font-medium text-gray-700 mb-2">
              Serijski broj automata *
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
            <label htmlFor="inventoryNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Inventarni broj
            </label>
            <input
              id="inventoryNumber"
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Inventarni broj (ako je poznat)"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Informacije o igri</h3>
          
          <div>
            <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700 mb-2">
              Proizvođač i igra *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <select
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Proizvođač</option>
                {MANUFACTURERS.map((manufacturer) => (
                  <option key={manufacturer} value={manufacturer}>
                    {manufacturer}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={formData.gameName}
                onChange={(e) => setFormData({ ...formData, gameName: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Naziv igre"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Dopušta li neispravnost dalje igrati? *
            </label>
            <div className="flex space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="canPlay"
                  value="da"
                  checked={formData.canPlay === 'da'}
                  onChange={(e) => setFormData({ ...formData, canPlay: e.target.value })}
                  required
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Da</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="canPlay"
                  value="ne"
                  checked={formData.canPlay === 'ne'}
                  onChange={(e) => setFormData({ ...formData, canPlay: e.target.value })}
                  required
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Ne</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Opis problema</h3>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Detaljni opis problema *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detaljno opisanje problema..."
            />
          </div>

          {technicians.length > 0 && (
            <div>
              <label htmlFor="technician" className="block text-sm font-medium text-gray-700 mb-2">
                Dodijeli tehničaru (opcionalno)
              </label>
              <select
                id="technician"
                value={formData.assignedTechnicianId}
                onChange={(e) => setFormData({ ...formData, assignedTechnicianId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Automatski dodijeli</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Fotografije</h3>
          
          <div>
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
                      alt={`Prilog ${index + 1}`}
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
          {loading ? 'Kreiranje...' : 'Kreiraj Zahtjev'}
        </button>
      </form>
    </Layout>
  );
}
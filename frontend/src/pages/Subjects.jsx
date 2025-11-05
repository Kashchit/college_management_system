import { useEffect, useState } from 'react';
import api from '../utils/api';
import Toast from '../components/Toast';

const Subjects = () => {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [enrollStudentId, setEnrollStudentId] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/subjects');
      setList(data);
      if (data[0]?.id) setSelectedSubject(data[0].id);
    } catch (e) {
      setToast({ message: 'Failed to load subjects', type: 'error' });
    }
  };

  useEffect(() => { load(); }, []);

  const createSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/subjects', { name, code });
      setToast({ message: 'Subject created', type: 'success' });
      setName(''); setCode('');
      await load();
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Create failed', type: 'error' });
    } finally { setLoading(false); }
  };

  const enroll = async (e) => {
    e.preventDefault();
    if (!selectedSubject) { setToast({ message: 'Select a subject', type: 'error' }); return; }
    setLoading(true);
    try {
      await api.post(`/subjects/${selectedSubject}/enroll`, { email: enrollEmail, studentId: enrollStudentId || undefined });
      setToast({ message: 'Enrolled user to subject', type: 'success' });
      setEnrollEmail('');
      setEnrollStudentId('');
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Enroll failed', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create Subject</h2>
            <form onSubmit={createSubject} className="space-y-3">
              <input className="w-full px-3 py-2 border rounded" placeholder="Name (e.g., Backend Development)" value={name} onChange={(e)=>setName(e.target.value)} required />
              <input className="w-full px-3 py-2 border rounded" placeholder="Code (e.g., BE-101)" value={code} onChange={(e)=>setCode(e.target.value)} required />
              <button disabled={loading} className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50">{loading ? 'Saving...' : 'Create'}</button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Enroll Student by Email</h2>
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Subject</label>
              <select className="w-full px-3 py-2 border rounded" value={selectedSubject} onChange={(e)=>setSelectedSubject(e.target.value)}>
                {list.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <form onSubmit={enroll} className="space-y-3">
              <input className="w-full px-3 py-2 border rounded" placeholder="Student email" value={enrollEmail} onChange={(e)=>setEnrollEmail(e.target.value)} required />
              <input className="w-full px-3 py-2 border rounded" placeholder="Student ID (optional, links to face)" value={enrollStudentId} onChange={(e)=>setEnrollStudentId(e.target.value)} />
              <button disabled={loading} className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50">{loading ? 'Enrolling...' : 'Enroll'}</button>
            </form>
            <p className="text-xs text-gray-500 mt-2">If Student ID is provided, the user will be linked to the face enrolled with the same Student ID.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">All Subjects</h2>
          {list.length === 0 ? (
            <div className="text-gray-600">No subjects</div>
          ) : (
            <ul className="divide-y">
              {list.map(s => (
                <li key={s.id} className="py-3 flex justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-500">{s.code}</div>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(s.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subjects;

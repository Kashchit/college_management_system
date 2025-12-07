import { useEffect, useState } from 'react';
import api from '../utils/api';
import Toast from '../components/Toast';

const Subjects = () => {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
      setToast({ message: 'Subject created successfully!', type: 'success' });
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
      setToast({ message: 'Student enrolled successfully!', type: 'success' });
      setEnrollEmail('');
      setEnrollStudentId('');
    } catch (e) {
      setToast({ message: e.response?.data?.message || 'Enroll failed', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900">Subject Management</h1>

        {/* Admin Actions - Only for Teachers */}
        {user.role === 'TEACHER' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg card-shadow hover-lift animate-scale-in">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Create Subject</h2>
              <form onSubmit={createSubject} className="space-y-3">
                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" placeholder="Name (e.g., Backend Development)" value={name} onChange={(e) => setName(e.target.value)} required />
                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" placeholder="Code (e.g., BE-101)" value={code} onChange={(e) => setCode(e.target.value)} required />
                <button disabled={loading} className="w-full bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] text-white px-4 py-3 rounded-lg disabled:opacity-50 transition-all hover-lift shadow-lg font-medium">{loading ? 'Saving...' : 'Create Subject'}</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg card-shadow hover-lift animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Enroll Student</h2>
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-1 font-medium">Subject</label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                  {list.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <form onSubmit={enroll} className="space-y-3">
                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" placeholder="Student email" value={enrollEmail} onChange={(e) => setEnrollEmail(e.target.value)} required />
                <input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" placeholder="Student ID (optional, links to face)" value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)} />
                <button disabled={loading} className="w-full bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] text-white px-4 py-3 rounded-lg disabled:opacity-50 transition-all hover-lift shadow-lg font-medium">{loading ? 'Enrolling...' : 'Enroll Student'}</button>
              </form>
              <p className="text-xs text-gray-500 mt-3">If Student ID is provided, the user will be linked to the face enrolled with the same Student ID.</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-lg card-shadow animate-slide-up">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">All Subjects</h2>
          {list.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No subjects created yet</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {list.map((s, idx) => (
                <li key={s.id} className="py-4 flex justify-between items-center hover:bg-gray-50 transition-colors rounded-lg px-2" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div>
                    <div className="font-medium text-gray-900">{s.name}</div>
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

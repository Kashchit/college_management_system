import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import Toast from '../components/Toast';

const Dashboard = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: '',
    subject: '',
    studentId: ''
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAttendance();
  }, [filters]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.studentId) params.append('studentId', filters.studentId);

      const response = await api.get(`/attendance?${params.toString()}`);
      setAttendance(response.data);
    } catch (error) {
      setToast({ message: 'Failed to load attendance data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0,10);
    const isToday = (ts) => new Date(ts).toISOString().slice(0,10) === todayStr;

    const total = attendance.length;
    const today = attendance.filter(r => isToday(r.timestamp)).length;
    const uniqueStudents = new Set(attendance.map(r => r.studentId)).size;

    const perSubject = attendance.reduce((acc, r) => {
      acc[r.subject || 'General'] = (acc[r.subject || 'General'] || 0) + 1;
      return acc;
    }, {});

    const recent = [...attendance].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0,10);

    return { total, today, uniqueStudents, perSubject, recent };
  }, [attendance]);

  const exportCSV = () => {
    if (attendance.length === 0) {
      setToast({ message: 'No data to export', type: 'error' });
      return;
    }

    const headers = ['Student ID', 'Name', 'Subject', 'Date', 'Time', 'Confidence'];
    const rows = attendance.map(record => [
      record.studentId,
      record.name,
      record.subject,
      new Date(record.timestamp).toLocaleDateString(),
      new Date(record.timestamp).toLocaleTimeString(),
      (record.confidence * 100).toFixed(2) + '%'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setToast({ message: 'CSV exported successfully', type: 'success' });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
          <button
            onClick={exportCSV}
            className="bg-primary hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
          >
            Export CSV
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-gray-500 text-sm">Today</div>
            <div className="text-3xl font-bold">{stats.today}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-gray-500 text-sm">Total Records</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <div className="text-gray-500 text-sm">Unique Students</div>
            <div className="text-3xl font-bold">{stats.uniqueStudents}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Per Subject Counts</h2>
          {Object.keys(stats.perSubject).length === 0 ? (
            <div className="text-gray-600">No data</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(stats.perSubject).map(([subject, count]) => (
                <div key={subject} className="border rounded p-4">
                  <div className="text-gray-500 text-sm">{subject}</div>
                  <div className="text-2xl font-bold">{count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Attendance</h2>
          {stats.recent.length === 0 ? (
            <div className="text-gray-600">No recent records</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recent.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.studentId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.subject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.timestamp).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input type="text" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} placeholder="Filter by subject" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input type="text" value={filters.studentId} onChange={(e) => setFilters({ ...filters, studentId: e.target.value })} placeholder="Filter by student ID" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle, Clock, FileText, TrendingUp, BookOpen, RefreshCw, Plus, X, Send } from 'lucide-react';
import api from '../utils/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#10b981', '#f43f5e'];
const ENDPOINT = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

const StudentDashboard = () => {
    const [stats, setStats] = useState({
        totalAttendance: 0,
        attendanceRate: 0,
        pendingAssignments: 0,
        submittedAssignments: 0
    });
    const [attendanceData, setAttendanceData] = useState([]);
    const [upcomingAssignments, setUpcomingAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState({});

    // Leave request state
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [newLeave, setNewLeave] = useState({
        subjectId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        if (storedUser.id) {
            loadDashboardData(storedUser.id);
        }

        // Reload data when window gains focus
        const handleFocus = () => {
            if (storedUser.id) loadDashboardData(storedUser.id);
        };
        window.addEventListener('focus', handleFocus);

        // Socket connection
        const socket = io(ENDPOINT, {
            withCredentials: true,
        });

        socket.on('attendance_update', () => {
            if (storedUser.id) loadDashboardData(storedUser.id);
        });

        socket.on('leave_request_update', () => {
            if (storedUser.id) loadDashboardData(storedUser.id);
        });

        return () => {
            window.removeEventListener('focus', handleFocus);
            socket.close();
        };
    }, []);

    const loadDashboardData = async (userId) => {
        try {
            setLoading(true);
            const results = await Promise.allSettled([
                api.get(`/attendance?studentId=${userId}`),
                api.get('/subjects'),
                api.get('/leave-requests/my-requests')
            ]);

            const [attendanceRes, subjectsRes, leaveRes] = results;

            // Helper to get data or default
            const getData = (res, defaultVal = []) => (res.status === 'fulfilled' ? res.value.data : defaultVal);

            if (attendanceRes.status === 'rejected') console.error('Attendance fetch failed:', attendanceRes.reason);
            if (subjectsRes.status === 'rejected') console.error('Subjects fetch failed:', subjectsRes.reason);
            if (leaveRes.status === 'rejected') console.error('Leave requests fetch failed:', leaveRes.reason);

            const subjectsData = getData(subjectsRes);
            const attendanceData = getData(attendanceRes);
            const leaveData = getData(leaveRes);

            setSubjects(subjectsData);
            setLeaveRequests(leaveData);

            if (subjectsData[0]?.id) {
                setNewLeave(prev => ({ ...prev, subjectId: subjectsData[0].id }));
            }

            // Calculate attendance stats
            const totalAttendance = attendanceData.length;
            const attendanceRate = totalAttendance > 0
                ? ((attendanceData.filter(a => a.confidence > 0.5).length / totalAttendance) * 100).toFixed(1)
                : 0;

            setStats(prev => ({
                ...prev,
                totalAttendance,
                attendanceRate
            }));

            // Process attendance by date (last 7 days)
            const attendanceByDate = attendanceData.reduce((acc, curr) => {
                const date = new Date(curr.timestamp).toLocaleDateString();
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});

            setAttendanceData(
                Object.entries(attendanceByDate)
                    .slice(-7)
                    .map(([date, count]) => ({ date, count }))
            );

            // Load assignments for enrolled subjects
            const assignmentPromises = subjectsData.map(subject =>
                api.get(`/assignments?subjectId=${subject.id}`).catch(() => ({ data: [] }))
            );

            const assignmentResults = await Promise.all(assignmentPromises);
            const allAssignments = assignmentResults.flatMap(res => res.data || []);

            // Get upcoming assignments (due in next 7 days)
            const now = new Date();
            const upcoming = allAssignments.filter(a => {
                const dueDate = new Date(a.due_date);
                const daysUntil = (dueDate - now) / (1000 * 60 * 60 * 24);
                return daysUntil > 0 && daysUntil <= 7;
            }).slice(0, 5);

            setUpcomingAssignments(upcoming);
            setStats(prev => ({
                ...prev,
                pendingAssignments: upcoming.length,
                submittedAssignments: allAssignments.length - upcoming.length
            }));
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leave-requests', newLeave);
            setShowLeaveModal(false);
            setNewLeave({ subjectId: subjects[0]?.id || '', startDate: '', endDate: '', reason: '' });
            loadDashboardData(user.id);
            alert('Leave request submitted successfully!');
        } catch (error) {
            alert('Failed to submit leave request');
        }
    };

    const statCards = [
        { icon: CheckCircle, label: 'Attendance Rate', value: `${stats.attendanceRate}%`, color: 'from-green-500 to-emerald-500' },
        { icon: Calendar, label: 'Total Classes', value: stats.totalAttendance, color: 'from-blue-500 to-cyan-500' },
        { icon: Clock, label: 'Pending', value: stats.pendingAssignments, color: 'from-orange-500 to-red-500' },
        { icon: FileText, label: 'Submitted', value: stats.submittedAssignments, color: 'from-purple-500 to-pink-500' }
    ];

    const attendancePieData = [
        { name: 'Present', value: parseInt(stats.attendanceRate) },
        { name: 'Absent', value: 100 - parseInt(stats.attendanceRate) }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome back, {user.name}!</p>
                </div>
                <button
                    onClick={() => loadDashboardData(user.id)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                    >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                            <stat.icon className="text-white" size={24} />
                        </div>
                        <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trend */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" />
                        My Attendance (Last 7 Days)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={attendanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Attendance Rate Pie */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-600" />
                        Overall Attendance
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={attendancePieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {attendancePieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Upcoming Assignments */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen size={20} className="text-purple-600" />
                    Upcoming Assignments
                </h3>
                {upcomingAssignments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No upcoming assignments</p>
                ) : (
                    <div className="space-y-3">
                        {upcomingAssignments.map((assignment, idx) => (
                            <motion.div
                                key={assignment.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div>
                                    <p className="font-semibold text-gray-900">{assignment.title}</p>
                                    <p className="text-sm text-gray-600">{assignment.description?.substring(0, 60)}...</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-orange-600">
                                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Leave Requests Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        My Leave Requests
                    </h3>
                    <button
                        onClick={() => setShowLeaveModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                        <Plus size={18} />
                        Request Leave
                    </button>
                </div>

                <div className="space-y-3">
                    {leaveRequests.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No leave requests yet</p>
                    ) : (
                        leaveRequests.slice(0, 5).map(leave => (
                            <div key={leave.id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{leave.subject_name || 'General'}</h4>
                                        <p className="text-sm text-gray-700 mt-1">{leave.reason}</p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${leave.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Leave Request Modal */}
            <AnimatePresence>
                {showLeaveModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Request Leave</h2>
                                <button onClick={() => setShowLeaveModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleLeaveSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <select
                                        required
                                        value={newLeave.subjectId}
                                        onChange={e => setNewLeave({ ...newLeave, subjectId: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={newLeave.startDate}
                                        onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={newLeave.endDate}
                                        onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                    <textarea
                                        required
                                        rows="3"
                                        value={newLeave.reason}
                                        onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Please provide a reason for your leave..."
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowLeaveModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                                    >
                                        <Send size={18} />
                                        Submit Request
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentDashboard;

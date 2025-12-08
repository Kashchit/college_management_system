import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, FileText, TrendingUp, Calendar, Award, RefreshCw, Megaphone, Plus, X, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'];
const ENDPOINT = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';

const TeacherDashboard = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalSubjects: 0,
        totalAssignments: 0,
        avgAttendance: 0
    });
    const [attendanceData, setAttendanceData] = useState([]);
    const [subjectData, setSubjectData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Announcements
    const [announcements, setAnnouncements] = useState([]);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', targetAudience: 'ALL', subjectId: '' });
    const [subjects, setSubjects] = useState([]);

    // Leave requests
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    // Attendance marking
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedSubjectForAttendance, setSelectedSubjectForAttendance] = useState('');
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [attendanceMarks, setAttendanceMarks] = useState({});

    useEffect(() => {
        loadDashboardData();

        // Reload data when window gains focus (user returns to tab)
        const handleFocus = () => loadDashboardData();
        window.addEventListener('focus', handleFocus);

        // Socket connection
        const socket = io(ENDPOINT, {
            withCredentials: true,
        });

        socket.on('attendance_update', () => {
            loadDashboardData();
        });

        socket.on('leave_request_update', () => {
            loadDashboardData();
        });

        return () => {
            window.removeEventListener('focus', handleFocus);
            socket.close();
        };
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const results = await Promise.allSettled([
                api.get('/attendance'),
                api.get('/subjects'),
                api.get('/assignments?subjectId=all'),
                api.get('/announcements'),
                api.get('/leave-requests/pending'),
                api.get('/users?role=STUDENT')
            ]);

            const [attendanceRes, subjectsRes, assignmentsRes, announcementsRes, leaveRes, studentsRes] = results;

            // Helper to get data or default
            const getData = (res, defaultVal = []) => (res.status === 'fulfilled' ? res.value.data : defaultVal);

            if (attendanceRes.status === 'rejected') console.error('Attendance fetch failed:', attendanceRes.reason);
            if (subjectsRes.status === 'rejected') console.error('Subjects fetch failed:', subjectsRes.reason);
            if (assignmentsRes.status === 'rejected') console.error('Assignments fetch failed:', assignmentsRes.reason);
            if (announcementsRes.status === 'rejected') console.error('Announcements fetch failed:', announcementsRes.reason);
            if (leaveRes.status === 'rejected') console.error('Leave requests fetch failed:', leaveRes.reason);
            if (studentsRes.status === 'rejected') console.error('Students fetch failed:', studentsRes.reason);

            const subjectsData = getData(subjectsRes);
            const attendanceData = getData(attendanceRes);
            const studentsData = getData(studentsRes);
            const assignmentsData = getData(assignmentsRes);

            setSubjects(subjectsData);
            setAnnouncements(getData(announcementsRes));
            setLeaveRequests(getData(leaveRes));

            if (subjectsData[0]?.id) {
                setSelectedSubjectForAttendance(subjectsData[0].id);
            }

            // Calculate stats
            const totalStudents = studentsData.length;
            const avgAttendance = attendanceData.length > 0
                ? ((attendanceData.filter(a => a.confidence > 0.5).length / attendanceData.length) * 100).toFixed(1)
                : 0;

            setStats({
                totalStudents: totalStudents,
                totalSubjects: subjectsData.length,
                totalAssignments: assignmentsData.length || 0,
                avgAttendance
            });

            // Process attendance by date
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

            // Process subject enrollment
            setSubjectData(
                subjectsData.map(s => ({
                    name: s.code,
                    students: s.enrolled_count || 0
                }))
            );
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAnnouncements = async () => {
        try {
            const { data } = await api.get('/announcements');
            setAnnouncements(data);
        } catch (e) {
            console.error('Failed to load announcements');
        }
    };

    const handleLeaveAction = async (leaveId, action) => {
        try {
            await api.put(`/leave-requests/${leaveId}/${action}`);
            loadDashboardData();
            alert(`Leave request ${action}d successfully`);
        } catch (error) {
            alert(`Failed to ${action} leave request`);
        }
    };

    const openAttendanceModal = async () => {
        if (!selectedSubjectForAttendance) return;
        try {
            const { data } = await api.get(`/subjects/${selectedSubjectForAttendance}/students`);
            setEnrolledStudents(data || []);
            const marks = {};
            data.forEach(student => {
                marks[student.id] = 'present';
            });
            setAttendanceMarks(marks);
            setShowAttendanceModal(true);
        } catch (error) {
            alert('Failed to load students');
        }
    };

    const handleAttendanceSubmit = async () => {
        try {
            const attendance = Object.entries(attendanceMarks).map(([studentId, status]) => ({
                studentId,
                status
            }));

            await api.post('/attendance/mark-class', {
                subjectId: selectedSubjectForAttendance,
                date: new Date().toISOString(),
                attendance
            });

            setShowAttendanceModal(false);
            loadDashboardData();
            alert('Attendance marked successfully!');
        } catch (error) {
            alert('Failed to mark attendance');
        }
    };

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await api.post('/announcements', newAnnouncement);
            setShowAnnouncementModal(false);
            setNewAnnouncement({ title: '', content: '', targetAudience: 'ALL', subjectId: '' });
            loadAnnouncements();
            alert('Announcement sent successfully!');
        } catch (e) {
            alert('Failed to send announcement');
        }
    };

    const statCards = [
        { icon: Users, label: 'Total Students', value: stats.totalStudents, color: 'from-blue-500 to-cyan-500' },
        { icon: BookOpen, label: 'Subjects', value: stats.totalSubjects, color: 'from-purple-500 to-pink-500' },
        { icon: FileText, label: 'Assignments', value: stats.totalAssignments, color: 'from-orange-500 to-red-500' },
        { icon: TrendingUp, label: 'Avg Attendance', value: `${stats.avgAttendance}%`, color: 'from-green-500 to-emerald-500' }
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
                    <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
                    <p className="text-gray-600 mt-1">Overview of all classes and student performance</p>
                </div>
                <button
                    onClick={loadDashboardData}
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
                        <Calendar size={20} className="text-indigo-600" />
                        Attendance Trend (Last 7 Days)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={attendanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Subject Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Award size={20} className="text-purple-600" />
                        Students per Subject
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={subjectData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="students"
                            >
                                {subjectData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Attendance Marking Widget */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                        <UserCheck className="text-green-500" />
                        Mark Attendance
                    </h3>
                    <div className="space-y-4">
                        <select
                            value={selectedSubjectForAttendance}
                            onChange={e => setSelectedSubjectForAttendance(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                        </select>
                        <button
                            onClick={openAttendanceModal}
                            className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Calendar size={20} />
                            Mark Today's Attendance
                        </button>
                    </div>
                </div>

                {/* Leave Requests Widget */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="text-blue-500" />
                            Leave Requests
                        </h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {leaveRequests.length} Pending
                        </span>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {leaveRequests.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No pending requests</p>
                        ) : (
                            leaveRequests.slice(0, 3).map(leave => (
                                <div key={leave.id} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{leave.student_name}</h4>
                                            <p className="text-sm text-gray-600">{leave.subject_name}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-3">{leave.reason}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleLeaveAction(leave.id, 'approve')}
                                            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1"
                                        >
                                            <CheckCircle size={16} />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleLeaveAction(leave.id, 'reject')}
                                            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-1"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Announcements Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Megaphone className="text-orange-500" />
                        Announcements
                    </h3>
                    <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                    >
                        <Plus size={18} />
                        New Announcement
                    </button>
                </div>

                <div className="space-y-4">
                    {announcements.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No announcements yet.</p>
                    ) : (
                        announcements.slice(0, 3).map(ann => (
                            <div key={ann.id} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
                                <h4 className="font-bold text-gray-900">{ann.title}</h4>
                                <p className="text-gray-700 mt-1">{ann.content}</p>
                                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                                    <span>To: {ann.target_audience === 'ALL' ? 'Everyone' : 'Subject'}</span>
                                    <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 text-left transition-all">
                        <FileText size={24} className="mb-2" />
                        <p className="font-semibold">Create Assignment</p>
                        <p className="text-sm text-white/80">Post new work for students</p>
                    </button>
                    <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 text-left transition-all">
                        <Users size={24} className="mb-2" />
                        <p className="font-semibold">Mark Attendance</p>
                        <p className="text-sm text-white/80">Record student presence</p>
                    </button>
                    <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 text-left transition-all">
                        <BookOpen size={24} className="mb-2" />
                        <p className="font-semibold">View Subjects</p>
                        <p className="text-sm text-white/80">Manage your classes</p>
                    </button>
                </div>
            </div>

            {/* Create Announcement Modal */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Create Announcement</h2>
                            <button onClick={() => setShowAnnouncementModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newAnnouncement.title}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Important Update"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                <textarea
                                    required
                                    rows="4"
                                    value={newAnnouncement.content}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Write your announcement here..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                                <select
                                    value={newAnnouncement.targetAudience}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, targetAudience: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="ALL">All Students</option>
                                    <option value="SUBJECT">Specific Subject</option>
                                </select>
                            </div>
                            {newAnnouncement.targetAudience === 'SUBJECT' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                                    <select
                                        required
                                        value={newAnnouncement.subjectId}
                                        onChange={e => setNewAnnouncement({ ...newAnnouncement, subjectId: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select a subject...</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAnnouncementModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                >
                                    Send Announcement
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Attendance Marking Modal */}
            <AnimatePresence>
                {showAttendanceModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Mark Attendance</h2>
                                <button onClick={() => setShowAttendanceModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-600">
                                    Subject: <span className="font-semibold">{subjects.find(s => s.id === selectedSubjectForAttendance)?.name}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Date: <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                                </p>
                            </div>

                            <div className="space-y-2 mb-6">
                                {enrolledStudents.map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-gray-900">{student.name}</p>
                                            <p className="text-sm text-gray-600">{student.email}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setAttendanceMarks({ ...attendanceMarks, [student.id]: 'present' })}
                                                className={`px-4 py-2 rounded-lg transition-colors ${attendanceMarks[student.id] === 'present'
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                            >
                                                Present
                                            </button>
                                            <button
                                                onClick={() => setAttendanceMarks({ ...attendanceMarks, [student.id]: 'absent' })}
                                                className={`px-4 py-2 rounded-lg transition-colors ${attendanceMarks[student.id] === 'absent'
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                            >
                                                Absent
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowAttendanceModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAttendanceSubmit}
                                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                >
                                    Save Attendance
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherDashboard;

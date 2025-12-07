import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Upload, CheckCircle, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import api from '../utils/api';
import Toast from '../components/Toast';

const Assignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [user, setUser] = useState({});

    // Form States
    const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '' });
    const [submissionContent, setSubmissionContent] = useState('');
    const [submissionFile, setSubmissionFile] = useState(null);
    const [grading, setGrading] = useState({ id: null, grade: '', feedback: '' });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
        loadSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            loadAssignments(selectedSubject);
        }
    }, [selectedSubject]);

    const loadSubjects = async () => {
        try {
            const { data } = await api.get('/subjects');
            setSubjects(data);
            if (data.length > 0) setSelectedSubject(data[0].id);
        } catch (e) {
            setToast({ message: 'Failed to load subjects', type: 'error' });
        }
    };

    const loadAssignments = async (subjectId) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/assignments?subjectId=${subjectId}`);
            setAssignments(data);
        } catch (e) {
            setToast({ message: 'Failed to load assignments', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/assignments', { ...newAssignment, subjectId: selectedSubject });
            setToast({ message: 'Assignment created!', type: 'success' });
            setShowCreateModal(false);
            setNewAssignment({ title: '', description: '', dueDate: '' });
            loadAssignments(selectedSubject);
        } catch (e) {
            setToast({ message: 'Failed to create assignment', type: 'error' });
        }
    };

    const handleDelete = async (assignmentId) => {
        if (!window.confirm('Are you sure you want to delete this assignment?')) return;
        try {
            await api.delete(`/assignments/${assignmentId}`);
            setToast({ message: 'Assignment deleted', type: 'success' });
            loadAssignments(selectedSubject);
        } catch (e) {
            setToast({ message: 'Failed to delete assignment', type: 'error' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('content', submissionContent);
            if (submissionFile) {
                formData.append('file', submissionFile);
            }

            await api.post(`/assignments/${selectedAssignment.id}/submit`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setToast({ message: 'Assignment submitted successfully!', type: 'success' });
            setShowSubmitModal(false);
            setSubmissionContent('');
            setSubmissionFile(null);
            loadAssignments(selectedSubject);
        } catch (e) {
            setToast({ message: e.response?.data?.message || 'Failed to submit', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const loadSubmissions = async (assignmentId) => {
        if (user.role !== 'TEACHER') return;
        try {
            const { data } = await api.get(`/assignments/${assignmentId}/submissions`);
            setSubmissions(data);
            setSelectedAssignment({ ...assignments.find(a => a.id === assignmentId), id: assignmentId });
        } catch (e) {
            setToast({ message: 'Failed to load submissions', type: 'error' });
        }
    };

    const handleGrade = async (submissionId) => {
        try {
            await api.post(`/assignments/submissions/${submissionId}/grade`, {
                grade: grading.grade,
                feedback: grading.feedback
            });
            setToast({ message: 'Graded successfully', type: 'success' });
            setGrading({ id: null, grade: '', feedback: '' });
            loadSubmissions(selectedAssignment.id);
        } catch (e) {
            setToast({ message: 'Failed to grade', type: 'error' });
        }
    };

    return (
        <div className="p-6 space-y-6 min-h-screen bg-gray-50/50">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
                {user.role === 'TEACHER' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={20} /> Create Assignment
                    </button>
                )}
            </div>

            {/* Subject Selector */}
            <div className="flex gap-4 overflow-x-auto pb-2">
                {subjects.map(sub => (
                    <button
                        key={sub.id}
                        onClick={() => setSelectedSubject(sub.id)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${selectedSubject === sub.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        {sub.name}
                    </button>
                ))}
            </div>

            {/* Assignments List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading assignments...</div>
                ) : assignments.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                        No assignments found for this subject.
                    </div>
                ) : (
                    assignments.map((assignment, idx) => (
                        <motion.div
                            key={assignment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">{assignment.title}</h3>
                                    <p className="text-gray-600 mt-1">{assignment.description}</p>
                                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Clock size={16} /> Due: {new Date(assignment.due_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {user.role === 'STUDENT' && (
                                        <button
                                            onClick={() => {
                                                setSelectedAssignment(assignment);
                                                setShowSubmitModal(true);
                                            }}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                                        >
                                            Submit Work
                                        </button>
                                    )}
                                    {user.role === 'TEACHER' && (
                                        <>
                                            <button
                                                onClick={() => loadSubmissions(assignment.id)}
                                                className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                                            >
                                                View Submissions
                                            </button>
                                            <button
                                                onClick={() => handleDelete(assignment.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Assignment"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Submissions List (Teacher Only) */}
                            {user.role === 'TEACHER' && selectedAssignment?.id === assignment.id && (
                                <div className="mt-6 border-t border-gray-100 pt-4">
                                    <h4 className="font-medium text-gray-900 mb-3">Submissions</h4>
                                    <div className="space-y-3">
                                        {submissions.length === 0 ? (
                                            <p className="text-sm text-gray-500">No submissions yet.</p>
                                        ) : (
                                            submissions.map(sub => (
                                                <div key={sub.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{sub.student_name}</p>
                                                        <p className="text-sm text-gray-500">{new Date(sub.submitted_at).toLocaleString()}</p>
                                                        <div className="mt-2 text-sm bg-white p-2 rounded border border-gray-200">
                                                            {sub.content}
                                                        </div>
                                                        {sub.grade && (
                                                            <div className="mt-2 text-sm text-green-600">
                                                                Grade: {sub.grade} | Feedback: {sub.feedback}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-2 items-end">
                                                        {grading.id === sub.id ? (
                                                            <div className="flex gap-2 items-center bg-white p-2 rounded shadow-sm">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Grade"
                                                                    className="w-20 px-2 py-1 border rounded"
                                                                    value={grading.grade}
                                                                    onChange={e => setGrading({ ...grading, grade: e.target.value })}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Feedback"
                                                                    className="w-32 px-2 py-1 border rounded"
                                                                    value={grading.feedback}
                                                                    onChange={e => setGrading({ ...grading, feedback: e.target.value })}
                                                                />
                                                                <button
                                                                    onClick={() => handleGrade(sub.id)}
                                                                    className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={() => setGrading({ id: null, grade: '', feedback: '' })}
                                                                    className="text-gray-400 hover:text-gray-600"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setGrading({ id: sub.id, grade: sub.grade || '', feedback: sub.feedback || '' })}
                                                                className="text-indigo-600 text-sm hover:underline"
                                                            >
                                                                {sub.grade ? 'Edit Grade' : 'Grade Submission'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-2xl font-bold mb-4">Create Assignment</h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={newAssignment.title}
                                        onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        rows="3"
                                        value={newAssignment.description}
                                        onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={newAssignment.dueDate}
                                        onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Submit Modal */}
            <AnimatePresence>
                {showSubmitModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Submit Assignment</h2>
                            <p className="text-gray-600 mb-4">{selectedAssignment?.title}</p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
                                    <textarea
                                        value={submissionContent}
                                        onChange={(e) => setSubmissionContent(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        rows="6"
                                        placeholder="Type your answer here..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Attach File (Optional)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 cursor-pointer transition-colors">
                                            <Upload size={20} className="text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                {submissionFile ? submissionFile.name : 'Choose file'}
                                            </span>
                                            <input
                                                type="file"
                                                onChange={(e) => setSubmissionFile(e.target.files[0])}
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip"
                                            />
                                        </label>
                                        {submissionFile && (
                                            <button
                                                type="button"
                                                onClick={() => setSubmissionFile(null)}
                                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Max file size: 10MB. Supported: PDF, DOC, TXT, Images, ZIP
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowSubmitModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        Submit
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

export default Assignments;

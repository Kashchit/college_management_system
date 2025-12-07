import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Camera, UserCheck, UserX, Mail, Hash, BookOpen, X, Check, Search, Trash2 } from 'lucide-react';
import api from '../utils/api';
import Toast from '../components/Toast';
import { loadModels, generateEmbedding } from '../utils/faceUtils';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Add student form
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    studentId: '',
    password: 'password123',
    captureFace: false
  });

  // Face capture
  const [cameraActive, setCameraActive] = useState(false);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [faceEmbedding, setFaceEmbedding] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Enroll in subject
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Bulk Enroll
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkResults, setBulkResults] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTeacher = user.role === 'TEACHER';

  useEffect(() => {
    loadData();
    initFaceModels();

    return () => {
      stopCamera();
    };
  }, []);

  const initFaceModels = async () => {
    try {
      await loadModels();
      setModelsLoaded(true);
    } catch (e) {
      console.error('Failed to load face models:', e);
    }
  };

  const loadData = async () => {
    try {
      const [usersRes, subjectsRes] = await Promise.all([
        api.get('/users'),
        api.get('/subjects')
      ]);

      const studentUsers = usersRes.data.filter(u => u.role === 'STUDENT');

      // Get face enrollment status for each student
      const studentsWithFaceStatus = await Promise.all(
        studentUsers.map(async (student) => {
          try {
            if (student.student_id) {
              const faceRes = await api.get(`/students/${student.student_id}`);
              return { ...student, hasFace: !!faceRes.data };
            }
            return { ...student, hasFace: false };
          } catch {
            return { ...student, hasFace: false };
          }
        })
      );

      setStudents(studentsWithFaceStatus);
      setSubjects(subjectsRes.data);
      if (subjectsRes.data[0]?.id) setSelectedSubjectId(subjectsRes.data[0].id);
    } catch (e) {
      setToast({ message: 'Failed to load data', type: 'error' });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (e) {
      setToast({ message: 'Failed to access camera', type: 'error' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureFace = async () => {
    if (!videoRef.current) return;

    setLoading(true);
    try {
      const embedding = await generateEmbedding(videoRef.current);
      setFaceEmbedding(embedding);
      setFaceCaptured(true);
      stopCamera();
      setToast({ message: 'Face captured successfully!', type: 'success' });
    } catch (e) {
      setToast({ message: 'No face detected. Try again with better lighting.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();

    if (newStudent.captureFace && !faceCaptured) {
      setToast({ message: 'Please capture face first', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Create user account
      const userRes = await api.post('/auth/signup', {
        name: newStudent.name,
        email: newStudent.email,
        password: newStudent.password,
        role: 'STUDENT',
        studentId: newStudent.studentId
      });

      // If face captured, save to students table
      if (newStudent.captureFace && faceEmbedding) {
        await api.post('/students/enroll', {
          studentId: newStudent.studentId,
          name: newStudent.name,
          embedding: faceEmbedding
        });
      }

      setToast({ message: 'Student added successfully!', type: 'success' });
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (e) {
      setToast({
        message: e.response?.data?.message || 'Failed to add student',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollInSubject = async () => {
    if (!selectedStudent || !selectedSubjectId) return;

    setLoading(true);
    try {
      await api.post(`/subjects/${selectedSubjectId}/enroll`, {
        email: selectedStudent.email,
        studentId: selectedStudent.student_id
      });

      setToast({ message: 'Student enrolled in subject!', type: 'success' });
      setShowEnrollModal(false);
      setSelectedStudent(null);
    } catch (e) {
      setToast({
        message: e.response?.data?.message || 'Failed to enroll',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      // Delete user account
      await api.delete(`/users/${student.id}`);

      // Delete face data if exists
      if (student.student_id) {
        try {
          await api.delete(`/students/${student.student_id}`);
        } catch (e) {
          // Face data might not exist, that's okay
        }
      }

      setToast({ message: 'Student deleted successfully!', type: 'success' });
      loadData();
    } catch (e) {
      setToast({
        message: e.response?.data?.message || 'Failed to delete student',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewStudent({
      name: '',
      email: '',
      studentId: '',
      password: 'password123',
      captureFace: false
    });
    setFaceCaptured(false);
    setFaceEmbedding(null);
    stopCamera();
  };

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-1">{students.length} students enrolled</p>
          </div>

          {isTeacher && (
            <div className="flex items-center">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all transform hover:scale-105"
              >
                <Plus size={20} />
                Add Student
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search students by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Students Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student, idx) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100"
          >
            {/* Avatar */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                  {student.name?.[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{student.name}</h3>
                  <p className="text-sm text-gray-500">{student.student_id || 'No ID'}</p>
                </div>
              </div>

              {/* Face Status Badge */}
              {student.hasFace ? (
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                  <UserCheck size={12} />
                  Face
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                  <UserX size={12} />
                  No Face
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={14} />
                <span className="truncate">{student.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Hash size={14} />
                <span>{student.student_id || 'Not assigned'}</span>
              </div>
            </div>

            {/* Actions */}
            {isTeacher && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedStudent(student);
                    setShowEnrollModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <BookOpen size={16} />
                  Enroll
                </button>
                <button
                  onClick={() => handleDeleteStudent(student)}
                  className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  title="Delete student"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-gray-500">No students found</p>
        </div>
      )}

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Student</h2>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="S12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Password</label>
                  <input
                    type="text"
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Student can change this after first login</p>
                </div>

                {/* Capture Face Option */}
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStudent.captureFace}
                      onChange={(e) => setNewStudent({ ...newStudent, captureFace: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Capture face for attendance</span>
                  </label>
                </div>

                {/* Face Capture */}
                {newStudent.captureFace && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-medium text-gray-900 mb-3">Face Capture</h3>

                    {!modelsLoaded ? (
                      <p className="text-sm text-gray-600">Loading face recognition models...</p>
                    ) : (
                      <>
                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-3">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                          {!cameraActive && !faceCaptured && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={startCamera}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                              >
                                <Camera size={20} />
                                Start Camera
                              </button>
                            </div>
                          )}
                          {faceCaptured && (
                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
                              <div className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                <Check size={20} />
                                Face Captured
                              </div>
                            </div>
                          )}
                        </div>

                        {cameraActive && !faceCaptured && (
                          <button
                            type="button"
                            onClick={captureFace}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                          >
                            {loading ? 'Processing...' : 'Capture Face'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (newStudent.captureFace && !faceCaptured)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enroll in Subject Modal */}
      <AnimatePresence>
        {showEnrollModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Enroll in Subject</h2>
                <button onClick={() => setShowEnrollModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">Student:</p>
                <p className="font-semibold text-gray-900">{selectedStudent.name}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnrollInSubject}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Enrolling...' : 'Enroll'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Enroll Modal */}
      <AnimatePresence>
        {showBulkEnrollModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Bulk Enroll Students</h2>
                <button onClick={() => { setShowBulkEnrollModal(false); setBulkResults(null); }} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              {!bulkResults ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Student Emails (comma or newline separated)</label>
                    <textarea
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 h-32"
                      placeholder="student1@example.com, student2@example.com..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowBulkEnrollModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkEnroll}
                      disabled={loading || !bulkEmails.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Enroll Students'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-bold text-green-800">Success: {bulkResults.success.length}</h3>
                    <ul className="list-disc pl-5 text-sm text-green-700 max-h-20 overflow-y-auto">
                      {bulkResults.success.map(e => <li key={e}>{e}</li>)}
                    </ul>
                  </div>
                  {bulkResults.failed.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-bold text-red-800">Failed: {bulkResults.failed.length}</h3>
                      <ul className="list-disc pl-5 text-sm text-red-700 max-h-20 overflow-y-auto">
                        {bulkResults.failed.map((e, i) => <li key={i}>{e.email}: {e.reason}</li>)}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={() => { setShowBulkEnrollModal(false); setBulkResults(null); setBulkEmails(''); }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Students;

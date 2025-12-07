import { useState, useRef, useEffect } from 'react';
import { loadModels, generateEmbedding, findBestMatch } from '../utils/faceUtils';
import api from '../utils/api';
import { Camera, StopCircle, CheckCircle, AlertCircle, Loader, UserPlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Scanner = () => {
  const [modelsLoading, setModelsLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [students, setStudents] = useState([]);
  const [lastMarked, setLastMarked] = useState({});
  const [currentMatch, setCurrentMatch] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Manual attendance state
  const [showManualModal, setShowManualModal] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        setModelsLoading(false);
        await loadSubjects();
      } catch (error) {
        setStatus({ type: 'error', message: 'Failed to load face recognition models' });
        setModelsLoading(false);
      }
    };
    init();

    return () => {
      stopScanner();
    };
  }, []);

  const loadSubjects = async () => {
    try {
      const { data } = await api.get('/subjects');
      setSubjects(data);
      if (data[0]?.id) setSubjectId(data[0].id);
    } catch (e) {
      setStatus({ type: 'error', message: 'Failed to load subjects' });
    }
  };

  const loadStudents = async (sid) => {
    try {
      const { data } = await api.get(`/subjects/${sid}/students-with-embeddings`);
      const normalized = (data || []).map(s => ({
        studentId: s.student_id ?? s.studentId ?? s.studentID,
        name: s.name,
        embedding: s.embedding,
        email: s.email,
        userId: s.user_id ?? s.userId
      })).filter(s => Array.isArray(s.embedding) && s.embedding.length > 0);
      setStudents(normalized);
      return normalized;
    } catch (e) {
      setStatus({ type: 'error', message: 'Failed to load enrolled students' });
      return [];
    }
  };

  const startScanner = async () => {
    if (!subjectId) {
      setStatus({ type: 'error', message: 'Select a subject first' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = stream;
        v.muted = true;
        v.playsInline = true;
        setScannerActive(true);
        try { await v.play(); } catch { }
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to access camera. Please allow permissions.' });
      return;
    }

    const list = await loadStudents(subjectId);
    if (!list || list.length === 0) {
      setStatus({ type: 'error', message: 'No enrolled students with face data for this subject' });
      return;
    }

    if (!scanIntervalRef.current) {
      scanIntervalRef.current = setInterval(scanFace, 2000);
    }
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScannerActive(false);
    setCurrentMatch(null);
  };

  const scanFace = async () => {
    if (!videoRef.current || !scannerActive) return;

    try {
      const embedding = await generateEmbedding(videoRef.current);
      if (!embedding) {
        setCurrentMatch(null);
        return;
      }

      const match = findBestMatch(embedding, students, 0.6);

      if (match) {
        setCurrentMatch(match);
        const now = Date.now();
        const lastMarkedTime = lastMarked[match.studentId] || 0;
        const timeDiff = now - lastMarkedTime;
        if (timeDiff > 5 * 60 * 1000) { // 5 minutes cooldown
          markAttendance(match);
        }
      } else {
        setCurrentMatch(null);
      }
    } catch (error) {
      setCurrentMatch(null);
    }
  };

  const markAttendance = async (match) => {
    try {
      await api.post('/attendance', {
        studentId: match.studentId,
        name: match.name,
        subject: subjects.find(s => s.id === subjectId)?.name || 'General',
        confidence: match.confidence
      });

      setLastMarked(prev => ({
        ...prev,
        [match.studentId]: Date.now()
      }));

      setStatus({ type: 'success', message: `Attendance marked for ${match.name}` });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      if (error.response?.status !== 400) {
        setStatus({ type: 'error', message: 'Failed to mark attendance' });
      }
    }
  };

  const openManualModal = async () => {
    if (!subjectId) {
      setStatus({ type: 'error', message: 'Please select a subject first' });
      return;
    }

    try {
      // Get all enrolled students for this subject
      const { data } = await api.get(`/subjects/${subjectId}/students`);
      setEnrolledStudents(data || []);
      setSelectedStudents([]);
      setShowManualModal(true);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to load students' });
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const submitManualAttendance = async () => {
    if (selectedStudents.length === 0) {
      setStatus({ type: 'error', message: 'Please select at least one student' });
      return;
    }

    setManualLoading(true);
    try {
      await api.post('/attendance/manual', {
        studentIds: selectedStudents,
        subjectId: subjectId,
        date: new Date().toISOString()
      });

      setStatus({
        type: 'success',
        message: `Attendance marked for ${selectedStudents.length} student(s)`
      });
      setShowManualModal(false);
      setSelectedStudents([]);
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to mark attendance'
      });
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Attendance Scanner</h1>
        {status.message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${status.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}
          >
            {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            {status.message}
          </motion.div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h2 className="text-xl font-semibold text-white">Configuration</h2>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Select Subject</label>
              <select
                className="w-full bg-background/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {!scannerActive ? (
                <>
                  <button
                    onClick={startScanner}
                    disabled={modelsLoading || !subjectId}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Camera size={20} />
                    Start Scanner
                  </button>
                  <button
                    onClick={openManualModal}
                    disabled={!subjectId}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <UserPlus size={20} />
                    Mark Manually
                  </button>
                </>
              ) : (
                <button
                  onClick={stopScanner}
                  className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-red-500/50"
                >
                  <StopCircle size={20} />
                  Stop Scanner
                </button>
              )}
            </div>
          </div>

          {/* Stats or Info */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-medium text-white mb-4">Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Models</span>
                <span className={modelsLoading ? 'text-yellow-400' : 'text-green-400'}>
                  {modelsLoading ? 'Loading...' : 'Ready'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Camera</span>
                <span className={scannerActive ? 'text-green-400' : 'text-gray-500'}>
                  {scannerActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Students Loaded</span>
                <span className="text-white">{students.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Feed */}
        <div className="lg:col-span-2">
          <div className="glass-card p-4 rounded-2xl overflow-hidden relative aspect-video bg-black/40 flex items-center justify-center">
            {modelsLoading ? (
              <div className="text-center space-y-4">
                <Loader className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                <p className="text-gray-400">Loading neural networks...</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover rounded-xl ${!scannerActive && 'hidden'}`}
                />
                {!scannerActive && (
                  <div className="text-center text-gray-500">
                    <Camera size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Camera is inactive</p>
                  </div>
                )}

                {/* Face Overlay */}
                <AnimatePresence>
                  {currentMatch && scannerActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute bottom-6 left-6 right-6 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-4"
                    >
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                        <CheckCircle className="text-green-400" size={24} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{currentMatch.name}</h3>
                        <p className="text-gray-300 text-sm">ID: {currentMatch.studentId}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-xs text-gray-400">Confidence</p>
                        <p className="text-green-400 font-mono">{(currentMatch.confidence * 100).toFixed(1)}%</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Manual Attendance Modal */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Mark Attendance Manually</h2>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Subject: <span className="font-semibold">{subjects.find(s => s.id === subjectId)?.name}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Selected: <span className="font-semibold">{selectedStudents.length} student(s)</span>
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {enrolledStudents.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No students enrolled in this subject</p>
                ) : (
                  enrolledStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedStudents.includes(student.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        {selectedStudents.includes(student.id) && (
                          <CheckCircle className="text-indigo-600" size={24} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitManualAttendance}
                  disabled={manualLoading || selectedStudents.length === 0}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {manualLoading ? 'Marking...' : `Mark ${selectedStudents.length} Student(s)`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Scanner;

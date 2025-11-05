import { useState, useRef, useEffect } from 'react';
import { loadModels, generateEmbedding, findBestMatch } from '../utils/faceUtils';
import api from '../utils/api';
import Toast from '../components/Toast';

const Scanner = () => {
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [students, setStudents] = useState([]);
  const [lastMarked, setLastMarked] = useState({});
  const [currentMatch, setCurrentMatch] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [toast, setToast] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        setModelsLoading(false);
        await loadSubjects();
      } catch (error) {
        setToast({ message: 'Failed to load face recognition models', type: 'error' });
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
      setToast({ message: 'Failed to load subjects', type: 'error' });
    }
  };

  const loadStudents = async (sid) => {
    try {
      const { data } = await api.get(`/subjects/${sid}/students-with-embeddings`);
      setStudents(data);
      return data; // return so callers don't rely on async state
    } catch (e) {
      setToast({ message: 'Failed to load enrolled students', type: 'error' });
      return [];
    }
  };

  const startScanner = async () => {
    if (!subjectId) {
      setToast({ message: 'Select a subject first', type: 'error' });
      return;
    }

    // Always start camera preview first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = stream;
        v.muted = true;
        v.playsInline = true;
        setScannerActive(true);
        try { await v.play(); } catch {}
      }
    } catch (error) {
      setToast({ message: 'Failed to access camera. Allow permissions.', type: 'error' });
      return;
    }

    // Load students and decide using the returned list (avoid stale state)
    const list = await loadStudents(subjectId);
    if (!list || list.length === 0) {
      setToast({ message: 'No enrolled students with face data for this subject', type: 'error' });
      return; // keep preview, skip scanning loop
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
        if (timeDiff > 5 * 60 * 1000) {
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

      setLastMarked({
        ...lastMarked,
        [match.studentId]: Date.now()
      });

      setToast({
        message: `Attendance marked for ${match.name} (${match.studentId})`,
        type: 'success'
      });
    } catch (error) {
      if (error.response?.status !== 400) {
        setToast({ message: error.response?.data?.message || 'Failed to mark attendance', type: 'error' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">Attendance Scanner</h1>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-sm text-gray-700 mb-1">Subject</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {modelsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading face recognition models...</p>
            </div>
          ) : (
            <>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[16/9] mb-4">
                <video id="scannerVideo" ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!scannerActive ? (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <button onClick={startScanner} className="bg-primary hover:bg-red-600 text-white px-8 py-4 rounded-lg transition text-lg">Start Scanner</button>
                  </div>
                ) : null}
              </div>

              {scannerActive && (
                <button onClick={stopScanner} className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition">Stop Scanner</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;


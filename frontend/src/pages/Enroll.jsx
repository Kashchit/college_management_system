import { useState, useRef, useEffect } from 'react';
import { loadModels, generateEmbedding } from '../utils/faceUtils';
import api from '../utils/api';
import Toast from '../components/Toast';

const Enroll = () => {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [capturedEmbedding, setCapturedEmbedding] = useState(null);
  const [toast, setToast] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [secureContext, setSecureContext] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        setSecureContext(window.isSecureContext || window.location.hostname === 'localhost');
        await loadModels();
        setModelsLoading(false);
        if (navigator.mediaDevices?.enumerateDevices) {
          const list = await navigator.mediaDevices.enumerateDevices();
          const cams = list.filter(d => d.kind === 'videoinput');
          setDevices(cams);
          if (cams[0]?.deviceId) setSelectedDeviceId(cams[0].deviceId);
        }
      } catch (error) {
        setToast({ message: 'Failed to load face recognition models', type: 'error' });
        setModelsLoading(false);
      }
    };
    init();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const stopCurrentStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast({ message: 'Camera API not available in this browser.', type: 'error' });
      return;
    }
    if (!secureContext) {
      setToast({ message: 'Camera requires HTTPS or localhost. Use http://localhost:5173', type: 'error' });
      return;
    }

    try {
      stopCurrentStream();

      // Try strict constraint first if a device is selected; otherwise fallback to generic
      const strictConstraints = selectedDeviceId
        ? { video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false }
        : { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(strictConstraints);
      } catch (strictErr) {
        // If strict device selection failed, retry with generic constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        // Show video UI immediately; some browsers need a second gesture to start playback
        setCameraActive(true);
        console.log('Stream tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}`));
        const onReady = async () => {
          try {
            await video.play();
            setToast({ message: 'Camera started', type: 'success' });
          } catch (playErr) {
            setToast({ message: 'Press Start Camera again to allow playback.', type: 'error' });
          }
        };
        if (video.readyState >= 2) {
          onReady();
        } else {
          video.onloadedmetadata = onReady;
        }
      }
    } catch (error) {
      let msg = 'Failed to access camera. Please allow camera permissions.';
      if (error.name === 'NotAllowedError') msg = 'Camera permission denied. Allow access in browser settings.';
      if (error.name === 'NotFoundError' || error.message?.includes('Requested device not found')) msg = 'No camera found or selected device unavailable.';
      if (error.name === 'OverconstrainedError') msg = 'Camera constraints not supported. Try default camera.';
      setToast({ message: msg, type: 'error' });
      console.error('getUserMedia error:', error);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;

    setLoading(true);
    try {
      const embedding = await generateEmbedding(videoRef.current);
      setCapturedEmbedding(embedding);
      setCaptured(true);
      setToast({ message: 'Face captured successfully!', type: 'success' });
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        setCameraActive(false);
      }
    } catch (error) {
      setToast({ message: error.message || 'Failed to detect face. Ensure good lighting and face visible.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!captured || !capturedEmbedding) {
      setToast({ message: 'Please capture your face first', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/students/enroll', {
        studentId: studentId.trim(),
        name: name.trim(),
        embedding: capturedEmbedding
      });

      setToast({ message: 'Student enrolled successfully!', type: 'success' });
      setStudentId('');
      setName('');
      setCaptured(false);
      setCapturedEmbedding(null);
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Failed to enroll student',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Student Enrollment</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          {modelsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading face recognition models...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Camera</h2>

                {!secureContext && (
                  <div className="mb-3 p-3 bg-yellow-100 text-yellow-800 rounded">Camera requires HTTPS or localhost origin.</div>
                )}

                {devices.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-sm text-gray-700 mb-1">Select camera</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                    >
                      {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[16/9]">
                  <video
                    id="enrollVideo"
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {(!cameraActive && !captured) && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <button
                        onClick={startCamera}
                        className="bg-primary hover:bg-red-600 text-white px-6 py-3 rounded-lg transition"
                      >
                        Start Camera
                      </button>
                    </div>
                  )}
                </div>
                
                {cameraActive && !captured && (
                  <button
                    onClick={captureFace}
                    disabled={loading}
                    className="mt-4 w-full bg-primary hover:bg-red-600 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Capture Face'}
                  </button>
                )}
                
                {captured && (
                  <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg text-center">
                    ✓ Face captured successfully
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Student Information</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                      Student ID *
                    </label>
                    <input
                      id="studentId"
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter student ID"
                    />
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !captured}
                    className="w-full bg-primary hover:bg-red-600 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enrolling...' : 'Enroll Student'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Enroll;


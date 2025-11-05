import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  
  try {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face-api.js models loaded');
  } catch (error) {
    console.error('Error loading face-api.js models:', error);
    throw error;
  }
};

export const generateEmbedding = async (videoElement) => {
  try {
    const detection = await faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error('No face detected');
    }

    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

export const calculateDistance = (embedding1, embedding2) => {
  if (embedding1.length !== embedding2.length) {
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    sum += Math.pow(embedding1[i] - embedding2[i], 2);
  }
  return Math.sqrt(sum);
};

export const findBestMatch = (liveEmbedding, storedStudents, threshold = 0.6) => {
  let bestMatch = null;
  let minDistance = Infinity;

  storedStudents.forEach((student) => {
    const distance = calculateDistance(liveEmbedding, student.embedding);
    if (distance < minDistance && distance < threshold) {
      minDistance = distance;
      bestMatch = {
        ...student,
        confidence: 1 - distance / threshold, // Normalize to 0-1
        distance
      };
    }
  });

  return bestMatch;
};


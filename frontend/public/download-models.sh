#!/bin/bash

# Script to download face-api.js models
# Place this in frontend/public/models/ directory

MODELS_DIR="$(pwd)"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

echo "Downloading face-api.js models..."

# Download Tiny Face Detector models
curl -L "${BASE_URL}/tiny_face_detector_model-weights_manifest.json" -o "${MODELS_DIR}/tiny_face_detector_model-weights_manifest.json"
curl -L "${BASE_URL}/tiny_face_detector_model-shard1" -o "${MODELS_DIR}/tiny_face_detector_model-shard1"

# Download Face Landmark models
curl -L "${BASE_URL}/face_landmark_68_model-weights_manifest.json" -o "${MODELS_DIR}/face_landmark_68_model-weights_manifest.json"
curl -L "${BASE_URL}/face_landmark_68_model-shard1" -o "${MODELS_DIR}/face_landmark_68_model-shard1"

# Download Face Recognition models
curl -L "${BASE_URL}/face_recognition_model-weights_manifest.json" -o "${MODELS_DIR}/face_recognition_model-weights_manifest.json"
curl -L "${BASE_URL}/face_recognition_model-shard1" -o "${MODELS_DIR}/face_recognition_model-shard1"
curl -L "${BASE_URL}/face_recognition_model-shard2" -o "${MODELS_DIR}/face_recognition_model-shard2"

echo "✅ Models downloaded successfully!"


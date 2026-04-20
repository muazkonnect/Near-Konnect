// face-api.js client helper
// Loads models from a public CDN and computes a 128-d descriptor for a face image.
// We avoid bundling the model weights — they're fetched once and cached by the browser.
import * as faceapi from "face-api.js";

const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

let loadPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })().catch((e) => {
      loadPromise = null;
      throw e;
    });
  }
  return loadPromise;
}

export interface FaceDetectionResult {
  descriptor: number[]; // 128 floats
  count: number; // total faces detected
}

async function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = dataUrl;
  });
}

export async function detectFaceDescriptor(dataUrl: string): Promise<FaceDetectionResult> {
  await loadFaceModels();
  const img = await imageFromDataUrl(dataUrl);
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  const detections = await faceapi
    .detectAllFaces(img, options)
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (!detections || detections.length === 0) {
    return { descriptor: [], count: 0 };
  }
  // Pick the largest face if multiple
  const best = [...detections].sort(
    (a, b) => b.detection.box.area - a.detection.box.area,
  )[0];
  return {
    descriptor: Array.from(best.descriptor),
    count: detections.length,
  };
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// face-api.js recommended threshold for "same person" is 0.6.
// We use a slightly stricter value to reduce false positives.
export const FACE_MATCH_THRESHOLD = 0.55;

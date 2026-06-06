import { toPng } from 'html-to-image';
import pixelmatch from 'pixelmatch';

export interface ParityResult {
  matchPercentage: number;
  deltaPixels: number;
  passed: boolean;
}

/**
 * Ensures all assets in the document are fully loaded before capture.
 * - Waits for document.fonts.ready
 * - Waits for all <img> tags to complete loading and decoding
 * - Waits for browser animation frames
 */
export async function awaitDocumentReady(doc: Document): Promise<void> {
  // 1. Wait for fonts
  if (doc.fonts && doc.fonts.ready) {
    await doc.fonts.ready;
  }

  // 2. Wait for all images to load and decode
  const images = Array.from(doc.querySelectorAll('img'));
  const imagePromises = images.map(img => {
    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      const handleLoad = () => resolve();
      const handleError = () => resolve(); // Don't block indefinitely on broken images
      
      img.addEventListener('load', handleLoad, { once: true });
      img.addEventListener('error', handleError, { once: true });
      
      // Attempt decode() for faster readiness if supported
      if (typeof img.decode === 'function') {
        img.decode()
          .then(() => resolve())
          .catch(() => { /* Fallback to load event */ });
      }
    });
  });
  
  await Promise.all(imagePromises);

  // 3. Wait for browser render cycle
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * The single source of truth for capturing the HTML composer output into a PNG.
 * Incorporates all asset readiness checks.
 */
export async function captureSafePng(iframe: HTMLIFrameElement, width: number = 1080, height: number = 1080): Promise<string> {
  const doc = iframe.contentDocument;
  if (!doc?.body) throw new Error('Iframe has no document body');

  const start = performance.now();
  await awaitDocumentReady(doc);
  const readyTime = performance.now();

  const dataUrl = await toPng(doc.body, { 
    cacheBust: true, 
    quality: 1.0, 
    width, 
    height,
    pixelRatio: 1 // Standardize pixel ratio for reliable captures
  });

  const captureTime = performance.now();
  
  // Optional telemetry hook
  console.log(`[ExportEngine] Assets ready in ${Math.round(readyTime - start)}ms, PNG captured in ${Math.round(captureTime - readyTime)}ms`);

  return dataUrl;
}

/**
 * Helper to convert a dataURL to ImageData via an offscreen canvas
 */
async function dataUrlToImageData(dataUrl: string, width: number, height: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get 2d context'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Visual Parity Validator
 * Compares two Data URLs to ensure they visually match within a threshold.
 */
export async function validateParity(dataUrlA: string, dataUrlB: string, width: number = 1080, height: number = 1080, thresholdPercent: number = 5): Promise<ParityResult> {
  const [imgDataA, imgDataB] = await Promise.all([
    dataUrlToImageData(dataUrlA, width, height),
    dataUrlToImageData(dataUrlB, width, height)
  ]);

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d');
  if (!diffCtx) throw new Error('Failed to create diff context');
  const diffImageData = diffCtx.createImageData(width, height);

  const numDiffPixels = pixelmatch(
    imgDataA.data, 
    imgDataB.data, 
    diffImageData.data, 
    width, 
    height, 
    { threshold: 0.1 }
  );

  const totalPixels = width * height;
  const diffPercent = (numDiffPixels / totalPixels) * 100;
  
  const passed = diffPercent <= thresholdPercent;
  
  return {
    matchPercentage: 100 - diffPercent,
    deltaPixels: numDiffPixels,
    passed
  };
}

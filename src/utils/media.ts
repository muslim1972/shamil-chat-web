export async function compressImage(file: File, opts?: { maxDim?: number; quality?: number; mimeType?: string }) {
  const maxDim = opts?.maxDim ?? 1080;
  const quality = opts?.quality ?? 0.7;
  const mimeType = opts?.mimeType ?? 'image/webp';

  const img = document.createElement('img');
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = objectUrl;
    });

    const { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b!), mimeType, quality));
    const ext = mimeType.split('/')[1] || 'webp';
    const newName = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
    return new File([blob], newName, { type: mimeType });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = document.createElement('img');
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for dimensions'));
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function generateVideoThumbnail(file: File, atSeconds: number = 0.1): Promise<{ blob: Blob; width: number; height: number; dataUrl: string }>{
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.src = url;
  video.crossOrigin = 'anonymous';
  video.muted = true;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
    });
    if (!isNaN(atSeconds) && atSeconds >= 0 && atSeconds <= (video.duration || atSeconds)) {
      await new Promise<void>((resolve) => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
        video.addEventListener('seeked', onSeeked);
        try { video.currentTime = Math.min(atSeconds, Math.max(0, video.duration - 0.05)); } catch { resolve(); }
      });
    }
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, width, height);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b!), 'image/webp', 0.8));
    const dataUrl = canvas.toDataURL('image/webp', 0.8);
    return { blob, width, height, dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Lightweight client-side downscale/transcode using Canvas + MediaRecorder.
// Suitable for short clips during development; produces WebM (VP9/Opus) around ~0.9-1.2 Mbps total.
export async function transcodeVideo(
  inputFile: File,
  opts?: { targetWidth?: number; fps?: number; videoKbps?: number; audioKbps?: number }
) {
  const targetWidth = opts?.targetWidth ?? 640; // ~360p-480p depending on aspect
  const fps = opts?.fps ?? 30;
  const videoBitsPerSecond = Math.round((opts?.videoKbps ?? 900) * 1000); // ~0.9 Mbps
  const audioBitsPerSecond = Math.round((opts?.audioKbps ?? 96) * 1000);

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  const objectUrl = URL.createObjectURL(inputFile);

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = objectUrl;
    });

    const aspect = video.videoWidth / video.videoHeight;
    const width = Math.min(targetWidth, video.videoWidth);
    const height = Math.round(width / aspect);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Draw frames loop
    let rafId = 0;
    const draw = () => {
      ctx.drawImage(video, 0, 0, width, height);
      rafId = requestAnimationFrame(draw);
    };

    // Capture canvas stream and add audio track from original if possible
    const stream = (canvas as HTMLCanvasElement).captureStream(fps);
    // Merge original video's audio track if available
    const vStream = (video as any).captureStream ? (video as any).captureStream() as MediaStream : null;
    if (vStream) {
      const audioTracks = vStream.getAudioTracks();
      audioTracks.forEach((t: MediaStreamTrack) => stream.addTrack(t));
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond,
      audioBitsPerSecond,
    } as MediaRecorderOptions);

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    await video.play();
    draw();
    recorder.start(100);

    await new Promise<void>((resolve) => { video.onended = () => resolve(); });

    recorder.stop();
    cancelAnimationFrame(rafId);

    await new Promise(r => setTimeout(r, 100));
    const out = new Blob(chunks, { type: 'video/webm' });
    const newName = inputFile.name.replace(/\.[^.]+$/, '') + '.webm';
    return new File([out], newName, { type: 'video/webm' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

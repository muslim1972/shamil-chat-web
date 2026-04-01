import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;

/**
 * الحصول على instance من FFmpeg (singleton)
 */
async function getFFmpeg(): Promise<FFmpeg> {
  console.log('🔧 getFFmpeg: بدء...');

  if (ffmpegInstance) {
    console.log('🔧 getFFmpeg: موجود مسبقاً');
    return ffmpegInstance;
  }

  if (isLoading) {
    console.log('🔧 getFFmpeg: انتظار التحميل...');
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return ffmpegInstance!;
  }

  isLoading = true;
  console.log('🔧 getFFmpeg: إنشاء FFmpeg جديد...');
  ffmpegInstance = new FFmpeg();

  // تحميل من CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

  try {
    console.log('🔧 getFFmpeg: تحميل core من CDN...');
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    console.log('🔧 getFFmpeg: تم تحميل core.js');

    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    console.log('🔧 getFFmpeg: تم تحميل core.wasm');

    console.log('🔧 getFFmpeg: تحميل FFmpeg...');
    await ffmpegInstance.load({
      coreURL,
      wasmURL,
    });
    console.log('🔧 getFFmpeg: ✅ تم التحميل بنجاح!');
  } catch (error) {
    console.error('🔧 getFFmpeg: ❌ فشل التحميل:', error);
    isLoading = false;
    throw error;
  }

  isLoading = false;
  return ffmpegInstance;
}

/**
 * ضغط فيديو باستخدام FFmpeg.wasm
 * 
 * @param file - ملف الفيديو الأصلي
 * @param onProgress - callback للـ progress (0-100)
 * @returns الملف المضغوط
 */
export async function compressVideoFFmpeg(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  console.log('🔧 [1/6] بدء compressVideoFFmpeg...');

  const ffmpeg = await getFFmpeg();
  console.log('🔧 [2/6] تم تحميل FFmpeg');

  // تسجيل progress
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      console.log(`🔧 [3/6] Progress: ${Math.round(progress * 100)}%`);
      onProgress(Math.round(progress * 100));
    });
  }

  console.log('🔧 [3/6] كتابة الملف المدخل...');
  await ffmpeg.writeFile('input.mp4', await fetchFile(file));
  console.log('🔧 [3/6] تم كتابة الملف');

  console.log('🔧 [4/6] بدء الضغط...');
  // ✅ H.264 encoding - أسرع 5-10x من VP9
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', 'scale=640:-2',        // 640p width
    '-c:v', 'libx264',            // H.264 codec (سريع!)
    '-preset', 'ultrafast',       // أسرع preset
    '-crf', '28',                 // جودة مقبولة (18-28)
    '-c:a', 'aac',                // AAC audio
    '-b:a', '96k',                // 96 kbps audio
    '-movflags', '+faststart',    // للـ streaming
    '-y',                         // overwrite
    'output.mp4'
  ]);
  console.log('🔧 [4/6] انتهى الضغط!');

  console.log('🔧 [5/6] قراءة الملف المخرج...');
  const data = await ffmpeg.readFile('output.mp4');
  console.log('🔧 [5/6] تم قراءة الملف');

  // تنظيف
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('output.mp4');

  console.log('🔧 [6/6] إنشاء File object...');
  // إنشاء File object
  // تحويل النتيجة إلى Blob (نمرر uint8Array مباشرة بدلاً من uint8Array.buffer لتجنب مشاكل SharedArrayBuffer)
  const uint8Array = data as Uint8Array;
  const compressedBlob = new Blob([uint8Array as any], { type: 'video/mp4' });
  const result = new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.mp4'), {
    type: 'video/mp4'
  });
  console.log('🔧 ✅ انتهى compressVideoFFmpeg!');
  return result;
}

/**
 * فحص دعم FFmpeg في المتصفح
 */
export function isFFmpegSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

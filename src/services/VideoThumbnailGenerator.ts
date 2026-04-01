import { cacheManager } from './CacheManager';

class VideoThumbnailGenerator {
  async generateThumbnail(videoBlob: Blob, seekTime: number = 1): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.src = URL.createObjectURL(videoBlob);
      video.currentTime = seekTime;
      video.muted = true;
      
      video.onloadeddata = () => {
        canvas.width = 320;
        canvas.height = (video.videoHeight / video.videoWidth) * 320;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.7);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };
    });
  }

  async saveThumbnail(videoId: string, thumbnail: Blob): Promise<void> {
    await cacheManager.set('metadata', `thumb_${videoId}`, thumbnail);
  }

  async getThumbnail(videoId: string): Promise<Blob | null> {
    return await cacheManager.get('metadata', `thumb_${videoId}`);
  }
}

export const thumbnailGenerator = new VideoThumbnailGenerator();
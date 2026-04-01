// File Helper Functions
// These functions handle various file-related operations

// Helper to extract filename from path
export const getFilenameFromPath = (path: string) => {
  try {
    if (!path) return 'file';
    return path.split('/').pop()?.split('_').slice(1).join('_') || 'file';
  } catch (error) {
    console.error('Error extracting filename from path:', error);
    return 'file';
  }
};

// Helper to get file extension from filename
export const getFileExtension = (filename: string) => {
  try {
    if (!filename) return '';
    return filename.split('.').pop()?.toLowerCase() || '';
  } catch (error) {
    console.error('Error getting file extension:', error);
    return '';
  }
};

// Helper to check if file is an image
export const isImageFile = (filename: string) => {
  try {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'heic', 'heif'];
    return imageExtensions.includes(getFileExtension(filename));
  } catch (error) {
    console.error('Error checking if file is image:', error);
    return false;
  }
};

// Helper to check if file is a video
export const isVideoFile = (filename: string) => {
  try {
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp'];
    return videoExtensions.includes(getFileExtension(filename));
  } catch (error) {
    console.error('Error checking if file is video:', error);
    return false;
  }
};

// Helper to check if file is an audio
export const isAudioFile = (filename: string) => {
  try {
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'dat', 'wma', 'opus'];
    return audioExtensions.includes(getFileExtension(filename));
  } catch (error) {
    console.error('Error checking if file is audio:', error);
    return false;
  }
};

// Helper to check if file is a document
export const isDocumentFile = (filename: string) => {
  try {
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp'];
    return documentExtensions.includes(getFileExtension(filename));
  } catch (error) {
    console.error('Error checking if file is document:', error);
    return false;
  }
};

// Helper to get file type category
export const getFileTypeCategory = (filename: string) => {
  if (isImageFile(filename)) return 'image';
  if (isVideoFile(filename)) return 'video';
  if (isAudioFile(filename)) return 'audio';
  if (isDocumentFile(filename)) return 'document';
  return 'other';
};

// Helper to format file size
export const formatFileSize = (bytes: number) => {
  try {
    if (bytes === 0) return '0 Bytes';
    if (isNaN(bytes)) return 'Invalid size';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  } catch (error) {
    console.error('Error formatting file size:', error);
    return 'Unknown size';
  }
};

// Helper to get file icon based on extension
export const getFileIcon = (filename: string) => {
  const extension = getFileExtension(filename);
  
  if (isImageFile(filename)) return '🖼️';
  if (isVideoFile(filename)) return '🎬';
  if (isAudioFile(filename)) return '🎵';
  if (isDocumentFile(filename)) {
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📑';
      default: return '📄';
    }
  }
  
  return '📎';
};
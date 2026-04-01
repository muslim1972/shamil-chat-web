export function summarizeMessage(payload: any, isFromMe: boolean = false): string {
  // payload may be a string, or an object { message_type, content, caption, media_metadata }
  try {
    if (!payload) return '';

    let msgType: string | undefined;
    let content: string | undefined;
    let caption: string | undefined;
    let meta: any = null;

    if (typeof payload === 'string') {
      // try to detect URLs or file extensions
      content = payload;
    } else if (typeof payload === 'object') {
      msgType = payload.message_type || payload.type || undefined;
      content = payload.content || payload.text || payload.body || undefined;
      caption = payload.caption || undefined;
      meta = payload.media_metadata || payload.meta || null;
    }

    // Helper function to return appropriate text based on sender
    const getMediaText = (receivedText: string, sentText: string) => {
      return isFromMe ? sentText : receivedText;
    };

    // If message_type explicitly provided, use it
    if (msgType) {
      msgType = msgType.toLowerCase();
      if (msgType === 'image' || msgType === 'photo' || msgType === 'picture')
        return getMediaText('أرسل إليك صورة', 'أنت: صورة');
      if (msgType === 'video')
        return getMediaText('أرسل إليك فيديو', 'أنت: فيديو');
      if (msgType === 'location' || msgType === 'geo')
        return getMediaText('أرسل إليك موقع', 'أنت: موقع');
      if (msgType === 'file')
        return getMediaText('أرسل إليك ملف', 'أنت: ملف');
      if (msgType === 'audio') {
        // if media metadata marks it as recorded inside the app, prefer "تسجيل صوتي"
        if (meta && (meta.is_recording || meta.recorder || meta.source === 'recorder'))
          return getMediaText('أرسل إليك تسجيل صوتي', 'أنت: تسجيل صوتي');
        // otherwise treat as a regular audio file
        return getMediaText('أرسل إليك ملفًا صوتيًا', 'أنت: ملف صوتي');
      }
    }

    // Heuristic: check content for URLs or file extensions
    const text = (caption || content || '').toString();
    const lower = text.toLowerCase();

    // Detect coordinate patterns like "24.7136,46.6753" (lat,lon)
    if (/[-+]?\d{1,3}\.\d+\s*,\s*[-+]?\d{1,3}\.\d+/.test(lower))
      return getMediaText('أرسل إليك موقع', 'أنت: موقع');

    // Detect common map URLs (Google Maps, OSM, Bing, short maps links)
    if (/\b(?:google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|openstreetmap\.org|bing\.com\/maps|mapbox\.com|here\.com)\b/i.test(lower))
      return getMediaText('أرسل إليك موقع', 'أنت: موقع');

    // location indicators
    if (/\b(lat|long|latitude|longitude|geo|location)\b/i.test(lower))
      return getMediaText('أرسل لك موقع', 'أنت: موقع');

    // image extensions
    if (/\.(jpg|jpeg|png|gif|webp|bmp|heic)(\?|$)/i.test(lower) || /https?:\/\/.*\.(jpg|jpeg|png|gif|webp|bmp|heic)/i.test(lower))
      return getMediaText('أرسل لك صورة', 'أنت: صورة');

    // video extensions
    if (/\.(mp4|mov|webm|mkv|avi)(\?|$)/i.test(lower) || /https?:\/\/.*\.(mp4|mov|webm|mkv|avi)/i.test(lower))
      return getMediaText('أرسل لك فيديو', 'أنت: فيديو');

    // audio extensions
    if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(lower) || /https?:\/\/.*\.(mp3|wav|ogg|m4a|aac)/i.test(lower)) {
      // If caption or metadata hints it's a recording, show recording text
      if (/تسجيل|record(ed)?|rec/i.test(lower) || (meta && (meta.is_recording || meta.recorder || meta.source === 'recorder')))
        return getMediaText('أرسل إليك تسجيل صوتي', 'أنت: تسجيل صوتي');
      return getMediaText('أرسل إليك ملفًا صوتيًا', 'أنت: ملف صوتي');
    }

    // generic file pattern
    if (/\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt)(\?|$)/i.test(lower))
      return getMediaText('أرسل لك ملف', 'أنت: ملف');

    // fallback: if payload was object without known type but has non-empty text, return truncated text
    if (text && text.trim().length > 0) {
      const t = text.trim();
      const prefix = isFromMe ? 'أنت: ' : '';
      const maxLen = isFromMe ? 70 : 80;
      return t.length > maxLen ? prefix + t.slice(0, maxLen - 3) + '...' : prefix + t;
    }

    return '';
  } catch (err) {
    return '';
  }
}

export function summarizeForNotification(data: any): string {
  // If server already sent a body, prefer it, but summarize if needed
  if (!data) return '';
  if (data.body && typeof data.body === 'string') {
    // if body is a URL or obviously a media link, summarize
    const s = summarizeMessage(data);
    return s || data.body;
  }
  return summarizeMessage(data) || '';
}

// useRecording Hook
// This hook handles audio recording functionality

import { useState, useRef, useCallback } from 'react';

interface UseRecordingProps {
  sendAudioMessage: (audioBlob: Blob, duration: number, caption?: string) => Promise<void>;
}

export const useRecording = ({ sendAudioMessage }: UseRecordingProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const handleStartRecording = useCallback(async () => {
    if (isRecording) return;

    audioChunksRef.current = [];
    audioBlobRef.current = null;

    try {
      // Simple, direct approach: Let getUserMedia handle the permission prompt.
      // The AndroidManifest.xml now has the required permissions, so this should work.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/ogg';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          mediaRecorderRef.current = new MediaRecorder(stream);
        } else {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
        }
      } else {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      }

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioBlobRef.current = audioBlob;
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;
        streamRef.current?.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();

      const timer = setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartTimeRef.current);
      }, 100);
      setRecordingTimer(timer);

    } catch (err: any) {
      console.error("Failed to start recording:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('عذراً، نحتاج إلى إذن الوصول إلى الميكروفون لتسجيل الصوت.');
      } else {
        alert('فشل بدء التسجيل. يرجى التحقق من توصيل الميكروفون أو أذونات المتصفح.');
      }
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleCancelRecording = useCallback(() => {
    if (!isRecording) return;

    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach(track => track.stop());

    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
    audioBlobRef.current = null;

  }, [isRecording, recordingTimer]);

  const sendAudioRecording = useCallback(async (caption?: string): Promise<boolean> => {
    try {
      if (!audioBlobRef.current) {
        console.error('No audio recording to send');
        return false;
      }

      let durationToSend = recordingDuration;
      if (isNaN(durationToSend) || durationToSend <= 0) {
        durationToSend = 1000;
        console.warn('Invalid recording duration, using default value:', durationToSend);
      }

      await sendAudioMessage(audioBlobRef.current, durationToSend, caption);

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      audioBlobRef.current = null;
      setRecordingDuration(0);

      return true;
    } catch (error) {
      console.error('Failed to send audio message:', error);
      return false;
    }
  }, [sendAudioMessage, recordingDuration]);

  const handleSendRecording = useCallback(async (caption?: string) => {
    if (!audioBlobRef.current && !isRecording) {
      console.error('No audio recording to send');
      return false;
    }

    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }

    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      return new Promise<boolean>((resolve) => {
        const originalOnStop = mediaRecorderRef.current?.onstop;
        mediaRecorderRef.current!.onstop = async () => {
          if (originalOnStop) {
            const event = new Event('stop');
            originalOnStop.call(mediaRecorderRef.current!, event);
          }

          if (audioChunksRef.current.length === 0) {
            console.error('No audio data recorded');
            setIsRecording(false);
            resolve(false);
            return;
          }

          const actualDuration = Date.now() - recordingStartTimeRef.current;
          setRecordingDuration(actualDuration);

          const result = await sendAudioRecording(caption);
          resolve(result);
        };

        mediaRecorderRef.current!.stop();
        setIsRecording(false);
      });
    } else {
      return sendAudioRecording(caption);
    }
  }, [isRecording, recordingTimer, sendAudioMessage, sendAudioRecording]);

  return {
    isRecording,
    recordingDuration,
    handleStartRecording,
    handleCancelRecording,
    handleSendRecording,
  };
};
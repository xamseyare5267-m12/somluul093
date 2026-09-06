import { useState, useRef, useCallback } from 'react';
import { playVoiceBeep } from './soundUtils';

export interface RecordedAudioResult {
  audioUrl: string;
  durationSeconds: number;
  blob: Blob;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg'
      ];
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        mimeType = supportedTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100); // collect 100ms slices
      playVoiceBeep('start');
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err: any) {
      console.warn('Microphone permission or recording error:', err);
      setError('Microphone access denied or unavailable.');
      return false;
    }
  }, []);

  const stopRecording = useCallback((): Promise<RecordedAudioResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      playVoiceBeep('stop');

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const recorder = mediaRecorderRef.current;

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64Url = reader.result as string;
          resolve({
            audioUrl: base64Url,
            durationSeconds: recordingSeconds || 1,
            blob: audioBlob
          });
        };

        reader.readAsDataURL(audioBlob);

        // Stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        setRecordingSeconds(0);
      };

      try {
        recorder.stop();
      } catch (e) {
        console.warn('Error stopping recorder:', e);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        setIsRecording(false);
        setRecordingSeconds(0);
        resolve(null);
      }
    });
  }, [isRecording, recordingSeconds]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  return {
    isRecording,
    recordingSeconds,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  };
}

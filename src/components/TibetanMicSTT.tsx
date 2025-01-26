'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle, Play, Send, Trash2 } from 'lucide-react';

// Maximum recording time in seconds (2 minutes)
const MAX_RECORDING_TIME = 120;

interface MonlamAPIResponse {
  success: boolean;
  id: string;
  file: string;
  output: string;
  responseTime: number;
  error?: string;  // Add this line to include the error property
}

const TibetanMicSTT = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<number>(MAX_RECORDING_TIME);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError('');
      setAudioUrl(null);
      setTranscription('');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRemainingTime(MAX_RECORDING_TIME);

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            stopRecording();
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      setError(`Error accessing microphone: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setTranscription('');
    setError('');
  };

  const sendAudioToAPI = async () => {
    if (!audioUrl) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();
      console.log('Audio blob size:', audioBlob.size);

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      formData.append('lang', 'bo');

      console.log('Sending to API...');
      const apiResponse = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      console.log('API Response status:', apiResponse.status);
      const data: MonlamAPIResponse = await apiResponse.json();
      console.log('API Response data:', data);

      if (!apiResponse.ok) {
        throw new Error(`HTTP error! status: ${apiResponse.status}`);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.output) {
        setTranscription(data.output);
      } else {
        console.log('Unexpected response structure:', data);
        setError('Unexpected response format from API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error details:', err);
      setError(`Failed to convert speech to text: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-3xl font-bold mb-8 text-gray-900 text-center">Tibetan Speech to Text</h2>

      <div className="flex flex-col items-center space-y-4">
        {/* Timer */}
        <div className="text-xl font-mono text-gray-900">
          {isRecording ? formatTime(remainingTime) : "2:00"}
        </div>

        {/* Record button */}
        {!audioUrl && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`p-4 rounded-full ${isRecording
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
              } text-white transition-colors disabled:bg-gray-300`}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            {isRecording ? (
              <Square className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
        )}

        {/* Audio preview */}
        {audioUrl && (
          <div className="w-full space-y-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={handleAudioEnded}
              className="hidden"
            />

            <div className="flex justify-center space-x-4">
              <button
                onClick={handlePlayPause}
                className="p-4 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                <Play className="w-6 h-6" />
              </button>

              <button
                onClick={sendAudioToAPI}
                disabled={isLoading}
                className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:bg-gray-300"
                title="Send to API"
              >
                <Send className="w-6 h-6" />
              </button>

              <button
                onClick={discardRecording}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                title="Discard Recording"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Status text */}
        <div className="text-sm text-gray-600">
          {isRecording
            ? 'Recording... Click to stop'
            : audioUrl
              ? 'Preview your recording before sending'
              : 'Click to start recording'}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="text-blue-500 animate-pulse">Converting speech to text...</div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Transcription result */}
        {transcription && (
          <div className="w-full mt-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Transcription:</h3>
            <div className="p-4 bg-gray-100 rounded whitespace-pre-wrap">
              <div className="font-tibetan text-2xl leading-relaxed text-gray-900">
                {transcription}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TibetanMicSTT;
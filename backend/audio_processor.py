import numpy as np
import librosa
import soundfile as sf
from scipy import signal
import json
import base64
import io

class AudioProcessor:
    def __init__(self, sr=44100):
        self.sr = sr
    
    def process_uploaded_audio(self, file_data, file_type):
        """
        Process uploaded audio file and extract frequency/note information
        """
        try:
            # Decode base64 file data
            audio_bytes = base64.b64decode(file_data)
            audio_file = io.BytesIO(audio_bytes)
            
            # Load audio file
            y, sr = librosa.load(audio_file, sr=self.sr)
            
            # Extract frequency information using STFT
            D = librosa.stft(y)
            S = np.abs(D)
            
            # Get dominant frequencies over time
            frequencies = librosa.fft_frequencies(sr=sr)
            
            # Extract tracks/notes from the audio
            tracks = self._extract_tracks(y, sr, frequencies, S)
            
            return {
                "tracks": tracks,
                "duration": len(y) / sr,
                "sample_rate": sr,
                "total_samples": len(y)
            }
        except Exception as e:
            raise Exception(f"Audio processing failed: {str(e)}")
    
    def _extract_tracks(self, y, sr, frequencies, S):
        """
        Extract individual tracks/notes from audio
        """
        tracks = []
        
        # Use onset detection to find note boundaries
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr)
        
        # For each onset, extract the dominant frequency
        for i, onset_time in enumerate(onset_times):
            # Get the next onset time or end of audio
            if i < len(onset_times) - 1:
                end_time = onset_times[i + 1]
            else:
                end_time = len(y) / sr
            
            duration = end_time - onset_time
            
            # Extract audio segment
            start_sample = int(onset_time * sr)
            end_sample = int(end_time * sr)
            segment = y[start_sample:end_sample]
            
            # Get dominant frequency using autocorrelation
            frequency = self._get_dominant_frequency(segment, sr)
            
            if frequency > 0:  # Only add if valid frequency detected
                tracks.append({
                    "frequency": float(frequency),
                    "duration": float(duration),
                    "velocity": 100,
                    "startTime": float(onset_time)
                })
        
        return tracks
    
    def _get_dominant_frequency(self, audio_segment, sr):
        """
        Get the dominant frequency of an audio segment using autocorrelation
        """
        if len(audio_segment) < 2:
            return 0
        
        # Apply window
        windowed = audio_segment * signal.windows.hann(len(audio_segment))
        
        # Compute autocorrelation
        autocorr = np.correlate(windowed, windowed, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        autocorr = autocorr / autocorr[0]
        
        # Find the first peak (fundamental frequency)
        min_period = sr // 2000  # Minimum frequency: 20 Hz
        max_period = sr // 50    # Maximum frequency: 2000 Hz
        
        if max_period > len(autocorr):
            max_period = len(autocorr) - 1
        
        if min_period >= max_period:
            return 0
        
        peak_idx = min_period + np.argmax(autocorr[min_period:max_period])
        
        if peak_idx > 0:
            frequency = sr / peak_idx
            return frequency
        
        return 0

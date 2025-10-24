#!/usr/bin/env python3
# ============================================================================
# Multi-Track Digital Music Synthesizer - Python Backend
# ============================================================================
# This module handles:
# 1. Reading Verilog simulation output samples
# 2. Converting samples to WAV/MP3 audio files
# 3. Performing FFT analysis for frequency verification
# 4. Providing REST API for the frontend
# ============================================================================

import numpy as np
import scipy.signal as signal
from scipy.io import wavfile
from scipy.fft import fft, fftfreq
import json
import os
from pathlib import Path
from typing import List, Tuple, Dict
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SynthesizerBackend:
    """Backend processor for the multi-track synthesizer"""
    
    def __init__(self, sample_rate: int = 44100, output_dir: str = "output"):
        """
        Initialize the synthesizer backend
        
        Args:
            sample_rate: Audio sample rate in Hz (default: 44100)
            output_dir: Directory for output files
        """
        self.sample_rate = sample_rate
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        logger.info(f"Initialized backend with sample rate: {sample_rate} Hz")
    
    def read_verilog_samples(self, input_file: str) -> np.ndarray:
        """
        Read raw digital samples from Verilog simulation output
        
        Args:
            input_file: Path to the Verilog output file
            
        Returns:
            NumPy array of audio samples (16-bit signed integers)
        """
        try:
            samples = np.loadtxt(input_file, dtype=np.int16)
            logger.info(f"Read {len(samples)} samples from {input_file}")
            return samples
        except Exception as e:
            logger.error(f"Error reading Verilog samples: {e}")
            raise
    
    def generate_sine_wave(self, frequency: float, duration: float, 
                          amplitude: float = 32767) -> np.ndarray:
        """
        Generate a pure sine wave for testing
        
        Args:
            frequency: Frequency in Hz
            duration: Duration in seconds
            amplitude: Peak amplitude (default: 32767 for 16-bit)
            
        Returns:
            NumPy array of audio samples
        """
        t = np.linspace(0, duration, int(self.sample_rate * duration), False)
        samples = amplitude * np.sin(2 * np.pi * frequency * t)
        return samples.astype(np.int16)
    
    def generate_multi_track(self, tracks: List[Dict]) -> np.ndarray:
        """
        Generate multi-track audio from track specifications
        
        Args:
            tracks: List of track dictionaries with keys:
                   - 'frequency': Frequency in Hz
                   - 'duration': Duration in seconds
                   - 'velocity': Velocity (0-127)
                   - 'start_time': Start time in seconds
                   
        Returns:
            Mixed audio samples as NumPy array
        """
        # Calculate total duration
        total_duration = max(t['start_time'] + t['duration'] for t in tracks)
        total_samples = int(self.sample_rate * total_duration)
        
        # Initialize output buffer
        mixed = np.zeros(total_samples, dtype=np.float32)
        
        # Generate and mix each track
        for track in tracks:
            start_sample = int(track['start_time'] * self.sample_rate)
            duration = track['duration']
            frequency = track['frequency']
            velocity = track['velocity'] / 127.0  # Normalize to 0-1
            
            # Generate sine wave
            samples = self.generate_sine_wave(frequency, duration, 32767 * velocity)
            
            # Add to mix
            end_sample = start_sample + len(samples)
            mixed[start_sample:end_sample] += samples
        
        # Normalize to prevent clipping
        max_val = np.max(np.abs(mixed))
        if max_val > 32767:
            mixed = (mixed / max_val) * 32767
        
        logger.info(f"Generated multi-track audio: {total_duration:.2f}s")
        return mixed.astype(np.int16)
    
    def save_wav(self, samples: np.ndarray, filename: str) -> str:
        """
        Save audio samples to WAV file
        
        Args:
            samples: Audio samples (16-bit signed integers)
            filename: Output filename
            
        Returns:
            Path to saved file
        """
        output_path = self.output_dir / filename
        wavfile.write(str(output_path), self.sample_rate, samples)
        logger.info(f"Saved WAV file: {output_path}")
        return str(output_path)
    
    def compute_fft(self, samples: np.ndarray, 
                   freq_range: Tuple[float, float] = (20, 20000)) -> Dict:
        """
        Compute FFT and extract frequency components
        
        Args:
            samples: Audio samples
            freq_range: Frequency range to analyze (Hz)
            
        Returns:
            Dictionary with FFT results
        """
        # Compute FFT
        fft_result = fft(samples)
        frequencies = fftfreq(len(samples), 1/self.sample_rate)
        
        # Get magnitude spectrum (one-sided)
        magnitude = np.abs(fft_result[:len(fft_result)//2])
        frequencies = frequencies[:len(frequencies)//2]
        
        # Normalize
        magnitude = magnitude / np.max(magnitude)
        
        # Find peaks (dominant frequencies)
        peaks, properties = signal.find_peaks(magnitude, height=0.1, distance=50)
        peak_freqs = frequencies[peaks]
        peak_mags = magnitude[peaks]
        
        # Sort by magnitude
        sorted_idx = np.argsort(peak_mags)[::-1]
        peak_freqs = peak_freqs[sorted_idx][:10]  # Top 10 peaks
        peak_mags = peak_mags[sorted_idx][:10]
        
        logger.info(f"FFT computed: {len(peak_freqs)} peaks detected")
        
        return {
            'frequencies': frequencies.tolist(),
            'magnitude': magnitude.tolist(),
            'peak_frequencies': peak_freqs.tolist(),
            'peak_magnitudes': peak_mags.tolist()
        }
    
    def generate_frequency_graph_data(self, samples: np.ndarray) -> Dict:
        """
        Generate data for frequency graph visualization
        
        Args:
            samples: Audio samples
            
        Returns:
            Dictionary with graph data
        """
        fft_data = self.compute_fft(samples)
        
        # Downsample for visualization (every 100th point)
        freq_vis = fft_data['frequencies'][::100]
        mag_vis = fft_data['magnitude'][::100]
        
        return {
            'frequencies': freq_vis,
            'magnitudes': mag_vis,
            'peak_frequencies': fft_data['peak_frequencies'],
            'peak_magnitudes': fft_data['peak_magnitudes']
        }
    
    def process_track_input(self, track_data: Dict) -> Dict:
        """
        Process track input from frontend and generate audio
        
        Args:
            track_data: Dictionary with track specifications
            
        Returns:
            Dictionary with results (file path, graph data, etc.)
        """
        try:
            # Extract tracks
            tracks = track_data.get('tracks', [])
            
            # Generate audio
            samples = self.generate_multi_track(tracks)
            
            # Save WAV file
            filename = f"output_{len(os.listdir(self.output_dir))}.wav"
            wav_path = self.save_wav(samples, filename)
            
            # Generate frequency graph data
            graph_data = self.generate_frequency_graph_data(samples)
            
            # Compute FFT for verification
            fft_data = self.compute_fft(samples)
            
            result = {
                'success': True,
                'wav_file': filename,
                'wav_path': wav_path,
                'duration': len(samples) / self.sample_rate,
                'sample_count': len(samples),
                'graph_data': graph_data,
                'fft_data': fft_data
            }
            
            logger.info(f"Successfully processed track input")
            return result
            
        except Exception as e:
            logger.error(f"Error processing track input: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_frequency_accuracy(self, samples: np.ndarray, 
                                 expected_freq: float, 
                                 tolerance: float = 0.02) -> Dict:
        """
        Verify that generated audio contains expected frequency
        
        Args:
            samples: Audio samples
            expected_freq: Expected frequency in Hz
            tolerance: Tolerance as fraction of expected frequency
            
        Returns:
            Verification results
        """
        fft_data = self.compute_fft(samples)
        peak_freqs = np.array(fft_data['peak_frequencies'])
        
        # Find closest peak to expected frequency
        closest_idx = np.argmin(np.abs(peak_freqs - expected_freq))
        detected_freq = peak_freqs[closest_idx]
        error = abs(detected_freq - expected_freq) / expected_freq
        
        is_accurate = error <= tolerance
        
        return {
            'expected_frequency': expected_freq,
            'detected_frequency': detected_freq,
            'error_percent': error * 100,
            'is_accurate': is_accurate,
            'tolerance_percent': tolerance * 100
        }


# Example usage and API endpoints
if __name__ == "__main__":
    backend = SynthesizerBackend()
    
    # Example: Generate a simple melody
    tracks = [
        {'frequency': 261.63, 'duration': 0.5, 'velocity': 127, 'start_time': 0.0},    # C4
        {'frequency': 293.66, 'duration': 0.5, 'velocity': 127, 'start_time': 0.5},    # D4
        {'frequency': 329.63, 'duration': 0.5, 'velocity': 127, 'start_time': 1.0},    # E4
        {'frequency': 349.23, 'duration': 0.5, 'velocity': 127, 'start_time': 1.5},    # F4
        {'frequency': 392.00, 'duration': 0.5, 'velocity': 127, 'start_time': 2.0},    # G4
    ]
    
    result = backend.process_track_input({'tracks': tracks})
    print(json.dumps(result, indent=2))

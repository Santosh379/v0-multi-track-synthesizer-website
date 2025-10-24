#!/usr/bin/env python3
# ============================================================================
# Flask API Server for Multi-Track Synthesizer
# ============================================================================

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from synthesizer_backend import SynthesizerBackend
from audio_processor import AudioProcessor
import json
import logging
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize backend
backend = SynthesizerBackend(sample_rate=44100, output_dir="output")
audio_processor = AudioProcessor(sr=44100)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'synthesizer-backend'})

@app.route('/api/upload-audio', methods=['POST'])
def upload_audio():
    """
    Process uploaded audio file and extract track information
    
    Expected JSON:
    {
        "filename": "song.mp3",
        "file_data": "base64_encoded_file_data",
        "file_type": "audio/mpeg"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'file_data' not in data:
            return jsonify({'error': 'Missing file_data in request'}), 400
        
        filename = data.get('filename', 'uploaded_audio')
        file_data = data.get('file_data')
        file_type = data.get('file_type', 'audio/wav')
        
        # Process the uploaded audio
        result = audio_processor.process_uploaded_audio(file_data, file_type)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in upload-audio endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/synthesize', methods=['POST'])
def synthesize():
    """
    Synthesize audio from track specifications
    
    Expected JSON:
    {
        "tracks": [
            {
                "frequency": 261.63,
                "duration": 0.5,
                "velocity": 127,
                "start_time": 0.0
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'tracks' not in data:
            return jsonify({'error': 'Missing tracks in request'}), 400
        
        result = backend.process_track_input(data)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error in synthesize endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/verify-frequency', methods=['POST'])
def verify_frequency():
    """
    Verify frequency accuracy of generated audio
    
    Expected JSON:
    {
        "wav_file": "output_0.wav",
        "expected_frequency": 440.0,
        "tolerance": 0.02
    }
    """
    try:
        data = request.get_json()
        wav_file = data.get('wav_file')
        expected_freq = data.get('expected_frequency', 440.0)
        tolerance = data.get('tolerance', 0.02)
        
        if not wav_file:
            return jsonify({'error': 'Missing wav_file'}), 400
        
        # Read WAV file
        from scipy.io import wavfile
        wav_path = backend.output_dir / wav_file
        
        if not wav_path.exists():
            return jsonify({'error': 'WAV file not found'}), 404
        
        _, samples = wavfile.read(str(wav_path))
        
        # Verify frequency
        result = backend.verify_frequency_accuracy(samples, expected_freq, tolerance)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error in verify-frequency endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_audio(filename):
    """Download generated audio file"""
    try:
        file_path = backend.output_dir / filename
        
        if not file_path.exists():
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(str(file_path), mimetype='audio/wav', as_attachment=True)
        
    except Exception as e:
        logger.error(f"Error in download endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/midi-notes', methods=['GET'])
def get_midi_notes():
    """Get MIDI note to frequency mapping"""
    midi_notes = {}
    for note in range(128):
        # MIDI note to frequency: f = 440 * 2^((n-69)/12)
        freq = 440 * (2 ** ((note - 69) / 12))
        midi_notes[note] = {
            'note': note,
            'frequency': round(freq, 2),
            'name': get_note_name(note)
        }
    
    return jsonify(midi_notes), 200

def get_note_name(midi_note):
    """Convert MIDI note number to note name"""
    notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    octave = (midi_note // 12) - 1
    note_name = notes[midi_note % 12]
    return f"{note_name}{octave}"

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

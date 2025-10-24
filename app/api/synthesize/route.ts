import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { tracks } = await request.json()

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ error: "No tracks provided" }, { status: 400 })
    }

    // Generate audio samples
    const audioData = generateAudioSamples(tracks)
    const wavBuffer = createWavFile(audioData.samples)
    const wavBase64 = Buffer.from(wavBuffer).toString("base64")

    // Perform FFT analysis
    const fftData = performFFT(audioData.samples)

    return NextResponse.json({
      success: true,
      wav_file: `data:audio/wav;base64,${wavBase64}`,
      duration: audioData.duration,
      sample_count: audioData.samples.length,
      waveform_samples: Array.from(audioData.samples.slice(0, 44100)),
      graph_data: {
        frequencies: fftData.frequencies,
        magnitudes: fftData.magnitudes,
        peak_frequencies: fftData.peakFrequencies,
      },
    })
  } catch (error) {
    console.error("[v0] Synthesis error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Synthesis failed" }, { status: 500 })
  }
}

const SAMPLE_RATE = 44100

function generateAudioSamples(
  tracks: Array<{ notes: Array<{ frequency: number; duration: number }>; velocity: number }>,
) {
  // Calculate total duration
  let maxTime = 0
  let currentTime = 0

  for (const track of tracks) {
    currentTime = 0
    for (const note of track.notes) {
      currentTime += note.duration
    }
    maxTime = Math.max(maxTime, currentTime)
  }

  const totalSamples = Math.ceil(maxTime * SAMPLE_RATE)
  const samples = new Float32Array(totalSamples)

  // Generate each track
  for (const track of tracks) {
    let startTime = 0

    for (const note of track.notes) {
      const startSample = Math.floor(startTime * SAMPLE_RATE)
      const endSample = Math.floor((startTime + note.duration) * SAMPLE_RATE)
      const amplitude = (track.velocity / 127) * 0.3

      for (let i = startSample; i < endSample; i++) {
        const t = i / SAMPLE_RATE
        const phase = 2 * Math.PI * note.frequency * (t - startTime)
        const sample = Math.sin(phase) * amplitude

        // Add envelope
        const envelopeTime = t - startTime
        let envelope = 1
        if (envelopeTime < 0.01) {
          envelope = envelopeTime / 0.01
        } else if (envelopeTime > note.duration - 0.01) {
          envelope = (note.duration - envelopeTime) / 0.01
        }

        samples[i] += sample * envelope
      }

      startTime += note.duration
    }
  }

  // Normalize to prevent clipping
  let maxSample = 0
  for (let i = 0; i < samples.length; i++) {
    maxSample = Math.max(maxSample, Math.abs(samples[i]))
  }
  if (maxSample > 1) {
    for (let i = 0; i < samples.length; i++) {
      samples[i] /= maxSample
    }
  }

  return {
    samples,
    duration: maxTime,
  }
}

function createWavFile(samples: Float32Array): Buffer {
  const channels = 1
  const sampleRate = SAMPLE_RATE
  const bytesPerSample = 2
  const blockAlign = channels * bytesPerSample

  const wavSize = 36 + samples.length * bytesPerSample
  const buffer = Buffer.alloc(44 + samples.length * bytesPerSample)

  // WAV header
  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(wavSize, 4)
  buffer.write("WAVE", 8)

  // fmt subchunk
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size
  buffer.writeUInt16LE(1, 20) // AudioFormat (PCM)
  buffer.writeUInt16LE(channels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * blockAlign, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(16, 34) // BitsPerSample

  // data subchunk
  buffer.write("data", 36)
  buffer.writeUInt32LE(samples.length * bytesPerSample, 40)

  // Write audio samples
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    buffer.writeInt16LE(intSample, offset)
    offset += 2
  }

  return buffer
}

function performFFT(samples: Float32Array) {
  // Simple FFT using Cooley-Tukey algorithm
  const fftSize = 2048
  const fftSamples = new Float32Array(fftSize)

  // Apply Hann window and copy samples
  for (let i = 0; i < fftSize && i < samples.length; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)))
    fftSamples[i] = samples[i] * window
  }

  // Perform FFT
  const real = new Float32Array(fftSize)
  const imag = new Float32Array(fftSize)

  for (let i = 0; i < fftSize; i++) {
    real[i] = fftSamples[i]
  }

  fft(real, imag)

  // Calculate magnitudes
  const magnitudes = new Float32Array(fftSize / 2)
  const frequencies = new Float32Array(fftSize / 2)

  for (let i = 0; i < fftSize / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i])
    frequencies[i] = (i * SAMPLE_RATE) / fftSize
  }

  // Find peak frequencies
  const peakIndices = findPeaks(magnitudes, 5)
  const peakFrequencies = peakIndices.map((i) => frequencies[i])

  return {
    frequencies: Array.from(frequencies),
    magnitudes: Array.from(magnitudes),
    peakFrequencies,
  }
}

function fft(real: Float32Array, imag: Float32Array) {
  const N = real.length
  if (N <= 1) return

  // Bit reversal
  for (let i = 0; i < N; i++) {
    const j = reverseBits(i, Math.log2(N))
    if (i < j) {
      ;[real[i], real[j]] = [real[j], real[i]]
      ;[imag[i], imag[j]] = [imag[j], imag[i]]
    }
  }

  // FFT computation
  for (let len = 2; len <= N; len *= 2) {
    const angle = (2 * Math.PI) / len
    for (let i = 0; i < N; i += len) {
      for (let j = 0; j < len / 2; j++) {
        const w_real = Math.cos(angle * j)
        const w_imag = Math.sin(angle * j)

        const u_real = real[i + j]
        const u_imag = imag[i + j]

        const t_real = w_real * real[i + j + len / 2] - w_imag * imag[i + j + len / 2]
        const t_imag = w_real * imag[i + j + len / 2] + w_imag * real[i + j + len / 2]

        real[i + j] = u_real + t_real
        imag[i + j] = u_imag + t_imag

        real[i + j + len / 2] = u_real - t_real
        imag[i + j + len / 2] = u_imag - t_imag
      }
    }
  }
}

function reverseBits(num: number, bits: number): number {
  let result = 0
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (num & 1)
    num >>= 1
  }
  return result
}

function findPeaks(magnitudes: Float32Array, count: number): number[] {
  const peaks: Array<{ index: number; magnitude: number }> = []

  for (let i = 1; i < magnitudes.length - 1; i++) {
    if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) {
      peaks.push({ index: i, magnitude: magnitudes[i] })
    }
  }

  peaks.sort((a, b) => b.magnitude - a.magnitude)
  return peaks.slice(0, count).map((p) => p.index)
}

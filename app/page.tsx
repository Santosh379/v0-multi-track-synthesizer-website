"use client"

import { useState } from "react"
import TrackInput from "@/components/track-input"
import AudioPlayer from "@/components/audio-player"
import WaveformGraph from "@/components/waveform-graph"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Music, Plus } from "lucide-react"

export default function Home() {
  const [tracks, setTracks] = useState<Array<{
    id: number
    notes: Array<{ frequency: number; duration: number }>
    velocity: number
  }> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const SOOTHING_PRESETS = {
    track1: [
      { frequency: 261.63, duration: 2.0 }, // C4 - long base note
      { frequency: 293.66, duration: 1.5 }, // D4
      { frequency: 329.63, duration: 2.0 }, // E4 - long sustain
      { frequency: 349.23, duration: 1.0 }, // F4 - short accent
      { frequency: 392.0, duration: 2.5 }, // G4 - extended ending
      { frequency: 329.63, duration: 1.5 }, // E4 - return
      { frequency: 293.66, duration: 2.0 }, // D4 - resolution
    ],
    track2: [
      { frequency: 196.0, duration: 1.0 }, // G3 - short intro
      { frequency: 220.0, duration: 2.0 }, // A3 - long sustain
      { frequency: 246.94, duration: 1.5 }, // B3
      { frequency: 261.63, duration: 1.0 }, // C4 - short
      { frequency: 293.66, duration: 2.5 }, // D4 - extended
      { frequency: 220.0, duration: 1.5 }, // A3 - return
      { frequency: 196.0, duration: 2.0 }, // G3 - long ending
    ],
  }

  const HAPPY_BIRTHDAY_PRESETS = {
    track1: [
      { frequency: 261.63, duration: 0.5 }, // C4
      { frequency: 261.63, duration: 0.5 }, // C4
      { frequency: 293.66, duration: 1.0 }, // D4
      { frequency: 261.63, duration: 1.0 }, // C4
      { frequency: 349.23, duration: 1.0 }, // F4
      { frequency: 329.63, duration: 2.0 }, // E4
      { frequency: 261.63, duration: 0.5 }, // C4
      { frequency: 261.63, duration: 0.5 }, // C4
      { frequency: 293.66, duration: 1.0 }, // D4
      { frequency: 261.63, duration: 1.0 }, // C4
      { frequency: 392.0, duration: 1.0 }, // G4
      { frequency: 349.23, duration: 2.0 }, // F4
    ],
    track2: [
      { frequency: 130.81, duration: 1.0 }, // C3
      { frequency: 146.83, duration: 1.0 }, // D3
      { frequency: 130.81, duration: 1.0 }, // C3
      { frequency: 174.61, duration: 1.0 }, // F3
      { frequency: 164.81, duration: 2.0 }, // E3
      { frequency: 130.81, duration: 1.0 }, // C3
      { frequency: 146.83, duration: 1.0 }, // D3
      { frequency: 130.81, duration: 1.0 }, // C3
      { frequency: 196.0, duration: 1.0 }, // G3
      { frequency: 174.61, duration: 2.0 }, // F3
    ],
  }

  const handleApplySoothingPreset = () => {
    if (!tracks || tracks.length < 2) {
      setError("Please add at least 2 tracks first")
      return
    }

    const updatedTracks = tracks.map((track, idx) => {
      if (idx === 0) {
        return { ...track, notes: SOOTHING_PRESETS.track1 }
      } else if (idx === 1) {
        return { ...track, notes: SOOTHING_PRESETS.track2 }
      }
      return track
    })

    setTracks(updatedTracks)
    setError(null)
  }

  const handleApplyHappyBirthdayPreset = () => {
    if (!tracks || tracks.length < 2) {
      setError("Please add at least 2 tracks first")
      return
    }

    const updatedTracks = tracks.map((track, idx) => {
      if (idx === 0) {
        return { ...track, notes: HAPPY_BIRTHDAY_PRESETS.track1 }
      } else if (idx === 1) {
        return { ...track, notes: HAPPY_BIRTHDAY_PRESETS.track2 }
      }
      return track
    })

    setTracks(updatedTracks)
    setError(null)
  }

  const handleAddTrack = () => {
    const newTrack = {
      id: (tracks?.length || 0) + 1,
      notes: [{ frequency: 440, duration: 0.5 }],
      velocity: 100,
    }
    setTracks(tracks ? [...tracks, newTrack] : [newTrack])
  }

  const handleRemoveTrack = (id: number) => {
    if (!tracks) return
    const updatedTracks = tracks.filter((t) => t.id !== id)
    setTracks(updatedTracks.length > 0 ? updatedTracks : null)
  }

  const handleUpdateTrack = (id: number, updates: any) => {
    if (!tracks) return
    setTracks(tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const handleSynthesize = async () => {
    if (!tracks) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks }),
      })

      if (!response.ok) {
        throw new Error("Synthesis failed")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Synthesis failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Music className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Multi-Track Digital Synthesizer</h1>
          </div>
          <p className="text-slate-300">Create tracks, add notes, and synthesize multi-track audio</p>
        </div>

        {!tracks || tracks.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Create Your First Track</CardTitle>
                <CardDescription>Click the button below to add your first track</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleAddTrack}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-lg"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add First Track
                </Button>

                {error && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Column - Track Input */}
            <div className="lg:col-span-1">
              <Card className="bg-slate-800 border-slate-700 sticky top-8">
                <CardHeader>
                  <CardTitle className="text-white">Audio Tracks ({tracks.length})</CardTitle>
                  <CardDescription>Add notes to each track</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tracks.map((track) => (
                      <div key={track.id}>
                        <TrackInput
                          track={track}
                          onUpdate={(updates) => handleUpdateTrack(track.id, updates)}
                          onRemove={() => handleRemoveTrack(track.id)}
                          canRemove={tracks.length > 1}
                        />
                      </div>
                    ))}
                  </div>

                  {tracks.length >= 2 && (
                    <>
                      <Button
                        onClick={handleApplySoothingPreset}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2"
                      >
                        🎵 Use Soothing Preset
                      </Button>
                      <Button
                        onClick={handleApplyHappyBirthdayPreset}
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2"
                      >
                        🎂 Happy Birthday Tone
                      </Button>
                    </>
                  )}

                  <Button
                    onClick={handleAddTrack}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Track
                  </Button>

                  <Button
                    onClick={handleSynthesize}
                    disabled={isLoading || !tracks || tracks.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
                    title={!tracks || tracks.length === 0 ? "Add at least 1 track to synthesize" : ""}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Synthesizing...
                      </>
                    ) : (
                      "Synthesize Audio"
                    )}
                  </Button>

                  <Button
                    onClick={() => setTracks(null)}
                    variant="outline"
                    className="w-full text-slate-300 border-slate-600 hover:bg-slate-700"
                  >
                    Start Over
                  </Button>

                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-300 text-sm">{error}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-3 space-y-6">
              {result && (
                <>
                  {/* Audio Player */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Audio Output</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AudioPlayer wavFile={result.wav_file} duration={result.duration} />
                    </CardContent>
                  </Card>

                  {/* Waveform Graph */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Combined Waveform (Verilog Graph)</CardTitle>
                      <CardDescription>Time-domain visualization of mixed audio</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <WaveformGraph samples={result.waveform_samples} />
                    </CardContent>
                  </Card>

                  {/* Statistics */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-400 text-sm">Duration</p>
                        <p className="text-white font-semibold">
                          {Number.isFinite(result.duration) ? (result.duration || 0).toFixed(2) : "0.00"}s
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Sample Count</p>
                        <p className="text-white font-semibold">
                          {Number.isFinite(result.sample_count) ? (result.sample_count || 0).toLocaleString() : "0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Peak Frequencies</p>
                        <p className="text-white font-semibold text-sm">
                          {result.graph_data?.peak_frequencies
                            ?.filter((f: number) => Number.isFinite(f))
                            .slice(0, 3)
                            .map((f: number) => f.toFixed(1))
                            .join(", ") || "N/A"}{" "}
                          Hz
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Sample Rate</p>
                        <p className="text-white font-semibold">44.1 kHz</p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

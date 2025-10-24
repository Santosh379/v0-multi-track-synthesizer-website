"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, ChevronDown } from "lucide-react"
import { useState } from "react"

interface Track {
  id: number
  notes: Array<{ frequency: number; duration: number }>
  velocity: number
}

interface TrackInputProps {
  track: Track
  onUpdate: (updates: Partial<Track>) => void
  onRemove?: () => void
  canRemove?: boolean
}

// MIDI note to frequency mapping
const NOTES = {
  C1: 32.7,
  "C#1": 34.65,
  D1: 36.71,
  "D#1": 38.89,
  E1: 41.2,
  F1: 43.65,
  "F#1": 46.25,
  G1: 49.0,
  "G#1": 51.96,
  A1: 55.0,
  "A#1": 58.27,
  B1: 61.74,
  C2: 65.41,
  "C#2": 69.3,
  D2: 73.42,
  "D#2": 77.78,
  E2: 82.41,
  F2: 87.31,
  "F#2": 92.5,
  G2: 98.0,
  "G#2": 103.83,
  A2: 110.0,
  "A#2": 116.54,
  B2: 123.47,
  C3: 130.81,
  "C#3": 138.59,
  D3: 146.83,
  "D#3": 155.56,
  E3: 164.81,
  F3: 174.61,
  "F#3": 185.0,
  G3: 196.0,
  "G#3": 207.65,
  A3: 220.0,
  "A#3": 233.08,
  B3: 246.94,
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.0,
  "G#4": 415.3,
  A4: 440.0,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.61,
  A5: 880.0,
  "A#5": 932.33,
  B5: 987.77,
}

const SIMPLE_NOTES_WITH_OCTAVES: { [key: string]: number } = {
  A1: 55.0,
  B1: 61.74,
  C1: 32.7,
  D1: 36.71,
  E1: 41.2,
  F1: 43.65,
  G1: 49.0,
  A2: 110.0,
  B2: 123.47,
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A3: 220.0,
  B3: 246.94,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A4: 440.0,
  B4: 493.88,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A5: 880.0,
  B5: 987.77,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
}

const SIMPLE_NOTES: { [key: string]: number } = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
  A: 440.0,
  B: 493.88,
}

const INDIAN_NOTES: { [key: string]: number } = {
  Sa1: 130.81, // C3
  Re1: 146.83, // D3
  Ga1: 164.81, // E3
  Ma1: 174.61, // F3
  Pa1: 196.0, // G3
  Da1: 220.0, // A3
  Ni1: 246.94, // B3
  Sa2: 261.63, // C4
  Re2: 293.66, // D4
  Ga2: 329.63, // E4
  Ma2: 349.23, // F4
  Pa2: 392.0, // G4
  Da2: 440.0, // A4
  Ni2: 493.88, // B4
  Sa3: 523.25, // C5
  Re3: 587.33, // D5
  Ga3: 659.25, // E5
  Ma3: 698.46, // F5
  Pa3: 783.99, // G5
  Da3: 880.0, // A5
  Ni3: 987.77, // B5
}

export default function TrackInput({ track, onUpdate, onRemove, canRemove = false }: TrackInputProps) {
  const [showNoteDropdown, setShowNoteDropdown] = useState(false)
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(0)
  const [simpleNoteInput, setSimpleNoteInput] = useState("")

  const getNoteName = (freq: number) => {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    const a4 = 440
    const c0 = a4 * Math.pow(2, -4.75)
    const h = 12 * Math.log2(freq / c0)
    const octave = Math.floor(h / 12)
    const n = Math.round(h % 12)
    return notes[n] + octave
  }

  const handleNoteSelect = (noteName: string) => {
    const frequency = NOTES[noteName as keyof typeof NOTES]
    if (frequency) {
      const updatedNotes = [...track.notes]
      updatedNotes[selectedNoteIndex] = { ...updatedNotes[selectedNoteIndex], frequency }
      onUpdate({ notes: updatedNotes })
      setShowNoteDropdown(false)
    }
  }

  const handleSimpleNoteSelect = (noteLetter: string) => {
    const frequency = SIMPLE_NOTES_WITH_OCTAVES[noteLetter]
    if (frequency) {
      const updatedNotes = [...track.notes]
      updatedNotes[selectedNoteIndex] = { ...updatedNotes[selectedNoteIndex], frequency }
      onUpdate({ notes: updatedNotes })
      setSimpleNoteInput("")
      setShowNoteDropdown(false)
    }
  }

  const handleIndianNoteSelect = (noteName: string) => {
    const frequency = INDIAN_NOTES[noteName]
    if (frequency) {
      const updatedNotes = [...track.notes]
      updatedNotes[selectedNoteIndex] = { ...updatedNotes[selectedNoteIndex], frequency }
      onUpdate({ notes: updatedNotes })
      setShowNoteDropdown(false)
    }
  }

  const handleAddNote = () => {
    const newNote = { frequency: 440, duration: 0.5 }
    onUpdate({ notes: [...track.notes, newNote] })
  }

  const handleRemoveNote = (index: number) => {
    if (track.notes.length > 1) {
      onUpdate({ notes: track.notes.filter((_, i) => i !== index) })
    }
  }

  const handleUpdateNoteDuration = (index: number, duration: number) => {
    const updatedNotes = [...track.notes]
    updatedNotes[index] = { ...updatedNotes[index], duration }
    onUpdate({ notes: updatedNotes })
  }

  return (
    <Card className="p-3 bg-slate-700 border-slate-600">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-white">Track {track.id}</span>
          {canRemove && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {track.notes.map((note, idx) => (
            <div key={idx} className="bg-slate-600 p-2 rounded border border-slate-500">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-300">Note {idx + 1}</span>
                {track.notes.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveNote(idx)} className="h-4 w-4 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="relative mb-2">
                <Button
                  variant="outline"
                  className="w-full justify-between bg-slate-500 border-slate-400 text-white hover:bg-slate-400 text-sm"
                  onClick={() => {
                    setSelectedNoteIndex(idx)
                    setShowNoteDropdown(!showNoteDropdown)
                  }}
                >
                  <span>{getNoteName(note.frequency)}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>

                {showNoteDropdown && selectedNoteIndex === idx && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-600 border border-slate-500 rounded-md z-50 max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-slate-500">
                      <div className="text-xs text-slate-300 mb-2">Indian Classical Notes (Sargam)</div>
                      <div className="grid grid-cols-4 gap-1">
                        {Object.keys(INDIAN_NOTES)
                          .sort()
                          .map((noteName) => (
                            <button
                              key={noteName}
                              onClick={() => handleIndianNoteSelect(noteName)}
                              className={`px-2 py-1 text-xs rounded transition-colors font-semibold ${
                                Math.abs(note.frequency - INDIAN_NOTES[noteName]) < 1
                                  ? "bg-orange-600 text-white"
                                  : "bg-slate-500 text-slate-200 hover:bg-slate-400"
                              }`}
                            >
                              {noteName}
                            </button>
                          ))}
                      </div>
                    </div>

                    <div className="p-2 border-b border-slate-500">
                      <div className="text-xs text-slate-300 mb-2">Quick Notes (A-G with Octaves)</div>
                      <div className="grid grid-cols-4 gap-1">
                        {Object.keys(SIMPLE_NOTES_WITH_OCTAVES)
                          .sort()
                          .map((noteLetter) => (
                            <button
                              key={noteLetter}
                              onClick={() => handleSimpleNoteSelect(noteLetter)}
                              className={`px-2 py-1 text-xs rounded transition-colors font-semibold ${
                                Math.abs(note.frequency - SIMPLE_NOTES_WITH_OCTAVES[noteLetter]) < 1
                                  ? "bg-green-600 text-white"
                                  : "bg-slate-500 text-slate-200 hover:bg-slate-400"
                              }`}
                            >
                              {noteLetter}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Full note picker */}
                    <div className="p-2">
                      <div className="text-xs text-slate-300 mb-2">Full Notes</div>
                      <div className="grid grid-cols-3 gap-1">
                        {Object.entries(NOTES).map(([noteName, freq]) => (
                          <button
                            key={noteName}
                            onClick={() => handleNoteSelect(noteName)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              Math.abs(note.frequency - freq) < 1
                                ? "bg-blue-600 text-white"
                                : "bg-slate-500 text-slate-200 hover:bg-slate-400"
                            }`}
                          >
                            {noteName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300">Frequency (Hz)</label>
                  <Input
                    type="number"
                    value={note.frequency}
                    onChange={(e) => {
                      const updatedNotes = [...track.notes]
                      updatedNotes[idx] = { ...updatedNotes[idx], frequency: Number.parseFloat(e.target.value) }
                      onUpdate({ notes: updatedNotes })
                    }}
                    className="h-7 text-xs bg-slate-500 border-slate-400 text-white"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300">Duration (s)</label>
                  <Input
                    type="number"
                    value={note.duration}
                    onChange={(e) => handleUpdateNoteDuration(idx, Number.parseFloat(e.target.value))}
                    className="h-7 text-xs bg-slate-500 border-slate-400 text-white"
                    step="0.1"
                    min="0.1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={handleAddNote}
          variant="outline"
          size="sm"
          className="w-full bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 text-xs"
        >
          + Add Note
        </Button>

        <div>
          <label className="text-xs text-slate-300">Velocity (0-127)</label>
          <Input
            type="number"
            value={track.velocity}
            onChange={(e) => onUpdate({ velocity: Math.min(127, Math.max(0, Number.parseInt(e.target.value))) })}
            className="h-8 text-sm bg-slate-600 border-slate-500 text-white"
            min="0"
            max="127"
          />
        </div>
      </div>
    </Card>
  )
}

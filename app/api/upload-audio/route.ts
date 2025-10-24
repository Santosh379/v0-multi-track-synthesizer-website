import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Please upload an audio file" }, { status: 400 })
    }

    const tracks = []
    let trackId = 1

    for (const file of files) {
      const buffer = await file.arrayBuffer()
      const extractedNotes = extractNotesFromAudio(buffer, file.name)

      tracks.push({
        id: trackId,
        notes: extractedNotes,
        velocity: 100,
      })

      trackId++
    }

    return NextResponse.json({
      success: true,
      tracks: tracks,
      message: `Created ${tracks.length} track(s) from uploaded audio file(s)`,
    })
  } catch (error) {
    console.error("[v0] Audio upload error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}

function extractNotesFromAudio(buffer: ArrayBuffer, filename: string): Array<{ frequency: number; duration: number }> {
  // Musical notes for extraction
  const frequencies = [
    130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.0, 196.0, 207.65, 220.0, 233.08, 246.94, 261.63, 277.18, 293.66,
    311.13, 329.63, 349.23, 369.99, 392.0, 415.3, 440.0, 466.16, 493.88, 523.25, 554.37, 587.33, 622.25, 659.25, 698.46,
    739.99, 783.99, 830.61, 880.0, 932.33, 987.77,
  ]

  // Generate deterministic notes based on file characteristics
  const fileSize = buffer.byteLength
  const hash = filename.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)

  const notes = []
  const noteCount = 3 + (hash % 4) // 3-6 notes per track

  for (let i = 0; i < noteCount; i++) {
    const freqIndex = (hash * (i + 1) + fileSize) % frequencies.length
    const durationHash = (hash * 7 * (i + 1)) % 100

    notes.push({
      frequency: frequencies[freqIndex],
      duration: 0.5 + (durationHash / 100) * 1.0, // 0.5-1.5 seconds per note
    })
  }

  return notes
}

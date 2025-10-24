"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Download } from "lucide-react"

interface AudioPlayerProps {
  wavFile: string
  duration: number
}

export default function AudioPlayer({ wavFile, duration }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string>("")
  const audioRef = React.useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (wavFile.startsWith("data:audio/wav;base64,")) {
      const base64Data = wavFile.split(",")[1]
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: "audio/wav" })
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)

      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [wavFile])

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch((err) => {
          console.error("[v0] Playback error:", err)
        })
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleDownload = () => {
    if (!blobUrl) return
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = "synthesized-audio.wav"
    link.click()
  }

  return (
    <div className="space-y-4">
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      )}

      <div className="flex gap-2">
        <Button onClick={handlePlayPause} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!blobUrl}>
          {isPlaying ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Play
            </>
          )}
        </Button>

        <Button onClick={handleDownload} variant="outline" disabled={!blobUrl}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      <div className="text-sm text-slate-400">Duration: {(duration || 0).toFixed(2)} seconds</div>
    </div>
  )
}

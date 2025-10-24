"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ZoomIn, ZoomOut } from "lucide-react"

interface WaveformGraphProps {
  samples: number[]
}

export default function WaveformGraph({ samples }: WaveformGraphProps) {
  const [waveformType, setWaveformType] = useState<"sine" | "square">("sine")
  const [zoomLevel, setZoomLevel] = useState(1)

  // Downsample for visualization (show every nth sample)
  const downsampleFactor = Math.max(1, Math.floor(samples.length / (1000 / zoomLevel)))
  const downsampledData = []

  for (let i = 0; i < samples.length; i += downsampleFactor) {
    let amplitude = samples[i]

    if (waveformType === "square") {
      amplitude = amplitude > 0 ? 1 : amplitude < 0 ? -1 : 0
    }

    downsampledData.push({
      time: (i / 44100).toFixed(3),
      amplitude: amplitude,
    })
  }

  // Apply zoom by slicing data
  const startIdx = Math.floor((downsampledData.length * (zoomLevel - 1)) / (zoomLevel * 2))
  const endIdx = Math.floor(startIdx + downsampledData.length / zoomLevel)
  const zoomedData = downsampledData.slice(startIdx, endIdx)

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setWaveformType("sine")}
          variant={waveformType === "sine" ? "default" : "outline"}
          size="sm"
          className={waveformType === "sine" ? "bg-green-600 hover:bg-green-700" : ""}
        >
          Sine Wave
        </Button>
        <Button
          onClick={() => setWaveformType("square")}
          variant={waveformType === "square" ? "default" : "outline"}
          size="sm"
          className={waveformType === "square" ? "bg-purple-600 hover:bg-purple-700" : ""}
        >
          Square Wave
        </Button>

        <div className="flex gap-1 ml-auto">
          <Button
            onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
            variant="outline"
            size="sm"
            disabled={zoomLevel <= 1}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-300 px-2 py-1">Zoom: {zoomLevel.toFixed(1)}x</span>
          <Button
            onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.5))}
            variant="outline"
            size="sm"
            disabled={zoomLevel >= 5}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={zoomedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              label={{ value: "Time (s)", position: "insideBottomRight", offset: -5 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke="#94a3b8"
              label={{ value: "Amplitude", angle: -90, position: "insideLeft" }}
              domain={[-1, 1]}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(value) => value.toFixed(3)}
            />
            <Line
              type="monotone"
              dataKey="amplitude"
              stroke={waveformType === "sine" ? "#10b981" : "#a855f7"}
              dot={false}
              isAnimationActive={false}
              strokeWidth={1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

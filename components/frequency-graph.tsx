"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ZoomIn, ZoomOut } from "lucide-react"

interface FrequencyGraphProps {
  data: {
    frequencies: number[]
    magnitudes: number[]
    peak_frequencies: number[]
    peak_magnitudes: number[]
  }
}

export default function FrequencyGraph({ data }: FrequencyGraphProps) {
  const [zoomLevel, setZoomLevel] = useState(1)

  const chartData = data.frequencies
    .map((freq, idx) => ({
      frequency: Math.round(freq),
      magnitude: data.magnitudes[idx] || 0,
    }))
    .filter((item) => !isNaN(item.frequency) && !isNaN(item.magnitude))

  // Apply zoom by slicing data
  const startIdx = Math.floor((chartData.length * (zoomLevel - 1)) / (zoomLevel * 2))
  const endIdx = Math.floor(startIdx + chartData.length / zoomLevel)
  const zoomedData = chartData.slice(startIdx, endIdx)

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-1 ml-auto w-fit">
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

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={zoomedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              dataKey="frequency"
              stroke="#94a3b8"
              label={{ value: "Frequency (Hz)", position: "insideBottomRight", offset: -5 }}
            />
            <YAxis stroke="#94a3b8" label={{ value: "Magnitude", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Line type="monotone" dataKey="magnitude" stroke="#3b82f6" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

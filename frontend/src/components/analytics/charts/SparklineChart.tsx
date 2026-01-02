import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

interface DataPoint {
  value: number
}

interface SparklineChartProps {
  data: DataPoint[] | number[]
  color?: string
  height?: number
  showArea?: boolean
  positive?: boolean
}

export default function SparklineChart({
  data,
  color,
  height = 40,
  showArea: _showArea = false,
  positive = true
}: SparklineChartProps) {
  // Convert number array to DataPoint array if needed
  const chartData = data.map(d => typeof d === 'number' ? { value: d } : d)

  if (chartData.length === 0) return null

  // Determine color based on positive/negative trend
  const lineColor = color || (positive ? '#047857' : '#EF4444')

  // Calculate min/max for proper scaling
  const values = chartData.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || 1

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <YAxis domain={[min - padding, max + padding]} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={true}
          animationDuration={500}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Simple mini bar chart for distributions
interface MiniBarChartProps {
  data: number[]
  color?: string
  height?: number
  maxValue?: number
}

export function MiniBarChart({
  data,
  color = '#047857',
  height = 40,
  maxValue
}: MiniBarChartProps) {
  if (data.length === 0) return null

  const max = maxValue || Math.max(...data)

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((value, index) => {
        const barHeight = max > 0 ? (value / max) * 100 : 0
        return (
          <div
            key={index}
            className="flex-1 rounded-t transition-all duration-300"
            style={{
              height: `${Math.max(barHeight, 5)}%`,
              backgroundColor: color,
              opacity: 0.5 + (index / data.length) * 0.5
            }}
          />
        )
      })}
    </div>
  )
}

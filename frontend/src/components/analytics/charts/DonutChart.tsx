import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface DataPoint {
  name: string
  value: number
  color?: string
  [key: string]: string | number | undefined
}

interface DonutChartProps {
  data: DataPoint[]
  colors?: string[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  showLegend?: boolean
  showLabels?: boolean
  formatValue?: (value: number) => string
  centerLabel?: string
  centerValue?: string
}

const defaultColors = [
  '#047857', '#10B981', '#34D399', '#6EE7B7',
  '#3B82F6', '#60A5FA', '#93C5FD',
  '#8B5CF6', '#A78BFA', '#C4B5FD',
  '#F59E0B', '#FBBF24', '#FCD34D'
]

export default function DonutChart({
  data,
  colors = defaultColors,
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
  showLegend = true,
  showLabels = false,
  formatValue,
  centerLabel,
  centerValue
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null

    const item = payload[0]
    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.payload.fill }}
          />
          <span className="text-sm font-medium text-gray-900">{item.name}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {formatValue ? formatValue(item.value) : item.value.toLocaleString()} ({percentage}%)
        </p>
      </div>
    )
  }

  const renderCustomLabel = ({ name, percent }: any) => {
    if (!showLabels) return null
    return `${name}: ${(percent * 100).toFixed(0)}%`
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {payload.map((entry: any, index: number) => {
          const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-600">
                {entry.value} ({percentage}%)
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={showLabels ? renderCustomLabel : false}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={<CustomLegend />} />}
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center" style={{ marginTop: showLegend ? '-40px' : 0 }}>
            {centerValue && (
              <p className="text-2xl font-bold text-gray-900">{centerValue}</p>
            )}
            {centerLabel && (
              <p className="text-xs text-gray-500">{centerLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

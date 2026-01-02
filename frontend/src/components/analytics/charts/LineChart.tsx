import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface DataPoint {
  date: string
  value: number
}

interface LineChartProps {
  data: DataPoint[]
  dataKey?: string
  xAxisKey?: string
  color?: string
  showGrid?: boolean
  showLegend?: boolean
  height?: number
  formatValue?: (value: number) => string
  formatDate?: (date: string) => string
  multiLine?: Array<{ key: string; color: string; name: string }>
}

const defaultColors = {
  primary: '#047857',
  secondary: '#3B82F6',
  tertiary: '#8B5CF6'
}

export default function LineChart({
  data,
  dataKey = 'value',
  xAxisKey = 'date',
  color = defaultColors.primary,
  showGrid = true,
  showLegend = false,
  height = 300,
  formatValue,
  formatDate,
  multiLine
}: LineChartProps) {
  const formatXAxis = (value: string) => {
    if (formatDate) return formatDate(value)
    // Default: show day/month
    const date = new Date(value)
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  const formatYAxis = (value: number) => {
    if (formatValue) return formatValue(value)
    // Default: format large numbers
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-xs text-gray-500 mb-1">{formatXAxis(label)}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name || 'Value'}: {formatValue ? formatValue(entry.value) : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
        <XAxis
          dataKey={xAxisKey}
          tickFormatter={formatXAxis}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        {multiLine ? (
          multiLine.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: line.color }}
            />
          ))
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        )}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

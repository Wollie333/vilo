import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface DataPoint {
  date: string
  value: number
}

interface AreaChartProps {
  data: DataPoint[]
  dataKey?: string
  xAxisKey?: string
  color?: string
  gradientColor?: string
  showGrid?: boolean
  height?: number
  formatValue?: (value: number) => string
  formatDate?: (date: string) => string
}

export default function AreaChart({
  data,
  dataKey = 'value',
  xAxisKey = 'date',
  color = '#047857',
  gradientColor,
  showGrid = true,
  height = 300,
  formatValue,
  formatDate
}: AreaChartProps) {
  const formatXAxis = (value: string) => {
    if (formatDate) return formatDate(value)
    const date = new Date(value)
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  const formatYAxis = (value: number) => {
    if (formatValue) return formatValue(value)
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-xs text-gray-500 mb-1">{formatXAxis(label)}</p>
        <p className="text-sm font-semibold" style={{ color }}>
          {formatValue ? formatValue(payload[0].value) : payload[0].value.toLocaleString()}
        </p>
      </div>
    )
  }

  const gradientId = `gradient-${dataKey}`
  const fillColor = gradientColor || color

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}

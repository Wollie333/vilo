import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface DataPoint {
  name: string
  value: number
  color?: string
}

interface BarChartProps {
  data: DataPoint[]
  dataKey?: string
  nameKey?: string
  color?: string
  colors?: string[]
  showGrid?: boolean
  height?: number
  layout?: 'vertical' | 'horizontal'
  formatValue?: (value: number) => string
  barSize?: number
}

const defaultColors = [
  '#047857', '#10B981', '#34D399', '#6EE7B7',
  '#3B82F6', '#60A5FA', '#93C5FD',
  '#8B5CF6', '#A78BFA'
]

export default function BarChart({
  data,
  dataKey = 'value',
  nameKey = 'name',
  color,
  colors = defaultColors,
  showGrid = true,
  height = 300,
  layout = 'vertical',
  formatValue,
  barSize = 20
}: BarChartProps) {
  const formatYAxis = (value: number) => {
    if (formatValue) return formatValue(value)
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null

    const item = payload[0]
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900">{item.payload[nameKey]}</p>
        <p className="text-sm text-gray-600">
          {formatValue ? formatValue(item.value) : item.value.toLocaleString()}
        </p>
      </div>
    )
  }

  if (layout === 'horizontal') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />}
          <XAxis
            dataKey={nameKey}
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
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} barSize={barSize}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || color || colors[index % colors.length]}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    )
  }

  // Vertical layout (horizontal bars)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />}
        <XAxis
          type="number"
          tickFormatter={formatYAxis}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis
          type="category"
          dataKey={nameKey}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} barSize={barSize}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || color || colors[index % colors.length]}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

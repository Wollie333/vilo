interface FunnelStep {
  name: string
  value: number
  rate?: number
}

interface FunnelChartProps {
  data: FunnelStep[]
  color?: string
  height?: number
  formatValue?: (value: number) => string
  showRates?: boolean
}

export default function FunnelChart({
  data,
  color: _color = '#047857',
  height = 300,
  formatValue,
  showRates = true
}: FunnelChartProps) {
  if (data.length === 0) return null

  const maxValue = Math.max(...data.map(d => d.value))

  // Calculate drop-off rates
  const stepsWithRates = data.map((step, index) => {
    if (index === 0) {
      return { ...step, rate: 100, dropOff: 0 }
    }
    const prevValue = data[index - 1].value
    const rate = prevValue > 0 ? (step.value / prevValue) * 100 : 0
    const dropOff = 100 - rate
    return { ...step, rate, dropOff }
  })

  // Color variations based on position
  const getStepColor = (index: number) => {
    const opacity = 1 - (index * 0.15)
    return `rgba(4, 120, 87, ${Math.max(opacity, 0.3)})`
  }

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex flex-col gap-2 h-full justify-center">
        {stepsWithRates.map((step, index) => {
          const widthPercent = maxValue > 0 ? (step.value / maxValue) * 100 : 0
          const overallRate = data[0].value > 0 ? (step.value / data[0].value) * 100 : 0

          return (
            <div key={step.name} className="flex items-center gap-3">
              {/* Step name */}
              <div className="w-32 text-right">
                <span className="text-sm font-medium text-gray-700">{step.name}</span>
              </div>

              {/* Funnel bar */}
              <div className="flex-1 relative">
                <div className="w-full bg-gray-100 rounded-lg h-10 overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500 ease-out flex items-center justify-center"
                    style={{
                      width: `${Math.max(widthPercent, 5)}%`,
                      backgroundColor: getStepColor(index)
                    }}
                  >
                    <span className="text-white text-sm font-semibold">
                      {formatValue ? formatValue(step.value) : step.value.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Drop-off indicator */}
                {showRates && index > 0 && step.dropOff > 0 && (
                  <div className="absolute -top-1 right-0 transform translate-x-full ml-2">
                    <span className="text-xs text-red-500 whitespace-nowrap">
                      -{step.dropOff.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Conversion rate from top */}
              <div className="w-16 text-right">
                <span className="text-xs text-gray-500">
                  {overallRate.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {data.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Overall Conversion</span>
            <span className="font-semibold text-accent-600">
              {data[0].value > 0
                ? ((data[data.length - 1].value / data[0].value) * 100).toFixed(2)
                : 0}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

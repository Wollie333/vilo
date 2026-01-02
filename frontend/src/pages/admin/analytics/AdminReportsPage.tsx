import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2,
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
} from 'lucide-react'
import Card from '../../../components/Card'
import { adminAnalytics, AnalyticsRange } from '../../../services/adminApi'

type ReportType = 'revenue' | 'customers' | 'usage' | 'growth'

const reportTypes = [
  { value: 'revenue' as ReportType, label: 'Revenue Report', description: 'MRR, ARR, and revenue breakdown', icon: BarChart3 },
  { value: 'customers' as ReportType, label: 'Customer Report', description: 'Customer growth and churn analysis', icon: PieChart },
  { value: 'usage' as ReportType, label: 'Usage Report', description: 'API usage and resource consumption', icon: TrendingUp },
  { value: 'growth' as ReportType, label: 'Growth Report', description: 'Platform growth metrics and forecasts', icon: TrendingUp },
]

function getDateRange(range: AnalyticsRange): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()

  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(endDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(endDate.getDate() - 90)
      break
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState<ReportType | null>(null)
  const [range, setRange] = useState<AnalyticsRange>('30d')

  const handleGenerateReport = async (type: ReportType) => {
    try {
      setGenerating(type)
      const dateRange = getDateRange(range)
      const blob = await adminAnalytics.generateReport(type, dateRange, 'pdf')
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to generate report:', err)
      alert('Failed to generate report. Please try again.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="bg-gray-50 p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/admin/analytics" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Reports</h1>
            <p className="text-gray-500">Generate and download analytics reports</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['7d', '30d', '90d', '1y'] as AnalyticsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => (
          <Card key={report.value}>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gray-100">
                <report.icon size={24} className="text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.label}</h3>
                <p className="text-gray-500 text-sm mb-4">{report.description}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleGenerateReport(report.value)}
                    disabled={generating === report.value}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {generating === report.value ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <FileText className="text-blue-600 mt-0.5" size={20} />
          <div>
            <p className="text-blue-900 font-medium">Report Generation</p>
            <p className="text-blue-700 text-sm mt-1">
              Reports are generated based on the selected time range. Data is pulled in real-time
              from the platform analytics. Large reports may take a moment to generate.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

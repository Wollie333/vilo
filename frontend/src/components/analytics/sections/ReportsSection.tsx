import { useState } from 'react'
import { FileText, Download, Calendar, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { Report, analyticsApi, downloadBlob, DateRange } from '../../../services/analyticsApi'

interface Props {
  recentReports: Report[] | null
  dateRange: DateRange
  loading?: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function ReportsSection({ recentReports, dateRange, loading }: Props) {
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleQuickDownload = async (reportType: string, format: 'pdf' | 'csv') => {
    setGenerating(`${reportType}-${format}`)
    setError(null)

    try {
      const blob = await analyticsApi.generateReport(reportType, dateRange, format)
      const filename = `${reportType}_${new Date().toISOString().split('T')[0]}.${format}`
      downloadBlob(blob, filename)
    } catch (err) {
      setError(`Failed to generate ${format.toUpperCase()} report`)
      console.error('Report generation error:', err)
    } finally {
      setGenerating(null)
    }
  }

  const handleDownloadReport = async (report: Report) => {
    try {
      const response = await analyticsApi.downloadReport(report.id)
      window.open(response.download_url, '_blank')
    } catch (err) {
      setError('Failed to download report')
      console.error('Download error:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-100">
            <FileText className="text-amber-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
            <p className="text-sm text-gray-500">Generate and download analytics reports</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="w-24 h-4 bg-gray-200 rounded mb-4" />
              <div className="space-y-2">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const reportTypes = [
    { id: 'summary', name: 'Summary Report', description: 'Overview of all metrics' },
    { id: 'revenue', name: 'Revenue Report', description: 'Detailed revenue breakdown' },
    { id: 'bookings', name: 'Bookings Report', description: 'Booking patterns and status' },
    { id: 'traffic', name: 'Traffic Report', description: 'Website traffic analysis' },
  ]

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-100">
            <FileText className="text-amber-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
            <p className="text-sm text-gray-500">Generate and download analytics reports</p>
          </div>
        </div>
        <a
          href="/dashboard/analytics/reports"
          className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-700"
        >
          Full Reports Page
          <ExternalLink size={14} />
        </a>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Quick Downloads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Export Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Export</h3>
          <p className="text-xs text-gray-500 mb-4">
            Download reports for the selected date range
          </p>
          <div className="space-y-2">
            {reportTypes.map(report => (
              <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{report.name}</p>
                  <p className="text-xs text-gray-500">{report.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuickDownload(report.id, 'pdf')}
                    disabled={generating !== null}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generating === `${report.id}-pdf` ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    PDF
                  </button>
                  <button
                    onClick={() => handleQuickDownload(report.id, 'csv')}
                    disabled={generating !== null}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generating === `${report.id}-csv` ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Reports</h3>
          {recentReports && recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.slice(0, 5).map(report => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      report.report_data?.format === 'csv' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <FileText size={16} className={
                        report.report_data?.format === 'csv' ? 'text-green-600' : 'text-red-600'
                      } />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.report_name}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>{formatDate(report.generated_at)}</span>
                        <Clock size={12} />
                        <span>{formatTime(report.generated_at)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadReport(report)}
                    className="p-2 text-gray-500 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <FileText size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No reports generated yet</p>
              <p className="text-xs text-gray-400 mt-1">Use Quick Export to generate your first report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

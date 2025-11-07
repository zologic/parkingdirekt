import React, { useState, useEffect } from 'react'
import { Eye, Download } from 'lucide-react'

interface MonitoringPanelProps {
  environment: string
}

interface LogEntry {
  id: string
  createdAt: string
  admin?: {
    name: string
    email: string
  }
  action: string
  category: string
  target: string
}

export default function MonitoringPanel({ environment }: MonitoringPanelProps) {
  const [activeLogTab, setActiveLogTab] = useState('audit')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    startDate: '',
    endDate: '',
    status: '',
    search: ''
  })

  const logTypes = [
    { id: 'audit', name: 'Audit Logs', description: 'Admin actions and configuration changes' },
    { id: 'email', name: 'Email Logs', description: 'Email delivery status and errors' },
    { id: 'webhooks', name: 'Webhook Logs', description: 'Webhook delivery attempts' },
    { id: 'api', name: 'API Logs', description: 'Rate limiting and API activity' }
  ]

  useEffect(() => {
    fetchLogs()
  }, [activeLogTab, filters, environment])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...filters,
        environment
      })
      const response = await fetch(`/api/admin/monitoring/logs/${activeLogTab}?${params}`)
      const data = await response.json()
      setLogs(data.data.logs || [])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        environment,
        export: 'true'
      })
      const response = await fetch(`/api/admin/monitoring/logs/${activeLogTab}?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeLogTab}-logs-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      alert('Failed to export logs')
    }
  }

  return (
    <div className="space-y-6">
      {/* Log Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {logTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveLogTab(type.id)}
              className={`${
                activeLogTab === type.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {type.name}
              <p className="text-xs text-gray-400">{type.description}</p>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="form-label">Start Date</label>
            <input
              type="datetime-local"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">End Date</label>
            <input
              type="datetime-local"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <div className="flex space-x-2">
            <button
              onClick={fetchLogs}
              className="btn-outline"
            >
              Refresh
            </button>
            <button
              onClick={exportLogs}
              className="btn-outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {logTypes.find(t => t.id === activeLogTab)?.name} ({logs.length})
            </h3>
            <EyeIcon className="h-8 w-8 text-primary-500" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.admin ? (
                          <div>
                            <div className="font-medium">{log.admin.name}</div>
                            <div className="text-gray-500">{log.admin.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.target}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-primary-600 hover:text-primary-900">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {logs.length === 0 && (
                <div className="text-center py-8">
                  <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filters.search || filters.startDate || filters.endDate
                      ? 'Try adjusting your filters.'
                      : 'No logs available for this time period.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
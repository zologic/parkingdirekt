import React, { useState, useEffect } from 'react'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

interface ApiPanelProps {
  environment: string
}

export default function ApiPanel({ environment }: ApiPanelProps) {
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApiSettings()
  }, [environment])

  const fetchApiSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/control-center/api?environment=${environment}`)
      const data = await response.json()
      setSettings(data.data.configs || {})
    } catch (error) {
      console.error('Failed to fetch API settings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading API settings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                API & Rate Limiting Configuration
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Configure API access controls and rate limiting policies.
              </p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-primary-500" />
          </div>

          <div className="mt-6 space-y-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableRateLimiting"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={settings.enableRateLimiting?.value || false}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  enableRateLimiting: { ...prev.enableRateLimiting, value: e.target.checked }
                }))}
              />
              <label htmlFor="enableRateLimiting" className="ml-2 text-sm text-gray-900">
                Enable API rate limiting
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Max Requests per Minute</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="1000"
                  value={settings.maxRequestsPerMinute?.value || 60}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    maxRequestsPerMinute: { ...prev.maxRequestsPerMinute, value: parseInt(e.target.value) || 60 }
                  }))}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum requests allowed per minute
                </p>
              </div>
              <div>
                <label className="form-label">Rate Limiting Mode</label>
                <select
                  className="form-input"
                  value={settings.rateLimitMode?.value || 'per_user'}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    rateLimitMode: { ...prev.rateLimitMode, value: e.target.value }
                  }))}
                >
                  <option value="per_user">Per User</option>
                  <option value="per_ip">Per IP Address</option>
                  <option value="global">Global</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  How rate limits are applied
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button className="btn-primary">Save Settings</button>
          </div>
        </div>
      </div>

      {/* API Keys Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            API Keys Management
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage API keys for external integrations and applications.
          </p>

          <div className="mt-6">
            <button className="btn-outline">Generate New API Key</button>
          </div>

          <div className="mt-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    sk_test_•••••••••••••••••••••••••
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Production API Key
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Jan 15, 2024
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-danger-600 hover:text-danger-900">Revoke</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rate Limiting Stats */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Rate Limiting Statistics
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Monitor API rate limiting activity and violations.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">1,234</div>
              <div className="text-sm text-gray-500">Total Requests (24h)</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-warning-600">23</div>
              <div className="text-sm text-gray-500">Rate Limited</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-success-600">98.1%</div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
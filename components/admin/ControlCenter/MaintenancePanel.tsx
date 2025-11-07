import React, { useState, useEffect } from 'react'
import { Server, Flag } from 'lucide-react'

interface MaintenancePanelProps {
  environment: string
}

interface FeatureFlag {
  key: string
  name: string
  enabled: boolean
  rolloutPercentage: number
  updatedAt: string
}

export default function MaintenancePanel({ environment }: MaintenancePanelProps) {
  const [settings, setSettings] = useState<any>({})
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaintenanceData()
  }, [environment])

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/control-center/platform?environment=${environment}`)
      const data = await response.json()
      setSettings(data.data.configs || {})
      setFeatureFlags(data.data.featureFlags || [])
    } catch (error) {
      console.error('Failed to fetch maintenance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMaintenanceMode = async (enabled: boolean) => {
    try {
      // Update maintenance mode
      setSettings(prev => ({
        ...prev,
        maintenanceMode: { ...prev.maintenanceMode, value: enabled }
      }))
      alert(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      alert('Failed to update maintenance mode')
    }
  }

  const toggleFeatureFlag = async (flagKey: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/features/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagKey, enabled })
      })

      if (response.ok) {
        setFeatureFlags(prev =>
          prev.map(flag =>
            flag.key === flagKey ? { ...flag, enabled } : flag
          )
        )
      } else {
        alert('Failed to toggle feature flag')
      }
    } catch (error) {
      alert('Failed to toggle feature flag')
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading maintenance settings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Maintenance Controls
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage system maintenance mode and emergency controls.
              </p>
            </div>
            <ServerIcon className="h-8 w-8 text-warning-500" />
          </div>

          <div className="mt-6 space-y-6">
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Maintenance Mode</h4>
                <p className="mt-1 text-sm text-yellow-700">
                  {settings.maintenanceMode?.value
                    ? 'System is currently in maintenance mode. Users will see a maintenance page.'
                    : 'System is operating normally.'}
                </p>
              </div>
              <button
                onClick={() => toggleMaintenanceMode(!settings.maintenanceMode?.value)}
                className={`btn ${
                  settings.maintenanceMode?.value ? 'btn-danger' : 'btn-warning'
                }`}
              >
                {settings.maintenanceMode?.value ? 'Disable' : 'Enable'} Maintenance
              </button>
            </div>

            {/* Maintenance Message */}
            <div>
              <label className="form-label">Maintenance Message</label>
              <textarea
                className="form-input"
                rows={3}
                value={settings.maintenanceMessage?.value || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  maintenanceMessage: { ...prev.maintenanceMessage, value: e.target.value }
                }))}
                placeholder="Enter maintenance message to display to users..."
              />
            </div>

            {/* Disable New Registrations */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="disableRegistrations"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={settings.disableNewRegistrations?.value || false}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  disableNewRegistrations: { ...prev.disableNewRegistrations, value: e.target.checked }
                }))}
              />
              <label htmlFor="disableRegistrations" className="ml-2 text-sm text-gray-900">
                Disable new user registrations
              </label>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <button className="btn-outline">Save Settings</button>
            <button className="btn-danger">Emergency Rollback</button>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Feature Flags
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage feature rollouts and experimental features.
              </p>
            </div>
            <FlagIcon className="h-8 w-8 text-primary-500" />
          </div>

          <div className="mt-6">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rollout
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {featureFlags.map((flag) => (
                    <tr key={flag.key}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{flag.name}</div>
                          <div className="text-sm text-gray-500">{flag.key}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleFeatureFlag(flag.key, !flag.enabled)}
                          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                            flag.enabled ? 'bg-primary-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                              flag.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${flag.rolloutPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-900">{flag.rolloutPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(flag.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-900 mr-3">
                          Edit
                        </button>
                        <button className="text-danger-600 hover:text-danger-900">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
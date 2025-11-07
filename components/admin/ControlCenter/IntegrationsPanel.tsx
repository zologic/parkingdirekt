import React, { useState, useEffect } from 'react'
import { Globe, CheckCircle, AlertTriangle, RotateCw } from 'lucide-react'

interface Integration {
  id: string
  name: string
  key: string
  value: string
  isActive: boolean
  description?: string
  updatedAt: string
}

interface IntegrationsPanelProps {
  environment: string
}

export default function IntegrationsPanel({ environment }: IntegrationsPanelProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    fetchIntegrations()
  }, [environment])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/control-center/integrations?environment=${environment}`)
      const data = await response.json()
      setIntegrations(data.data || [])
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const testIntegration = async (service: string) => {
    setTesting(service)
    try {
      const response = await fetch(`/api/admin/integrations/test/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()

      if (result.success) {
        alert('Integration test successful!')
      } else {
        alert(`Integration test failed: ${result.error}`)
      }
    } catch (error) {
      alert('Integration test failed')
    } finally {
      setTesting(null)
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading integrations...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            External Integrations
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage and test external service connections.
          </p>
        </div>

        <ul className="divide-y divide-gray-200">
          {integrations.map((integration) => (
            <li key={integration.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Globe className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        {integration.name.charAt(0).toUpperCase() + integration.name.slice(1)}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {integration.description || integration.key}
                      </p>
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date(integration.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      integration.isActive
                        ? 'bg-success-100 text-success-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integration.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => testIntegration(integration.name)}
                      disabled={testing === integration.name}
                      className="btn-outline btn-sm"
                    >
                      {testing === integration.name ? (
                        <RotateCw className="animate-spin h-4 w-4" />
                      ) : (
                        'Test'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}

          {integrations.length === 0 && (
            <li className="px-4 py-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first external integration.
              </p>
            </li>
          )}
        </ul>
      </div>

      {/* Add Integration Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Integration</h3>
          <form className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Service Name</label>
                <select className="form-input">
                  <option value="">Select a service</option>
                  <option value="stripe">Stripe</option>
                  <option value="mapbox">Mapbox</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="webhook">Webhook</option>
                </select>
              </div>
              <div>
                <label className="form-label">Environment</label>
                <select className="form-input" defaultValue={environment}>
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">API Key / Secret</label>
              <input type="password" className="form-input" placeholder="Enter API key or secret" />
            </div>
            <div>
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Describe this integration..."
              />
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn-primary">
                Add Integration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
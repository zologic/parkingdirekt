import React, { useState, useEffect } from 'react'
import { CurrencyDollarIcon, CreditCardIcon } from '@heroicons/react/outline'

interface FinancialSettings {
  [key: string]: {
    value: any
    type: string
    description: string
  }
}

interface FinancialPanelProps {
  environment: string
}

export default function FinancialPanel({ environment }: FinancialPanelProps) {
  const [settings, setSettings] = useState<FinancialSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchFinancialSettings()
  }, [environment])

  const fetchFinancialSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/control-center/financial?environment=${environment}`)
      const data = await response.json()
      setSettings(data.data.settings || {})
    } catch (error) {
      console.error('Failed to fetch financial settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/control-center/financial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: Object.entries(settings).reduce((acc, [key, config]) => {
            acc[key] = config.value
            return acc
          }, {} as any),
          environment
        })
      })

      if (response.ok) {
        alert('Settings saved successfully!')
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value
      }
    }))
  }

  const renderInput = (key: string, config: any) => {
    switch (config.type) {
      case 'number':
        return (
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={config.value}
            onChange={(e) => updateSetting(key, parseFloat(e.target.value) || 0)}
          />
        )
      case 'boolean':
        return (
          <input
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            checked={config.value}
            onChange={(e) => updateSetting(key, e.target.checked)}
          />
        )
      default:
        return (
          <input
            type="text"
            className="form-input"
            value={config.value}
            onChange={(e) => updateSetting(key, e.target.value)}
          />
        )
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading financial settings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Financial Configuration
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage commission rates, fees, and payment settings.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="h-8 w-8 text-success-500" />
              <CreditCardIcon className="h-8 w-8 text-primary-500" />
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {Object.entries(settings).map(([key, config]) => (
              <div key={key} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="form-label">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center space-x-3">
                    {renderInput(key, config)}
                    {config.type === 'number' && key.includes('Percent') && (
                      <span className="text-sm text-gray-500">%</span>
                    )}
                    {key.includes('currency') || key.includes('amount') && (
                      <span className="text-sm text-gray-500">€</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {Object.keys(settings).length === 0 && (
              <div className="text-center py-8">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No financial settings found</h3>
                <p className="mt-1 text-sm text-gray-500">Financial settings will appear here once configured.</p>
              </div>
            )}
          </div>

          {Object.keys(settings).length > 0 && (
            <div className="mt-8 flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Revenue Preview */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Revenue Calculator</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Preview how commission rates affect revenue distribution.
          </p>

          <div className="mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="form-label">Transaction Amount</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="100.00"
                  defaultValue="100.00"
                />
              </div>
              <div>
                <label className="form-label">Commission Rate</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="10.0"
                  defaultValue={settings.platformCommissionPercent?.value || 10}
                  step="0.1"
                />
              </div>
              <div className="flex items-end">
                <div className="w-full p-4 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">Platform Revenue</div>
                  <div className="text-lg font-medium text-gray-900">
                    €{(100 * ((settings.platformCommissionPercent?.value || 10) / 100)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
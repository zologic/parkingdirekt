import React, { useState, useEffect } from 'react'
import { BarChart3, DollarSign, Users, AlertTriangle } from 'lucide-react'

interface DashboardProps {
  environment: string
}

interface DashboardStats {
  overview: {
    totalBookings: number
    activeBookings: number
    totalRevenue: number
    recentErrors: number
  }
}

export default function Dashboard({ environment }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [environment])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/control-center/monitoring?environment=${environment}`)
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const data = await response.json()
      setStats(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-danger-50 p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-danger-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-danger-800">Error</h3>
            <div className="mt-2 text-sm text-danger-700">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      name: 'Total Bookings',
      value: stats?.overview.totalBookings || 0,
      icon: BarChart3,
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Active Bookings',
      value: stats?.overview.activeBookings || 0,
      icon: Users,
      change: '+5%',
      changeType: 'positive'
    },
    {
      name: 'Total Revenue',
      value: `€${stats?.overview.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      change: '+18%',
      changeType: 'positive'
    },
    {
      name: 'Recent Errors',
      value: stats?.overview.recentErrors || 0,
      icon: AlertTriangle,
      change: '-8%',
      changeType: 'negative'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{stat.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className={`font-medium ${
                  stat.changeType === 'positive' ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-gray-500"> from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button className="relative block w-full p-4 border-2 border-gray-300 rounded-lg hover:border-primary-500 focus:outline-none">
              <span className="absolute inset-0 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </span>
              <span className="sr-only">View Revenue</span>
              <div className="mt-8 text-center">
                <span className="text-sm font-medium text-gray-900">View Revenue Analytics</span>
              </div>
            </button>

            <button className="relative block w-full p-4 border-2 border-gray-300 rounded-lg hover:border-primary-500 focus:outline-none">
              <span className="absolute inset-0 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </span>
              <span className="sr-only">User Management</span>
              <div className="mt-8 text-center">
                <span className="text-sm font-medium text-gray-900">Manage Users</span>
              </div>
            </button>

            <button className="relative block w-full p-4 border-2 border-gray-300 rounded-lg hover:border-primary-500 focus:outline-none">
              <span className="absolute inset-0 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-gray-400" />
              </span>
              <span className="sr-only">System Status</span>
              <div className="mt-8 text-center">
                <span className="text-sm font-medium text-gray-900">Check System Status</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          <div className="mt-5">
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {[1, 2, 3, 4, 5].map((item) => (
                  <li key={item} className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <ChartBarIcon className="h-4 w-4 text-primary-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Configuration update completed
                        </p>
                        <p className="text-sm text-gray-500">
                          {item} hour{item > 1 ? 's' : ''} ago
                        </p>
                      </div>
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                          Success
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">System Health</h3>
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'API Response Time', value: '245ms', status: 'good' },
                { name: 'Database', value: 'Connected', status: 'good' },
                { name: 'Email Service', value: 'Active', status: 'good' },
                { name: 'Redis Cache', value: 'Connected', status: 'warning' },
              ].map((service) => (
                <div key={service.name} className="text-center">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    service.status === 'good' ? 'bg-success-100 text-success-800' :
                    service.status === 'warning' ? 'bg-warning-100 text-warning-800' :
                    'bg-danger-100 text-danger-800'
                  }`}>
                    {service.name}
                  </div>
                  <div className="mt-1 text-sm text-gray-900">{service.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
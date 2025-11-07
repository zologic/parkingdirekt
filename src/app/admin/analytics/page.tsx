'use client'

import { useState, useEffect } from 'react'
import { requireRole } from '@/lib/role-utils'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface AnalyticsData {
  overview: {
    totalUsers: number
    totalSpaces: number
    totalBookings: number
    activeBookings: number
    totalRevenue: number
    monthlyRevenue: number
    newUsersThisMonth: number
    newSpacesThisMonth: number
  }
  userGrowth: Array<{ date: string; count: number }>
  bookingTrends: Array<any>
  revenueTrends: Array<{ date: string; revenue: number }>
  topSpaces: Array<any>
  userDemographics: Array<{ role: string; _count: number }>
  recentActivity: {
    bookings: Array<any>
    reviews: Array<any>
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const StatCard = ({ title, value, change, icon }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            {icon}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-lg font-semibold text-gray-900">
              {typeof value === 'number' && value > 1000
                ? `${(value / 1000).toFixed(1)}k`
                : value}
            </dd>
            {change && (
              <dd className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Failed to load analytics data</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Platform performance and insights</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={data.overview.totalUsers}
            change={data.overview.newUsersThisMonth}
            icon="👥"
          />
          <StatCard
            title="Active Spaces"
            value={data.overview.totalSpaces}
            change={data.overview.newSpacesThisMonth}
            icon="🅿️"
          />
          <StatCard
            title="Total Bookings"
            value={data.overview.totalBookings}
            change={data.overview.activeBookings}
            icon="📅"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.overview.totalRevenue)}
            change={data.overview.monthlyRevenue}
            icon="💰"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Growth Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => formatDate(value)}
                  formatter={(value) => [value, 'New Users']}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Trends */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  labelFormatter={(value) => formatDate(value)}
                  formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* User Demographics */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User by Role</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.userDemographics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ role, _count }) => `${role}: ${_count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="_count"
                >
                  {data.userDemographics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performing Spaces */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Spaces</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Space
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Bookings
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Rating
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.topSpaces.slice(0, 5).map((space) => (
                    <tr key={space.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                        {space.title}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {space._count.bookings}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {space.averageRating > 0 ? `${space.averageRating.toFixed(1)}⭐` : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {formatCurrency(space.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
            <div className="space-y-3">
              {data.recentActivity.bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{booking.user?.name}</p>
                    <p className="text-gray-600">{booking.parkingSpace?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${booking.totalPrice}</p>
                    <p className="text-gray-600">{booking.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
            <div className="space-y-3">
              {data.recentActivity.reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{review.reviewer?.name}</p>
                    <p className="text-gray-600">{review.parkingSpace?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {'⭐'.repeat(review.rating)}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
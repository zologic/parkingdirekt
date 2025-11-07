import { requireRole } from '@/lib/role-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
  await requireRole(['ADMIN', 'SUPER_ADMIN'])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Platform management and analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">0</div>
              <p className="text-gray-600">Registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Spaces</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">0</div>
              <p className="text-gray-600">Parking spaces</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">0</div>
              <p className="text-gray-600">All time bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">$0</div>
              <p className="text-gray-600">This month</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Manage platform users</p>
              <a href="/admin/users" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Manage Users
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Space Moderation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Review and approve parking spaces</p>
              <a href="/admin/spaces" className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">
                Moderate Spaces
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">View detailed analytics</p>
              <a href="/admin/analytics" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                View Analytics
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Handle booking disputes</p>
              <a href="/admin/bookings" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                Manage Bookings
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Manage payouts and commissions</p>
              <a href="/admin/financial" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Financial Ops
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Handle customer support</p>
              <a href="/admin/support" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                Support Center
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Platform analytics and insights will appear here</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
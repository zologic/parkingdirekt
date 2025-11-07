import { requireRole } from '@/lib/role-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OwnerDashboard() {
  await requireRole('OWNER')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600">Manage your parking spaces and track earnings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Spaces</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">0</div>
              <p className="text-gray-600">Active parking spaces</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">$0</div>
              <p className="text-gray-600">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">0</div>
              <p className="text-gray-600">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">0</div>
              <p className="text-gray-600">All time</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Parking Spaces</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Add and manage your parking spaces</p>
              <a href="/owner/spaces" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2">
                Manage Spaces
              </a>
              <a href="/owner/spaces/new" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Add New
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">View and manage booking requests</p>
              <a href="/owner/bookings" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                View Bookings
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Track your earnings and payouts</p>
              <a href="/owner/earnings" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                View Earnings
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">No recent bookings</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
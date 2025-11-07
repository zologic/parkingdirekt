import { requireRole } from '@/lib/role-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function UserDashboard() {
  await requireRole('USER')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Dashboard</h1>
          <p className="text-gray-600">Find and manage your parking bookings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Find Parking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Search for available parking spaces near you</p>
              <a href="/search" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Search Now
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">View your current and past bookings</p>
              <a href="/user/bookings" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                View Bookings
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Manage your payment methods</p>
              <a href="/user/payment-methods" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Manage Cards
              </a>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
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
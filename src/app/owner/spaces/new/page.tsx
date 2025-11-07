import { requireRole } from '@/lib/role-utils'
import ParkingSpaceForm from '@/components/parking/parking-space-form'

export default async function NewParkingSpacePage() {
  await requireRole('OWNER')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Parking Space</h1>
          <p className="text-gray-600">List your parking space to start earning money</p>
        </div>
        <ParkingSpaceForm />
      </div>
    </div>
  )
}
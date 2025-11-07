import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { redirect } from 'next/navigation'

export type UserRole = 'OWNER' | 'USER' | 'ADMIN' | 'SUPER_ADMIN'

export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  return session
}

export async function requireRole(requiredRole: UserRole | UserRole[]) {
  const session = await requireAuth()
  const userRole = session.user.role as UserRole

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

  if (!roles.includes(userRole)) {
    redirect('/unauthorized')
  }

  return session
}

export function hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return roles.includes(userRole)
}

export function canAccessResource(userRole: UserRole, resource: string): boolean {
  const permissions = {
    OWNER: [
      'parking-spaces.create',
      'parking-spaces.update',
      'parking-spaces.delete',
      'bookings.view',
      'earnings.view',
      'qr-codes.generate',
    ],
    USER: [
      'parking-spaces.view',
      'bookings.create',
      'bookings.view',
      'reviews.create',
      'payments.process',
    ],
    ADMIN: [
      'users.view',
      'users.manage',
      'parking-spaces.moderate',
      'bookings.manage',
      'platform.analytics',
      'support.tickets',
    ],
    SUPER_ADMIN: [
      'everything', // Super admin has access to everything
    ],
  }

  if (userRole === 'SUPER_ADMIN') {
    return true
  }

  return permissions[userRole]?.includes(resource) || false
}
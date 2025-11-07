import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
}

/**
 * Middleware to ensure user is authenticated
 */
export function requireAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await getSession({ req })

      if (!session?.user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Add user info to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        id: session.user.id || '',
        email: session.user.email || '',
        name: session.user.name || undefined,
        role: (session.user as any)?.role || 'USER'
      }

      return handler(authenticatedReq, res)

    } catch (error) {
      console.error('Auth middleware error:', error)
      return res.status(500).json({ error: 'Authentication check failed' })
    }
  }
}

/**
 * Middleware to ensure user has Super Admin role
 */
export function requireSuperAdmin(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void) {
  return requireAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required' })
    }

    return handler(req, res)
  })
}

/**
 * Middleware to ensure user has Admin role or higher
 */
export function requireAdmin(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void) {
  return requireAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!req.user || !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    return handler(req, res)
  })
}

/**
 * Get current user from request
 */
export function getCurrentUser(req: NextApiRequest): AuthenticatedRequest['user'] | null {
  return (req as AuthenticatedRequest).user || null
}
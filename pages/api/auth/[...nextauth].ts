import NextAuth from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import { verifyHash } from '@/lib/security/encryption'

const prisma = new PrismaClient()

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // For demo purposes, create a default super admin if none exists
        let user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user && credentials.email === 'admin@parkingdirekt.com') {
          // Create default super admin
          user = await prisma.user.create({
            data: {
              email: 'admin@parkingdirekt.com',
              name: 'Super Admin',
              role: 'SUPER_ADMIN',
              isActive: true
            }
          })
        }

        if (!user || !user.isActive) {
          return null
        }

        // For simplicity, accept any password for the demo admin
        // In production, you'd want proper password verification
        if (credentials.email === 'admin@parkingdirekt.com' && credentials.password === 'admin123') {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        }

        return null
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  debug: process.env.NODE_ENV === 'development'
})
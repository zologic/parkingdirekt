import { User, ParkingSpace, Booking, Review, Payment, Notification } from '@prisma/client'

// Export Prisma types
export type {
  User,
  ParkingSpace,
  Booking,
  Review,
  Payment,
  Notification,
  Availability,
  Commission,
  Message,
  PaymentMethod,
  Subscription,
  ReferralCode,
  Referral
} from '@prisma/client'

// Extended types for API responses
export interface UserWithRelations extends User {
  ownedSpaces?: ParkingSpace[]
  bookings?: Booking[]
  reviewsGiven?: Review[]
  reviewsReceived?: Review[]
}

export interface ParkingSpaceWithRelations extends ParkingSpace {
  owner?: User
  availability?: any[]
  bookings?: Booking[]
  reviews?: Review[]
  _count?: {
    reviews?: number
    bookings?: number
  }
}

export interface BookingWithRelations extends Booking {
  user?: User
  parkingSpace?: ParkingSpace
  payments?: Payment[]
  reviews?: Review[]
}

export interface ReviewWithRelations extends Review {
  reviewer?: User
  reviewee?: User
  parkingSpace?: ParkingSpace
  booking?: Booking
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface CreateParkingSpaceForm {
  title: string
  description: string
  address: string
  latitude: number
  longitude: number
  hourlyRate: number
  dailyRate?: number
  monthlyRate?: number
  spaceType: 'INDOOR' | 'OUTDOOR' | 'GARAGE' | 'DRIVEWAY'
  vehicleTypes: string[]
  sizeDimensions?: string
  accessInstructions?: string
  photos: string[]
}

export interface CreateBookingForm {
  parkingSpaceId: string
  startTime: Date
  endTime: Date
  totalPrice: number
}

export interface ReviewForm {
  bookingId: string
  rating: number
  comment?: string
}

// Search and filter types
export interface SearchFilters {
  location?: string
  latitude?: number
  longitude?: number
  radius?: number
  startDate?: Date
  endDate?: Date
  vehicleType?: string
  spaceType?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price' | 'distance' | 'rating'
  sortOrder?: 'asc' | 'desc'
}

// Map types
export interface MapMarker {
  id: string
  latitude: number
  longitude: number
  title: string
  price: number
  available: boolean
  spaceType: string
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  avatarUrl?: string
}

export interface AuthSession {
  user: AuthUser
  expires: string
}

// Notification types
export interface NotificationData {
  title: string
  message: string
  type: 'booking' | 'payment' | 'review' | 'system'
  userId: string
}

// Commission types
export interface CommissionCalculation {
  bookingAmount: number
  platformCommission: number
  ownerPayout: number
  commissionRate: number
}

// Stripe types
export interface StripePaymentIntent {
  id: string
  amount: number
  currency: string
  status: string
  client_secret: string
}

export interface StripeConnectAccount {
  id: string
  payouts_enabled: boolean
  charges_enabled: boolean
}
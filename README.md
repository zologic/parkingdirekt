# ParkingDirekt 🅿️

A comprehensive parking space rental platform that connects parking space owners with users looking for convenient parking solutions. Built with Next.js 14, TypeScript, and modern web technologies.

## 🌟 Features

### Core Functionality
- **User Authentication & Role Management** - Secure login system with role-based access (Owner, User, Admin)
- **Parking Space Management** - List, manage, and monetize parking spaces with dynamic pricing
- **Booking System** - Real-time booking with conflict detection and QR code verification
- **Payment Integration** - Secure payments via Stripe Connect with commission management
- **Interactive Maps** - Location-based search using Mapbox integration
- **Review & Rating System** - Build trust through community reviews
- **QR Code Verification** - Secure check-in/check-out process
- **Real-time Notifications** - Keep users informed about bookings and updates

### Advanced Features
- **Dynamic Pricing** - AI-powered pricing optimization
- **Commission Management** - Automated payouts and revenue tracking
- **Analytics Dashboard** - Comprehensive platform insights for admins
- **Mobile Responsive** - PWA-ready for mobile users
- **Multi-language Support** - Internationalization ready

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL with Prisma
- **Authentication**: NextAuth.js with OAuth providers
- **Payments**: Stripe & Stripe Connect
- **Maps**: Mapbox GL JS
- **Deployment**: Docker, Nginx, PM2
- **Styling**: Tailwind CSS

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis (optional, for caching)
- Docker & Docker Compose (for containerized deployment)

## 🚀 Quick Start

### Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/parkingirekt.git
   cd parkingirekt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to see the application.

### Docker Development

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

## 📦 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/parkingirekt"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_CLIENT_ID="ca_..."

# Mapbox
MAPBOX_ACCESS_TOKEN="your-mapbox-token"

# Cloudinary (for images)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## 🏢 Production Deployment

### Option 1: Ubuntu VPS Deployment

1. **Server Requirements**
   - Ubuntu 20.04+ or 22.04+
   - 2GB+ RAM
   - 20GB+ storage
   - Node.js 18+
   - PostgreSQL 12+
   - Nginx

2. **Automated Deployment**
   ```bash
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

3. **Manual Deployment Steps**
   - Clone repository to `/var/www/parkingirekt`
   - Install dependencies: `npm ci --production`
   - Build application: `npm run build`
   - Run migrations: `npx prisma migrate deploy`
   - Start with PM2: `pm2 start ecosystem.config.js`
   - Configure Nginx reverse proxy

### Option 2: Docker Deployment

1. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

3. **Run database migrations**
   ```bash
   docker-compose exec app npx prisma migrate deploy
   ```

### SSL Certificate Setup

1. **Install Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain SSL certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Set up auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

## 📊 Database Schema

The application uses the following main entities:

- **Users** - Authentication and role management
- **ParkingSpaces** - Space listings with pricing and availability
- **Bookings** - Reservation management
- **Reviews** - Rating and review system
- **Payments** - Transaction processing
- **Notifications** - User notifications
- **Commissions** - Platform revenue tracking

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma studio        # Open database browser
npx prisma migrate dev    # Run migrations in development
npx prisma generate      # Generate Prisma client

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks

# Deployment
npm run pm2:start        # Start with PM2
npm run pm2:restart      # Restart PM2 process
npm run pm2:logs         # View PM2 logs
```

## 🔐 Security Features

- **Authentication** - Secure session management with JWT tokens
- **Authorization** - Role-based access control (RBAC)
- **Input Validation** - Comprehensive validation with Zod
- **SQL Injection Protection** - Parameterized queries via Prisma
- **XSS Protection** - Content Security Policy and input sanitization
- **CSRF Protection** - Built-in NextAuth.js protections
- **Rate Limiting** - API rate limiting to prevent abuse
- **Secure Headers** - Security headers configured in Nginx

## 📈 Monitoring & Logging

- **Application Logs** - Structured logging with PM2
- **Access Logs** - Nginx access logs
- **Error Tracking** - Comprehensive error handling
- **Health Checks** - Application health monitoring
- **Performance Metrics** - Built-in performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [View Wiki](https://github.com/yourusername/parkingirekt/wiki)
- **Issues**: [Report Issues](https://github.com/yourusername/parkingirekt/issues)
- **Discussions**: [Join Discussion](https://github.com/yourusername/parkingirekt/discussions)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database by [Prisma](https://prisma.io/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)
- Payments by [Stripe](https://stripe.com/)
- Maps by [Mapbox](https://mapbox.com/)

---

**ParkingDirekt** - Making parking simple and profitable! 🅿️✨

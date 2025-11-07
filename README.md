# ParkingDirekt Super Admin Control Center

A comprehensive administrative dashboard for managing the ParkingDirekt platform configuration, integrations, and operations.

## 🚀 Features

### 🎛️ Control Center
- **System Configuration**: Dynamic management of platform settings
- **Financial Controls**: Commission rates, fees, and revenue tracking
- **Email Management**: SMTP configuration and delivery monitoring
- **API Controls**: Rate limiting and access management
- **Feature Flags**: Gradual rollouts and A/B testing
- **Monitoring**: Real-time logs and system health metrics

### 🔧 Core Capabilities
- **Multi-Environment Support**: Production, staging, and development environments
- **Audit Trail**: Complete logging of all administrative actions
- **Security**: Role-based access control with encryption
- **Scalability**: Redis-based caching and distributed systems
- **Integrations**: Stripe, Mapbox, SendGrid, and webhooks
- **Real-time Updates**: WebSocket integration for live data

## 📋 Prerequisites

- Node.js 18.17.0 or higher
- PostgreSQL database
- Redis (optional, for rate limiting and caching)
- Environment configuration

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
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
   npx prisma db push
   npx prisma db generate
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔗 Access the Control Center

- **URL**: http://localhost:3000/dashboard/superadmin/control-center
- **Super Admin Email**: admin@parkingdirekt.com
- **Super Admin Password**: admin123

## 📁 Project Structure

```
├── pages/                    # Next.js pages
│   ├── api/admin/           # Admin API routes
│   ├── auth/                # Authentication pages
│   └── dashboard/superadmin/ # Control center UI
├── components/admin/ControlCenter/ # UI components
├── lib/                     # Core utilities
│   ├── config.ts            # Configuration management
│   ├── security/            # Encryption utilities
│   ├── email/               # Email delivery system
│   ├── featureFlags.ts      # Feature flag management
│   ├── rateLimiting.ts      # API rate limiting
│   └── payments/            # Payment processing
├── prisma/                  # Database schema and seeds
└── styles/                  # Global styles
```

## 🔧 Configuration

### Database Setup
```env
DATABASE_URL="postgresql://username:password@localhost:5432/parkingdirekt"
```

### NextAuth Configuration
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### External Integrations
```env
STRIPE_SECRET_KEY="sk_test_..."
MAPBOX_API_KEY="pk_..."
SENDGRID_API_KEY="SG...."
REDIS_URL="redis://localhost:6379"
```

### Email Configuration
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

## 📊 Core Features

### System Configuration
- **Financial Settings**: Commission rates, fees, currency
- **Automation Rules**: Grace periods, overstay multipliers
- **Platform Controls**: Maintenance mode, user registration
- **Email Settings**: SMTP configuration, notification preferences
- **API Settings**: Rate limiting, access controls

### Feature Flag Management
- **Percentage Rollouts**: Gradual feature deployment
- **Targeting Rules**: User-based feature enablement
- **Emergency Controls**: Quick disable/enable features
- **Analytics**: Feature usage tracking

### Monitoring & Logs
- **Audit Trail**: Complete admin action logging
- **System Health**: Performance metrics and uptime
- **Email Delivery**: SMTP and webhook delivery tracking
- **API Activity**: Rate limiting and usage monitoring

## 🔒 Security Features

- **Role-Based Access**: Super Admin and Admin roles
- **Encrypted Storage**: AES-256 encryption for sensitive data
- **Audit Logging**: Complete action trail
- **Rate Limiting**: Configurable API protection
- **Session Management**: Secure NextAuth.js integration

## 💰 Payment Integration

### Stripe Integration
- **Dynamic Commission**: Configurable platform fees
- **Multi-Currency**: Support for multiple currencies
- **Revenue Tracking**: Complete transaction logging
- **Refund Support**: Automated refund processing

### Commission Calculation
```typescript
// Example commission calculation
const commission = await calculatePlatformFee(100.00)
// Returns: { platformFee: 10.00, ownerAmount: 90.00, commissionPercent: 10 }
```

## 🚀 Deployment

### Production Setup
1. **Environment Configuration**: Set production environment variables
2. **Database Migration**: Run migrations in production
3. **Seed Data**: Initialize with production configuration
4. **SSL Certificate**: Configure HTTPS
5. **Monitoring**: Set up logging and monitoring

### Environment Variables
```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-domain.com"
REDIS_URL="redis://..."
```

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run db:push      # Push database schema
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed database with defaults
```

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Prisma**: Type-safe database access
- **Tailwind CSS**: Consistent styling

## 📈 Monitoring

### System Health
- **Uptime Monitoring**: Application availability tracking
- **Performance Metrics**: Response times and error rates
- **Resource Usage**: Memory and CPU monitoring
- **Database Health**: Connection and query performance

### Business Metrics
- **Revenue Tracking**: Platform earnings and commissions
- **User Activity**: Admin actions and system usage
- **Feature Adoption**: Feature flag usage analytics
- **Email Delivery**: Campaign and notification metrics

## 🛠️ API Documentation

### Control Center APIs
- `GET/POST /api/admin/control-center/[category]` - System settings
- `POST /api/admin/integrations/test/[service]` - Test integrations
- `GET /api/admin/monitoring/logs/[type]` - System logs
- `POST /api/admin/features/[action]` - Feature flag management

### Authentication
- All admin routes require Super Admin role
- JWT-based session management
- Secure API access with rate limiting

## 🔧 Maintenance

### Database Maintenance
- Regular backups of user and configuration data
- Log rotation for audit logs
- Performance optimization for large datasets

### System Updates
- Zero-downtime configuration updates
- Feature flag-based gradual rollouts
- Comprehensive testing before deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- **Email**: support@parkingdirekt.com
- **Documentation**: Check the inline code comments
- **Issues**: Create an issue in the repository

## 🔄 Version History

- **v1.0.0**: Initial release with full control center functionality
- Complete system configuration management
- Payment processing integration
- Monitoring and audit capabilities
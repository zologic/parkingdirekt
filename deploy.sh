#!/bin/bash

# ParkingDirekt Deployment Script
# This script deploys the application to an Ubuntu VPS

set -e

echo "🚀 Starting ParkingDirekt deployment..."

# Configuration
APP_NAME="parkingirekt"
APP_DIR="/var/www/parkingirekt"
BACKUP_DIR="/var/backups/parkingirekt"
REPO_URL="https://github.com/yourusername/parkingirekt.git"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root (use sudo)"
fi

# Create backup if app exists
if [ -d "$APP_DIR" ]; then
    log "Creating backup of existing application..."
    mkdir -p "$BACKUP_DIR"
    backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$APP_DIR" "$BACKUP_DIR/$backup_name"
    log "Backup created: $BACKUP_DIR/$backup_name"
fi

# Install dependencies if not exists
log "Checking system dependencies..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    log "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    apt-get install -y nodejs
fi

# Check for PM2
if ! command -v pm2 &> /dev/null; then
    log "Installing PM2..."
    npm install -g pm2
fi

# Check for Nginx
if ! command -v nginx &> /dev/null; then
    log "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    log "Installing PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib
fi

# Create app directory
log "Setting up application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Clone or update repository
if [ -d ".git" ]; then
    log "Updating existing repository..."
    git pull origin main
else
    log "Cloning repository..."
    git clone "$REPO_URL" .
fi

# Install dependencies
log "Installing Node.js dependencies..."
npm ci --production=false

# Build application
log "Building application..."
npm run build

# Install production dependencies
log "Installing production dependencies..."
npm ci --production

# Set up environment variables
log "Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    warning "Environment file created. Please update it with your production values."
fi

# Run database migrations
log "Running database migrations..."
npx prisma migrate deploy
npx prisma generate

# Set up Nginx configuration
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/parkingirekt << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Upload limit
    client_max_body_size 10M;

    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/parkingirekt /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Create logs directory
mkdir -p logs

# Set permissions
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Restart Nginx
systemctl reload nginx

# Stop existing PM2 processes
pm2 stop "$APP_NAME" || true
pm2 delete "$APP_NAME" || true

# Start application with PM2
log "Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save

# Set up PM2 startup script
pm2 startup | tail -n 1 | bash

# Set up log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/parkingirekt << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload $APP_NAME
    endscript
}
EOF

# Health check
log "Performing health check..."
sleep 10

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "✅ Application is running successfully!"
else
    error "❌ Application failed to start. Check logs with: pm2 logs $APP_NAME"
fi

# Display status
echo ""
log "🎉 Deployment completed successfully!"
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Useful commands:"
echo "  View logs: pm2 logs $APP_NAME"
echo "  Restart: pm2 restart $APP_NAME"
echo "  Reload: pm2 reload $APP_NAME"
echo "  Monitor: pm2 monit"
echo ""
echo "Don't forget to:"
echo "1. Update your .env file with production values"
echo "2. Configure SSL certificates with Let's Encrypt"
echo "3. Update your domain DNS to point to this server"
echo "4. Set up database backups"
echo ""
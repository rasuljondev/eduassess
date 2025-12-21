#!/bin/bash

# EduAssess Deployment Script
# This script pulls the latest code from GitHub, builds the application,
# and restarts necessary services.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/eduassess"
BRANCH="${1:-main}"  # Default to main branch, can be overridden
LOG_FILE="$PROJECT_DIR/logs/deploy.log"
DEPLOY_DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Logging function
log() {
    echo -e "${GREEN}[$DEPLOY_DATE]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$DEPLOY_DATE] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$DEPLOY_DATE] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Start deployment
log "Starting deployment for branch: $BRANCH"
cd "$PROJECT_DIR" || error "Failed to change to project directory"

# Check if git repository
if [ ! -d ".git" ]; then
    error "Not a git repository. Please initialize git or clone the repository."
fi

# Fetch latest changes
log "Fetching latest changes from GitHub..."
git fetch origin || error "Failed to fetch from origin"

# Get current commit hash before pull
OLD_COMMIT=$(git rev-parse HEAD)
log "Current commit: $OLD_COMMIT"

# Reset to match remote exactly (deployment always follows GitHub as source of truth)
log "Resetting to origin/$BRANCH..."
git reset --hard "origin/$BRANCH" || error "Failed to reset to origin/$BRANCH"

# Clean untracked files (ensures clean state)
log "Cleaning untracked files..."
git clean -fd || warning "Failed to clean untracked files"

NEW_COMMIT=$(git rev-parse HEAD)
if [ "$OLD_COMMIT" != "$NEW_COMMIT" ]; then
    log "Code updated: $OLD_COMMIT -> $NEW_COMMIT"
else
    log "No new changes detected"
fi

# Install/update frontend dependencies
log "Installing frontend dependencies..."
npm install --production=false || error "Failed to install frontend dependencies"

# Build Telegram bot if needed
if [ -d "telegram-bot" ]; then
    log "Building Telegram bot..."
    cd telegram-bot || error "Failed to enter telegram-bot directory"
    npm install --production=false || error "Failed to install bot dependencies"
    npm run build || error "Failed to build Telegram bot"
    cd "$PROJECT_DIR" || error "Failed to return to project directory"
fi

# Build frontend
log "Building frontend..."
npm run build || error "Failed to build frontend"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    error "Build failed: dist directory not found"
fi

log "Frontend build completed successfully"

# Restart Telegram bot with PM2
if command -v pm2 &> /dev/null; then
    log "Restarting Telegram bot with PM2..."
    pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs || warning "PM2 restart/start failed (bot might not be running)"
    pm2 save || warning "Failed to save PM2 process list"
else
    warning "PM2 not found, skipping bot restart"
fi

# Reload nginx
log "Reloading nginx configuration..."
if sudo nginx -t; then
    sudo systemctl reload nginx || error "Failed to reload nginx"
    log "Nginx reloaded successfully"
else
    error "Nginx configuration test failed"
fi

log "Deployment completed successfully!"
log "========================================="


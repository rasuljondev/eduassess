# Deployment Documentation

## Overview

This document describes the deployment process for the EduAssess platform. The application uses automatic deployment via GitHub Actions, which triggers on every push to the `main` branch.

## Architecture

```
┌─────────────────┐
│   GitHub Repo   │
│  (Private Repo) │
└────────┬────────┘
         │
         │ Push to main
         ▼
┌─────────────────┐
│ GitHub Actions  │
│  (CI/CD Workflow)│
└────────┬────────┘
         │
         │ SSH into VPS
         ▼
┌─────────────────┐
│   VPS Server    │
│  89.169.21.81   │
│                 │
│  ┌───────────┐  │
│  │  Nginx    │  │ ← Serves built frontend (port 443)
│  │ (eduassess.uz)│
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │   PM2     │  │ ← Manages Telegram Bot (port 3001)
│  │  Process  │  │
│  └───────────┘  │
└─────────────────┘
```

## Deployment Flow

1. **Developer pushes code to GitHub** → Triggers GitHub Actions workflow
2. **GitHub Actions SSH into VPS** → Executes `deploy.sh` script
3. **Deploy script performs**:
   - Pulls latest code from GitHub
   - Installs/updates npm dependencies
   - Builds Telegram bot (TypeScript → JavaScript)
   - Builds frontend (React + Vite → static files in `dist/`)
   - Restarts PM2 processes
   - Reloads Nginx configuration

## Initial Setup

### 1. Server Requirements

- Ubuntu/Debian-based Linux server
- Node.js 20+ and npm
- Nginx web server
- PM2 process manager
- Certbot (for SSL certificates)
- Git

### 2. Server Preparation

#### Install Node.js and npm
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Install PM2
```bash
npm install -g pm2
pm2 startup  # Configure PM2 to start on boot
```

#### Install Certbot (for SSL)
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

#### Install Nginx
```bash
sudo apt install -y nginx
```

### 3. Repository Setup

#### Clone the repository
```bash
cd /var/www
sudo git clone git@github.com:rasuljondev/eduassess.git eduassess
cd eduassess
```

#### Set up environment variables
Create a `.env` file in `/var/www/eduassess/`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_ROLE_KEY=your_supabase_service_role_key

# Telegram Bot Configuration
BOT=your_telegram_bot_token
BOT_WEBHOOK_PORT=3001
VITE_BOT_WEBHOOK_URL=https://eduassess.uz/notify
```

**Important**: Never commit `.env` files to Git. They are already in `.gitignore`.

### 4. Nginx Configuration

The Nginx configuration file is located at `/etc/nginx/sites-available/eduassess.uz`.

Key points:
- Serves static files from `/var/www/eduassess/dist`
- Proxies `/notify` requests to Telegram bot (port 3001)
- Handles SPA routing (all routes fallback to `index.html`)
- SSL configuration (added automatically by certbot)

Enable the site:
```bash
sudo ln -sf /etc/nginx/sites-available/eduassess.uz /etc/nginx/sites-enabled/eduassess.uz
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### 5. SSL Certificate Setup

**Note**: DNS records must be pointing to the server IP (89.169.21.81) before obtaining SSL certificate.

Obtain SSL certificate:
```bash
sudo certbot --nginx -d eduassess.uz -d www.eduassess.uz
```

Certbot will:
- Automatically configure Nginx for SSL
- Set up automatic renewal
- Redirect HTTP to HTTPS

Verify auto-renewal:
```bash
sudo certbot renew --dry-run
```

### 6. PM2 Configuration

The PM2 configuration is in `ecosystem.config.js`. Start the Telegram bot:

```bash
cd /var/www/eduassess
pm2 start ecosystem.config.js
pm2 save  # Save process list for auto-restart on reboot
```

### 7. GitHub Secrets Configuration

To enable automatic deployment, configure these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

Required secrets:
- `SSH_HOST`: `89.169.21.81`
- `SSH_USER`: `root`
- `SSH_PRIVATE_KEY`: Content of your existing SSH key file (`D:/Projects/eduassess/keys/eduassess.pem`)
- `SSH_PORT`: `22` (optional, defaults to 22)

**To add the SSH private key:**
1. Open your SSH key file: `D:/Projects/eduassess/keys/eduassess.pem`
2. Copy the entire content (including `-----BEGIN` and `-----END` lines)
3. Paste it into the `SSH_PRIVATE_KEY` secret in GitHub

**Note:** Ensure the corresponding public key is in `/root/.ssh/authorized_keys` on your VPS server. If not, add it using:
```bash
# On Windows, you may need to convert the key format or use the public key file
# Typically the public key file would be eduassess.pem.pub or you can generate it from the private key
```

## Automatic Deployment

### How It Works

1. When code is pushed to the `main` branch, GitHub Actions triggers
2. The workflow SSH into the VPS server
3. Runs `/var/www/eduassess/deploy.sh` script
4. The script:
   - Pulls latest code
   - Installs dependencies
   - Builds the application
   - Restarts services
   - Reloads Nginx

### GitHub Actions Workflow

The workflow file is located at `.github/workflows/deploy.yml`. It:
- Triggers on push to `main`/`master` branches
- Can be manually triggered (workflow_dispatch)
- Uses SSH action to connect to VPS
- Executes the deployment script

### Viewing Deployment Logs

**GitHub Actions logs:**
- Go to repository → Actions tab
- Click on the latest workflow run
- View logs for each step

**Server deployment logs:**
```bash
tail -f /var/www/eduassess/logs/deploy.log
```

**PM2 logs:**
```bash
pm2 logs eduassess-telegram-bot
```

## Manual Deployment

If automatic deployment is not available, you can deploy manually:

```bash
ssh user@89.169.21.81
cd /var/www/eduassess
./deploy.sh main
```

Or step by step:
```bash
cd /var/www/eduassess

# Pull latest code
git pull origin main

# Install dependencies
npm install
cd telegram-bot && npm install && cd ..

# Build bot
cd telegram-bot
npm run build
cd ..

# Build frontend
npm run build

# Restart services
pm2 restart ecosystem.config.js
sudo systemctl reload nginx
```

## Service Management

### PM2 Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs eduassess-telegram-bot

# Restart bot
pm2 restart eduassess-telegram-bot

# Stop bot
pm2 stop eduassess-telegram-bot

# Start bot
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Save current process list
pm2 save
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Renewal

Certbot automatically renews certificates. Check renewal:
```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew

# View certificate info
sudo certbot certificates
```

## Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs** for SSH connection issues
2. **Verify GitHub secrets** are correctly set
3. **Check server logs**: `tail -f /var/www/eduassess/logs/deploy.log`
4. **Verify SSH key** has correct permissions and is authorized on server

### Build Failures

1. **Check Node.js version**: `node --version` (should be 20+)
2. **Clear node_modules and reinstall**:
   ```bash
   cd /var/www/eduassess
   rm -rf node_modules package-lock.json
   npm install
   ```
3. **Check environment variables**: Ensure `.env` file exists and has all required variables

### Nginx Not Serving Files

1. **Check Nginx configuration**: `sudo nginx -t`
2. **Verify dist directory exists**: `ls -la /var/www/eduassess/dist`
3. **Check Nginx error logs**: `sudo tail -f /var/log/nginx/error.log`
4. **Verify file permissions**: 
   ```bash
   sudo chown -R www-data:www-data /var/www/eduassess/dist
   ```

### Telegram Bot Not Running

1. **Check PM2 status**: `pm2 list`
2. **View bot logs**: `pm2 logs eduassess-telegram-bot`
3. **Verify environment variables** in `.env` file
4. **Check if port 3001 is in use**: `sudo netstat -tlnp | grep 3001`
5. **Restart bot**: `pm2 restart ecosystem.config.js`

### SSL Certificate Issues

1. **DNS propagation**: Ensure DNS records point to server IP
2. **Firewall**: Ensure ports 80 and 443 are open
3. **Check certificate expiration**: `sudo certbot certificates`
4. **Renew manually if needed**: `sudo certbot renew`

### Frontend Not Loading

1. **Check if dist directory exists and has files**
2. **Verify Nginx root path** in configuration
3. **Check browser console** for JavaScript errors
4. **Verify environment variables** are set (especially Supabase URLs)
5. **Check Nginx access logs**: `sudo tail -f /var/log/nginx/access.log`

## Rollback Procedure

If a deployment causes issues, you can rollback:

### Quick Rollback (Git)
```bash
cd /var/www/eduassess

# View commit history
git log --oneline -10

# Rollback to previous commit
git reset --hard <previous-commit-hash>
./deploy.sh main
```

### Restore Previous Build
```bash
# If you have backups of dist directory
cd /var/www/eduassess
rm -rf dist
cp -r dist.backup dist
sudo systemctl reload nginx
```

## Monitoring

### Check Application Status

```bash
# Frontend (check if served by Nginx)
curl -I https://eduassess.uz

# Telegram Bot (check if running)
pm2 status

# Check webhook endpoint
curl -X POST https://eduassess.uz/notify \
  -H "Content-Type: application/json" \
  -d '{"login":"test_login","score":{"overall":8.5}}'
```

### Log Locations

- **Deployment logs**: `/var/www/eduassess/logs/deploy.log`
- **PM2 logs**: `~/.pm2/logs/`
- **Nginx access logs**: `/var/log/nginx/access.log`
- **Nginx error logs**: `/var/log/nginx/error.log`

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong SSH keys** - Use ed25519 keys, protect private keys
3. **Keep dependencies updated** - Regularly run `npm audit` and update packages
4. **Firewall configuration** - Only open necessary ports (80, 443, 22)
5. **Regular backups** - Backup database and critical files
6. **Monitor logs** - Regularly check for suspicious activity
7. **SSL/TLS** - Always use HTTPS in production
8. **Environment variables** - Use different credentials for production and development

## File Structure

```
/var/www/eduassess/
├── .env                    # Environment variables (NOT in git)
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions workflow
├── dist/                   # Built frontend (generated by build)
├── ecosystem.config.js     # PM2 configuration
├── deploy.sh               # Deployment script
├── logs/                   # Deployment and PM2 logs
├── src/                    # Frontend source code
├── telegram-bot/           # Telegram bot source code
│   ├── dist/              # Built bot (generated by build)
│   └── index.ts           # Bot entry point
└── package.json           # Frontend dependencies
```

## Support

For issues or questions:
1. Check this documentation first
2. Review logs on server
3. Check GitHub Actions logs
4. Contact the development team

---

**Last Updated**: December 2025
**Server IP**: 89.169.21.81
**Domain**: eduassess.uz


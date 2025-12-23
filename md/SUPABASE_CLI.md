# Supabase CLI Guide for EduAssess Project

Complete guide for using Supabase CLI with this project.

---

## 🔑 Project Credentials (Quick Reference)

**Project Reference ID**: `exnfvzzoxprgrzgkylnl`

**Dashboard URL**: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl

**Access Token Location**: 
- In project: `D:\Projects\exam\.env` (as `SUPABASE_ACCESS_TOKEN`)
- System-wide: `C:\Users\pydev\.supabase\access-token`

**Quick Link Command**:
```bash
cd D:\Projects\exam
supabase link --project-ref exnfvzzoxprgrzgkylnl
```

---

## Installation

### Install Supabase CLI

**Windows**:
```powershell
# Using scoop
scoop install supabase

# Or using npm
npm install -g supabase
```

**Verify installation**:
```bash
supabase --version
```

---

## Project Setup

### 1. Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate. After successful login, an access token is saved to:

**Location**: `C:\Users\{username}\.supabase\access-token`

### 2. Link Project

Navigate to your project directory:
```bash
cd D:\Projects\exam
```

Link to your Supabase project:
```bash
supabase link --project-ref exnfvzzoxprgrzgkylnl
```

**Your project ref**: `exnfvzzoxprgrzgkylnl`

**Dashboard**: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl

**Enter password**: Your Supabase database password (when prompted)

**Configuration saved to**: `D:\Projects\exam\.supabase\`

---

## Database Migrations

### Running SQL Migrations

**Method 1: Direct SQL Execution**

```bash
# Run a migration file
supabase db execute < migration_file.sql

# Example
supabase db execute < new_architecture_migration.sql
```

**Method 2: Using Migration System**

```bash
# Create new migration
supabase migration new architecture_update

# This creates: supabase/migrations/{timestamp}_architecture_update.sql
# Edit the file with your SQL changes

# Apply migrations
supabase db push
```

**Method 3: Remote SQL Editor**

```bash
# Open SQL Editor on Supabase Dashboard
# Copy-paste your SQL and run
```

### Check Migration Status

```bash
# List all migrations
supabase migration list

# Check remote migrations
supabase migration list --db-url postgresql://...
```

---

## Edge Functions

### Deploy Edge Functions (Required)

**⚠️ Important: Make sure you're linked to your project first**:
```bash
cd D:\Projects\exam
supabase link --project-ref exnfvzzoxprgrzgkylnl
```

**Deploy all functions individually**:
```bash
# Deploy each function one by one
supabase functions deploy register-student
supabase functions deploy create-exam-request
supabase functions deploy approve-exam-request
supabase functions deploy start-exam-attempt
supabase functions deploy cleanup-expired-attempts
supabase functions deploy notify-score
```

**Alternative: Deploy all functions at once** (if supported):
```bash
supabase functions deploy
```

**Deploy with environment variables**:
```bash
# Set secrets first
supabase secrets set MY_SECRET=value

# Then deploy functions
supabase functions deploy register-student
```

### View Function Logs

```bash
# Real-time logs for all functions
supabase functions logs

# Logs for specific function
supabase functions logs register-student

# Follow logs (like tail -f)
supabase functions logs --follow
```

### Test Functions Locally

```bash
# Serve functions locally
supabase functions serve

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/register-student' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"surname":"Test","name":"User","phone_number":"+998901234567"}'
```

---

## Environment Variables / Secrets

### Set Secrets (for Edge Functions)

```bash
# Set individual secret
supabase secrets set BOT_WEBHOOK_URL=https://eduassess.uz/notify

# Set multiple secrets from .env file
supabase secrets set --env-file .env.production

# List all secrets (values are hidden)
supabase secrets list
```

### Get Project Configuration

```bash
# Get database connection string
supabase status

# Get project URL and keys
cat .supabase/config.toml
```

---

## Database Management

### Dump Database

```bash
# Full database dump
supabase db dump -f backup.sql

# Schema only
supabase db dump --schema-only -f schema.sql

# Data only
supabase db dump --data-only -f data.sql

# Specific tables
supabase db dump --table global_users --table exam_requests -f specific_tables.sql
```

### Reset Database (⚠️ DESTRUCTIVE)

```bash
# Reset local database
supabase db reset

# Reset remote (requires confirmation)
supabase db reset --linked
```

### Run SQL Query

```bash
# Execute SQL directly
supabase db execute "SELECT * FROM global_users LIMIT 10;"

# From file
supabase db execute < query.sql
```

---

## Project Structure

```
D:\Projects\exam\
├── .supabase/
│   ├── config.toml          # Project configuration
│   └── migrations/          # Local migration history
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── register-student/
│   │   ├── create-exam-request/
│   │   ├── approve-exam-request/
│   │   ├── start-exam-attempt/
│   │   ├── cleanup-expired-attempts/
│   │   └── notify-score/
│   └── migrations/          # Migration files
│       ├── 20241220_create_global_users.sql
│       └── ...
├── mig.sql                  # Main schema (existing)
├── apply_test_schema.sql    # Test schema (existing)
└── SUPABASE_CLI.md          # This file
```

---

## Common Workflows

### 1. Create & Apply New Migration

```bash
# Step 1: Create migration file
supabase migration new add_telegram_linking

# Step 2: Edit file
code supabase/migrations/{timestamp}_add_telegram_linking.sql

# Step 3: Add your SQL
# ALTER TABLE global_users ADD COLUMN telegram_linked boolean DEFAULT false;

# Step 4: Apply migration
supabase db push
```

### 2. Deploy Updated Edge Function

```bash
# Step 1: Edit function
code supabase/functions/register-student/index.ts

# Step 2: Test locally
supabase functions serve register-student

# Step 3: Deploy
supabase functions deploy register-student

# Step 4: Check logs
supabase functions logs register-student --follow
```

---

## Credentials Location

### Access Token

**Primary Location** (Project-specific): `D:\Projects\exam\.env`
- Variable name: `SUPABASE_ACCESS_TOKEN`
- Used by: Supabase CLI, Edge Functions
- ⚠️ **NEVER commit .env to Git!**

**System Location** (Global): `C:\Users\pydev\.supabase\access-token`
- Created by: `supabase login`
- Used when no project-specific token exists

---

## Troubleshooting

### Issue: "Project not linked"
```bash
# Check if linked
supabase projects list

# Re-link
supabase link --project-ref exnfvzzoxprgrzgkylnl
```

---

## Useful Commands Reference

| Task | Command |
|------|---------|
| Login | `supabase login` |
| Link project | `supabase link --project-ref exnfvzzoxprgrzgkylnl` |
| Status | `supabase status` |
| Apply migrations | `supabase db push` |
| Deploy all functions | `supabase functions deploy` |
| Set secret | `supabase secrets set KEY=VALUE` |

---

## Next Steps for This Project

### 1. Link Project (if not already linked)
```bash
cd D:\Projects\exam
supabase link --project-ref exnfvzzoxprgrzgkylnl
```

### 2. Apply New Architecture Migration
**Option A: Direct SQL Execution** (Recommended)
```bash
# Run the comprehensive migration file
supabase db execute < migration_new_architecture.sql
```

**Option B: Via Supabase Dashboard**
1. Open: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl/sql/new
2. Copy contents from `migration_new_architecture.sql`
3. Click "Run"

**What this migration does**:
- ✅ Creates `global_users`, `exam_requests`, `exam_attempts` tables
- ✅ Updates `submissions` and `scores` with `user_id` column
- ✅ Removes old `generated_students`, `student_access`, `generation_events`
- ✅ Sets up all RLS policies
- ✅ Creates helper functions and analytics views

### 3. Deploy and test
```bash
# Deploy all functions individually
supabase functions deploy register-student
supabase functions deploy create-exam-request
supabase functions deploy approve-exam-request
supabase functions deploy start-exam-attempt
supabase functions deploy cleanup-expired-attempts
supabase functions deploy notify-score
```

### 4. Set production secrets
```bash
supabase secrets set BOT_WEBHOOK_URL=https://eduassess.uz/notify
supabase secrets set FIXED_PASSWORD=exam2024
```

---

**Last Updated**: December 23, 2024

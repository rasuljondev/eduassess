# EduAssess Platform - Complete Documentation

> Professional Online Assessment Platform for Education Centers

---

## 📑 Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture](#architecture)
3. [User Roles & Access](#user-roles--access)
4. [Complete User Flows](#complete-user-flows)
5. [Database Schema](#database-schema)
6. [API Endpoints (Edge Functions)](#api-endpoints-edge-functions)
7. [Frontend Routes](#frontend-routes)
8. [Telegram Bot](#telegram-bot)
9. [Authentication System](#authentication-system)
10. [Exam Workflow](#exam-workflow)
11. [Features & Functionality](#features--functionality)
12. [Technical Stack](#technical-stack)
13. [Development Guide](#development-guide)

---

## Platform Overview

**EduAssess** is a comprehensive online assessment platform designed for education centers to conduct, manage, and grade exams efficiently. The platform supports multiple exam types (IELTS, SAT, APTIS, Multi-Level) with a modern, user-friendly interface.

### Key Features

- 🎓 **Persistent Student Accounts** - Global accounts across all centers
- 🤖 **Telegram Bot Integration** - Register and view results via Telegram
- ✅ **Approval Workflow** - Admin approval required for exam access
- ⏱️ **Timed Exams** - 6-hour window for exam completion
- 📊 **Comprehensive Grading** - Automated and manual grading with detailed scoring
- 🏢 **Multi-Center Support** - One platform, multiple education centers
- 🌓 **Dark Mode** - Full dark/light theme support
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                        EduAssess Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Students   │  │    Admins    │  │ Super Admins │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         ▼                  ▼                  ▼               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Frontend (React + TypeScript)            │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                       │
│                       ▼                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Supabase Backend (PostgreSQL + Auth)         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │   Database   │  │     Auth     │  │    Edge   │  │   │
│  │  │              │  │              │  │ Functions │  │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                       ▲                                       │
│                       │                                       │
│                       ▼                                       │
│            ┌──────────────────────┐                          │
│            │   Telegram Bot API   │                          │
│            └──────────────────────┘                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Bot-First Registration System

**Philosophy**: Students can register via Telegram Bot or Website, creating persistent accounts that accumulate exam history across all centers.

**Key Concepts**:
- ✅ Self-registration (no admin-generated credentials)
- ✅ Global user accounts (not center-specific)
- ✅ Request → Approval → Access workflow
- ✅ 6-hour exam timer (starts on exam launch)
- ✅ Dual registration paths (Bot + Website)

---

## User Roles & Access

### 1. 👨‍🎓 Students

**Access Level**: Limited
**Login Method**: Login code only (e.g., `student_abc123`)
**Fixed Password**: `exam2024` (internal, not visible to users)

**Capabilities**:
- Register for account (via Bot or Website)
- Request exam access at any center
- Take approved exams
- View exam history and scores
- Link Telegram account for notifications

**Restrictions**:
- Cannot access admin features
- Cannot view other students' data
- Cannot approve own exam requests

### 2. 👨‍💼 Center Admins

**Access Level**: Center-specific
**Login Method**: Email + Password

**Capabilities**:
- View pending exam requests for their center
- Approve/reject exam requests
- Create and manage tests
- Add questions to tests
- Grade submissions
- View submissions for their center
- Publish scores

**Restrictions**:
- Cannot access other centers' data
- Cannot create new centers
- Cannot manage other admins

### 3. 👑 Super Admins

**Access Level**: Platform-wide
**Login Method**: Email + Password

**Capabilities**:
- All Center Admin capabilities (for all centers)
- Create and manage education centers
- Create and assign Center Admins
- View platform-wide analytics
- Access all data across all centers
- Manage system configuration

---

## Complete User Flows

### Flow 1: Student Registration via Telegram Bot

```
1. Student opens Telegram → searches for @EduAssessBot
2. Sends /start command
3. Bot: "Welcome! Send your info: Surname Name PhoneNumber"
4. Student: "Karimov Javohir +998901234567"
5. Bot creates account, returns: "Login: student_abc12, Password: exam2024"
6. Student saves credentials
```

### Flow 2: Student Registration via Website

```
1. Student visits eduassess.uz/student
2. Clicks "Register" tab
3. Fills form: Surname, Name, Phone Number
4. Clicks "Create Account"
5. System displays: "Login: student_abc12, Password: exam2024"
6. Auto-login after 2 seconds
7. Dashboard loads with Telegram connection prompt
```

### Flow 3: Linking Telegram to Website Account

```
1. Student registered via website (no Telegram linked)
2. Logs into eduassess.uz/student
3. Sees banner: "Connect your Telegram"
4. Clicks button → Modal shows: "Send this to @EduAssessBot:"
   "Karimov Javohir +998901234567"
5. Student copies, sends to bot
6. Bot: "Account found and linked! Use /results to view scores."
```

### Flow 4: Student Requests Exam Access

```
1. Student logs into eduassess.uz/student
2. Navigates to center page: eduassess.uz/lsl
3. Views available exams (IELTS, SAT, etc.)
4. Clicks "Register" button on IELTS exam
5. Request created with status='pending'
6. Button changes to "Pending Approval"
```

### Flow 5: Admin Approves Exam Request

```
1. Admin logs into eduassess.uz/login
2. Navigates to /admin/approvals
3. Sees list of pending requests with student info
4. Clicks "Approve" for Karimov Javohir - IELTS
5. System creates exam_attempt with status='ready'
6. (Optional) Student receives Telegram notification
```

### Flow 6: Student Takes Exam

```
1. Student visits eduassess.uz/lsl
2. Sees "START TEST" button (green)
3. Clicks button
4. Redirected to eduassess.uz/lsl/exam/[attempt-id]
5. Timer starts: 6 hours countdown
6. Student answers questions
7. Clicks "Submit"
8. Enters full name (confirmation)
9. Status changes to 'submitted'
10. Redirected to student portal
```

### Flow 7: Admin Grades Exam

```
1. Admin logs in, goes to /admin/submissions
2. Sees list of submitted exams
3. Clicks on Karimov Javohir's IELTS submission
4. Reviews answers
5. Enters scores for each section
6. Clicks "Publish Score"
7. Score becomes visible to student
```

### Flow 8: Student Views Results

```
Via Website:
1. Student logs into eduassess.uz/student
2. Dashboard shows exam history table
3. Score displayed in "Score" column

Via Telegram:
1. Student sends /results to bot
2. Bot displays:
   "📊 Your Exam Results
    1. 🏫 LSL - IELTS
       Date: Dec 23, 2024
       Status: Completed ✅
       Score: 7.5"
```

---

## Database Schema

### Core Tables

#### `global_users`
Persistent student accounts (replaces old `generated_students`)

```sql
CREATE TABLE global_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login TEXT UNIQUE NOT NULL,           -- e.g., "student_abc123"
  surname TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  telegram_id BIGINT UNIQUE,            -- Telegram user ID
  telegram_username TEXT,               -- Telegram @username
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**: `login`, `telegram_id`, `phone_number`

#### `exam_requests`
Student requests for exam access

```sql
CREATE TABLE exam_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES global_users(id),
  center_id UUID NOT NULL REFERENCES centers(id),
  exam_type exam_type NOT NULL,        -- IELTS, SAT, etc.
  test_id UUID REFERENCES tests(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);
```

**Indexes**: `user_id`, `center_id + status`

#### `exam_attempts`
Active exam sessions with 6-hour timer

```sql
CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES global_users(id),
  exam_request_id UUID NOT NULL REFERENCES exam_requests(id),
  center_id UUID NOT NULL REFERENCES centers(id),
  exam_type exam_type NOT NULL,
  test_id UUID REFERENCES tests(id),
  status TEXT NOT NULL DEFAULT 'ready', -- ready, in_progress, submitted, expired
  started_at TIMESTAMPTZ,               -- When timer starts
  expires_at TIMESTAMPTZ,               -- started_at + 6 hours
  submission_id UUID REFERENCES submissions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**: `user_id`, `status`, `expires_at`

#### `centers`
Education centers

```sql
CREATE TABLE centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,            -- e.g., "lsl", "cambridge"
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tests`
Exam definitions

```sql
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES centers(id),
  name TEXT NOT NULL,
  exam_type exam_type NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `questions`
Questions for each test

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id),
  question_text TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `submissions`
Student exam submissions

```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES global_users(id),         -- NEW
  generated_student_id UUID REFERENCES generated_students(id), -- Legacy
  center_id UUID NOT NULL REFERENCES centers(id),
  exam exam_type NOT NULL,
  student_full_name TEXT NOT NULL,
  phone_number TEXT,
  test_id UUID REFERENCES tests(id),
  answers JSONB NOT NULL,
  is_graded BOOLEAN DEFAULT FALSE,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `scores`
Graded exam scores

```sql
CREATE TABLE scores (
  submission_id UUID PRIMARY KEY REFERENCES submissions(id),
  user_id UUID REFERENCES global_users(id),         -- NEW
  center_id UUID NOT NULL REFERENCES centers(id),
  exam exam_type NOT NULL,
  auto_score JSONB,
  manual_score JSONB,
  final_score JSONB NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `profiles`
Admin/SuperAdmin profiles

```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL,                   -- center_admin, superadmin
  center_id UUID REFERENCES centers(id),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Views

#### `user_exam_history`
Convenient view for student exam history

```sql
CREATE VIEW user_exam_history AS
SELECT 
  ea.id,
  ea.user_id,
  ea.center_id,
  c.name as center_name,
  ea.exam_type,
  ea.status,
  ea.created_at,
  s.id as submission_id,
  sc.final_score,
  sc.is_published
FROM exam_attempts ea
LEFT JOIN centers c ON c.id = ea.center_id
LEFT JOIN submissions s ON s.id = ea.submission_id
LEFT JOIN scores sc ON sc.submission_id = s.id;
```

---

## API Endpoints (Edge Functions)

All Edge Functions are located in `supabase/functions/`

### 1. `register-student`

**Purpose**: Create or link student accounts

**Endpoint**: `POST /functions/v1/register-student`

**Request Body**:
```json
{
  "surname": "Karimov",
  "name": "Javohir",
  "phone_number": "+998901234567",
  "telegram_id": 123456789,        // Optional
  "telegram_username": "javohir_k" // Optional
}
```

**Response**:
```json
{
  "success": true,
  "login": "student_abc123",
  "password": "exam2024",
  "is_new": true,
  "telegram_linked": true,
  "message": "Account created successfully"
}
```

**Logic**:
- Checks for existing account (surname + name + phone)
- If exists with telegram_id: Error "already linked"
- If exists without telegram_id: Links telegram and returns
- If not exists: Creates new account with unique login

### 2. `create-exam-request`

**Purpose**: Student requests exam access

**Endpoint**: `POST /functions/v1/create-exam-request`

**Auth**: Required (JWT)

**Request Body**:
```json
{
  "center_slug": "lsl",
  "exam_type": "IELTS",
  "test_id": "uuid-optional"
}
```

**Response**:
```json
{
  "success": true,
  "request": {
    "id": "uuid",
    "status": "pending",
    "requested_at": "2024-12-23T10:00:00Z"
  },
  "message": "Exam request submitted successfully"
}
```

### 3. `approve-exam-request`

**Purpose**: Admin approves or rejects request

**Endpoint**: `POST /functions/v1/approve-exam-request`

**Auth**: Required (Admin JWT)

**Request Body**:
```json
{
  "request_id": "uuid",
  "action": "approve"  // or "reject"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Exam request approved",
  "attempt": {
    "id": "uuid",
    "status": "ready"
  }
}
```

**Logic** (approve):
- Updates exam_request status → 'approved'
- Creates exam_attempt with status='ready'
- Sets reviewed_at and reviewed_by

### 4. `start-exam-attempt`

**Purpose**: Starts 6-hour exam timer

**Endpoint**: `POST /functions/v1/start-exam-attempt`

**Auth**: Required (Student JWT)

**Request Body**:
```json
{
  "attempt_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Exam started successfully",
  "attempt": {
    "id": "uuid",
    "status": "in_progress",
    "started_at": "2024-12-23T10:00:00Z",
    "expires_at": "2024-12-23T16:00:00Z"
  },
  "questions": [/* array of questions */]
}
```

**Logic**:
- Verifies attempt belongs to user
- Checks status is 'ready'
- Updates: status='in_progress', started_at=now, expires_at=now+6h
- Returns test questions

### 5. `cleanup-expired-attempts`

**Purpose**: Marks expired attempts (cron job)

**Endpoint**: `POST /functions/v1/cleanup-expired-attempts`

**Auth**: Service role key

**Response**:
```json
{
  "success": true,
  "expired_count": 5,
  "timestamp": "2024-12-23T10:00:00Z"
}
```

**Logic**:
- Finds attempts where expires_at < now AND status = 'in_progress'
- Updates status → 'expired'
- Does NOT delete users (accounts persist)

---

## Frontend Routes

### Public Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `LandingPage` | Marketing homepage |
| `/login` | `AdminLoginPage` | Admin/SuperAdmin login (email + password) |
| `/student` | `StudentPortal` | Student login/register + dashboard |
| `/:centerSlug` | `CenterLandingPage` | Center page with exam list |

### Protected Routes (Students)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/:centerSlug/exam/:attemptId` | `ExamShell` | Active exam interface with timer |

### Protected Routes (Center Admins)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin` | `CenterDashboard` | Overview and stats |
| `/admin/approvals` | `ApprovalManagement` | Review exam requests |
| `/admin/tests` | `TestManagement` | Create/edit tests |
| `/admin/tests/:testId/questions` | `QuestionManagement` | Add/edit questions |
| `/admin/submissions` | `SubmissionsManagement` | Grade submissions |

### Protected Routes (Super Admins)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/super/analytics` | `AnalyticsView` | Platform-wide analytics |
| `/super/centers` | `CenterManagementView` | Manage centers and admins |

---

## Telegram Bot

### Bot Commands

#### `/start`
Initiates registration or shows welcome back message

**For New Users**:
```
👋 Welcome to EduAssess! 🎓

To create your account, please send your information in this format:

Surname Name PhoneNumber

📝 Example (copy and edit):
Karimov Javohir +998901234567
```

**For Existing Users**:
```
👋 Welcome back!

Your login: student_abc123

Use /results to view your exam scores.
🌐 Visit: eduassess.uz/student
```

#### `/results`
Shows exam history for linked users

```
📊 Your Exam Results

1. 🏫 LSL - IELTS
   Date: Dec 23, 2024
   Status: Completed ✅
   Score: 7.5

2. 🏫 Cambridge - SAT
   Date: Dec 20, 2024
   Status: Grading in progress ⏳

Visit eduassess.uz/student for detailed results.
```

### Bot Features

1. **Account Registration**
   - User sends: `Surname Name Phone`
   - Bot creates account and returns credentials

2. **Account Linking**
   - Website users can link Telegram later
   - Bot recognizes by surname+name+phone
   - Links telegram_id to existing account

3. **Result Notifications** (Future)
   - When score is published
   - Bot sends notification to student

---

## Authentication System

### Student Authentication

**Method**: Login-only (no password input)
**Fixed Password**: `exam2024` (used internally)

**Flow**:
1. Student enters login: `student_abc123`
2. Frontend calls `authService.login(login)` (no password parameter)
3. Service uses fixed password internally
4. Supabase Auth: `signInWithPassword(email, fixedPassword)`
5. Success → Fetch user from `global_users`

### Admin Authentication

**Method**: Email + Password
**Flow**:
1. Admin enters email and password
2. Frontend calls `authService.login(email, password)`
3. Supabase Auth: `signInWithPassword(email, password)`
4. Success → Fetch profile from `profiles`
5. Redirect based on role

### Auth Service Interface

```typescript
interface AuthService {
  login(login: string, password?: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}
```

---

## Exam Workflow

### Complete Lifecycle

```
1. REGISTRATION
   Student → Register for account
   Status: Active student account
   
2. REQUEST
   Student → Request exam at center
   Status: exam_requests.status = 'pending'
   
3. APPROVAL
   Admin → Approve request
   Status: exam_requests.status = 'approved'
           exam_attempts.status = 'ready'
   
4. START
   Student → Click "START TEST"
   Status: exam_attempts.status = 'in_progress'
           Timer: started_at = now, expires_at = now + 6h
   
5. SUBMIT
   Student → Submit answers
   Status: exam_attempts.status = 'submitted'
           submissions created
   
6. GRADING
   Admin → Grade submission
   Status: submissions.is_graded = true
   
7. PUBLISH
   Admin → Publish score
   Status: scores.is_published = true
   
8. VIEW RESULTS
   Student → View score in dashboard or via bot
```

### Exam Status States

**exam_requests.status**:
- `pending` - Waiting for admin review
- `approved` - Admin approved, exam_attempt created
- `rejected` - Admin rejected

**exam_attempts.status**:
- `ready` - Approved, not started yet
- `in_progress` - Timer running, student taking exam
- `submitted` - Student submitted answers
- `expired` - Time ran out (6 hours)

---

## Features & Functionality

### Student Features

✅ **Self-Registration**
- Via Telegram Bot or Website
- No admin intervention needed

✅ **Persistent Account**
- One account across all centers
- Login never expires

✅ **Exam History**
- View all past exams
- See scores when published
- Track status (pending, completed, etc.)

✅ **Telegram Integration**
- Register via bot
- Link account to receive notifications
- View results via `/results` command

✅ **Multi-Center Access**
- Request exams at any center
- Each center sees their own requests
- Global history visible to student

### Admin Features

✅ **Exam Request Management**
- View pending requests
- Filter by status
- Approve/reject with one click

✅ **Test Management**
- Create tests for any exam type
- Add/edit/delete questions
- Set exam duration

✅ **Grading System**
- View submitted exams
- Auto-grading (future)
- Manual scoring
- Section-by-section grading
- Publish scores to students

✅ **Submissions Dashboard**
- Filter by exam type
- Search by student name
- View submission details

### Super Admin Features

✅ **Center Management**
- Create new centers
- Edit center details
- Upload center logos

✅ **Admin Management**
- Create Center Admin accounts
- Assign admins to centers
- Manage permissions

✅ **Platform Analytics**
- View system-wide statistics
- Monitor exam activity
- Track center performance

### UI/UX Features

✅ **Dark Mode**
- Full dark theme support
- Persisted preference
- Toggle in all pages

✅ **Responsive Design**
- Mobile-friendly
- Tablet-optimized
- Desktop-enhanced

✅ **Modern UI**
- Glassmorphism effects
- Smooth animations
- Beautiful gradients

✅ **Accessibility**
- Keyboard navigation
- ARIA labels
- Screen reader support

---

## Technical Stack

### Frontend

- **Framework**: React 18
- **Language**: TypeScript
- **Routing**: React Router DOM v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Animations**: Framer Motion (optional)

### Backend

- **BaaS**: Supabase
- **Database**: PostgreSQL 15
- **Auth**: Supabase Auth (JWT)
- **Storage**: Supabase Storage
- **Edge Functions**: Deno runtime
- **Real-time**: Supabase Realtime (optional)

### Additional Services

- **Bot**: Telegram Bot API (node-telegram-bot-api)
- **HTTP Client**: Fetch API
- **Environment**: Node.js 18+

---

## Development Guide

### Prerequisites

```bash
# Required
Node.js 18+
npm or yarn
Supabase account
Telegram Bot Token (from @BotFather)

# Optional
Supabase CLI (for local development)
```

### Environment Variables

```env
# Frontend (.env)
VITE_SUPABASE_URL=https://exnfvzzoxprgrzgkylnl.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Telegram Bot (.env)
BOT=your-telegram-bot-token
SUPABASE_URL=https://exnfvzzoxprgrzgkylnl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BOT_WEBHOOK_PORT=3001

# Supabase Edge Functions (secrets)
FIXED_STUDENT_PASSWORD=exam2024
```

### Setup Instructions

```bash
# 1. Clone repository
git clone <repo-url>
cd exam

# 2. Install dependencies
npm install

# 3. Install Telegram Bot dependencies
cd telegram-bot
npm install
cd ..

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 5. Apply database migrations
# Go to Supabase Dashboard → SQL Editor
# Run migration_new_architecture.sql

# 6. Deploy Edge Functions
supabase functions deploy register-student
supabase functions deploy create-exam-request
supabase functions deploy approve-exam-request
supabase functions deploy start-exam-attempt
supabase functions deploy cleanup-expired-attempts

# 7. Set Edge Function secrets
supabase secrets set FIXED_STUDENT_PASSWORD=exam2024

# 8. Start development servers
npm run dev              # Frontend (port 5173)
npm run bot              # Telegram Bot (separate terminal)
```

### Database Migrations

Location: `migration_new_architecture.sql`

**To apply**:
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of migration file
4. Execute SQL

**Migration includes**:
- Create `global_users`, `exam_requests`, `exam_attempts` tables
- Update `submissions` and `scores` tables
- Remove old `generated_students`, `student_access` tables
- Create indexes
- Set up RLS policies
- Create views

### Testing

```bash
# Run tests (if available)
npm test

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

### Deployment

See `SUPABASE_CLI.md` for detailed Supabase CLI usage.

**Frontend Deployment**:
- Build: `npm run build`
- Deploy to Vercel, Netlify, or any static host

**Backend Deployment**:
- Supabase handles database and Edge Functions
- Telegram Bot can run on any Node.js server

**Telegram Bot Deployment**:
- Deploy to VPS, Heroku, Railway, or similar
- Ensure `BOT_WEBHOOK_PORT` is accessible (if using webhooks)

---

## Project Structure

```
exam/
├── src/
│   ├── app/
│   │   ├── layouts/
│   │   │   ├── AdminLayout.tsx
│   │   │   └── StudentLayout.tsx
│   │   └── router.tsx
│   ├── features/
│   │   ├── center-admin/
│   │   │   ├── ApprovalManagement.tsx    # NEW
│   │   │   ├── CenterDashboard.tsx
│   │   │   ├── TestManagement.tsx
│   │   │   ├── QuestionManagement.tsx
│   │   │   └── SubmissionsManagement.tsx
│   │   ├── public/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── AdminLoginPage.tsx        # NEW
│   │   │   └── CenterLandingPage.tsx
│   │   ├── student/
│   │   │   ├── StudentPortal.tsx         # NEW
│   │   │   └── ExamShell.tsx
│   │   ├── super-admin/
│   │   │   ├── AnalyticsView.tsx
│   │   │   └── CenterManagementView.tsx
│   │   └── exams/
│   │       ├── ielts/
│   │       ├── sat/
│   │       └── registry.ts
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── GlobalUserService.ts          # NEW
│   │   ├── ExamRequestService.ts         # NEW
│   │   ├── ExamAttemptService.ts         # NEW
│   │   └── supabase/
│   │       ├── SupabaseAuthService.ts
│   │       ├── SupabaseGlobalUserService.ts    # NEW
│   │       ├── SupabaseExamRequestService.ts   # NEW
│   │       └── SupabaseExamAttemptService.ts   # NEW
│   ├── stores/
│   │   └── auth.store.ts
│   ├── types/
│   │   └── index.ts
│   └── lib/
│       └── supabase.ts
├── supabase/
│   └── functions/
│       ├── register-student/             # NEW
│       ├── create-exam-request/          # NEW
│       ├── approve-exam-request/         # NEW
│       ├── start-exam-attempt/           # NEW
│       └── cleanup-expired-attempts/     # NEW
├── telegram-bot/
│   ├── index.ts                          # UPDATED
│   └── package.json
├── migration_new_architecture.sql        # Database migration
├── PLATFORM_DOCUMENTATION.md             # This file
├── SUPABASE_CLI.md                       # Supabase CLI guide
└── package.json
```

---

## Support & Contact

For technical support or questions:
- 📧 Email: support@eduassess.uz
- 💬 Telegram: @rasuljon_developer
- 🌐 Website: eduassess.uz

---

## License

© 2025 EduAssess. All rights reserved.

---

**Last Updated**: December 23, 2024
**Version**: 2.0.0
**Architecture**: Bot-First Registration & Approval System


# EduAssess Platform - Complete Project Structure

> Comprehensive guide to the project structure, architecture, and how everything works together.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Complete Folder Structure](#complete-folder-structure)
3. [Architecture Overview](#architecture-overview)
4. [Frontend Structure](#frontend-structure)
5. [Backend Structure](#backend-structure)
6. [Database Architecture](#database-architecture)
7. [Service Layer](#service-layer)
8. [Routing System](#routing-system)
9. [State Management](#state-management)
10. [Build & Deployment](#build--deployment)
11. [How It All Works Together](#how-it-all-works-together)

---

## Project Overview

**EduAssess** is a full-stack online assessment platform built with:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Telegram Bot**: Node.js + TypeScript + Express
- **Deployment**: VPS with Nginx + PM2

### Key Features
- 🎓 Persistent global student accounts
- 🤖 Telegram Bot registration and notifications
- ✅ Admin approval workflow for exams
- ⏱️ 6-hour timed exam windows
- 📊 Automated and manual grading
- 🏢 Multi-center support
- 🌓 Dark/Light mode
- 📱 Fully responsive

---

## Complete Folder Structure

```
D:\Projects\exam\
│
├── 📁 src/                          # Frontend React application
│   ├── 📁 app/                      # Application core
│   │   ├── router.tsx               # Main routing configuration
│   │   └── 📁 layouts/              # Layout components
│   │       ├── AdminLayout.tsx      # Admin/SuperAdmin layout
│   │       └── StudentLayout.tsx   # Student exam layout
│   │
│   ├── 📁 features/                 # Feature-based components
│   │   ├── 📁 public/               # Public pages (no auth required)
│   │   │   ├── LandingPage.tsx     # Homepage
│   │   │   ├── AdminLoginPage.tsx  # Admin/SuperAdmin login
│   │   │   └── CenterLandingPage.tsx # Center-specific landing
│   │   │
│   │   ├── 📁 student/              # Student features
│   │   │   ├── StudentPortal.tsx   # Student dashboard & login
│   │   │   └── ExamShell.tsx       # Active exam interface
│   │   │
│   │   ├── 📁 center-admin/         # Center admin features
│   │   │   ├── CenterDashboard.tsx # Admin dashboard
│   │   │   ├── ApprovalManagement.tsx # Exam request approvals
│   │   │   ├── TestManagement.tsx  # Test CRUD
│   │   │   ├── QuestionManagement.tsx # Question CRUD
│   │   │   └── SubmissionsManagement.tsx # Grade submissions
│   │   │
│   │   ├── 📁 super-admin/          # SuperAdmin features
│   │   │   ├── SuperDashboard.tsx  # SuperAdmin dashboard
│   │   │   ├── AnalyticsView.tsx   # Platform analytics
│   │   │   ├── CenterManagementView.tsx # Manage centers
│   │   │   ├── StudentManagementView.tsx # Manage students
│   │   │   └── 📁 components/      # Reusable components
│   │   │       ├── CenterManagement.tsx
│   │   │       └── CenterManagementPanel.tsx
│   │   │
│   │   └── 📁 exams/                # Exam type implementations
│   │       ├── registry.ts          # Exam type registry
│   │       ├── 📁 ielts/            # IELTS exam components
│   │       ├── 📁 sat/               # SAT exam components
│   │       ├── 📁 aptis/            # APTIS exam components
│   │       └── 📁 multi-level/      # Multi-level exam components
│   │
│   ├── 📁 services/                  # Service layer (API abstraction)
│   │   ├── index.ts                 # Service exports
│   │   ├── AuthService.ts           # Authentication interface
│   │   ├── GlobalUserService.ts     # Student account management
│   │   ├── ExamRequestService.ts    # Exam request workflow
│   │   ├── ExamAttemptService.ts    # Active exam sessions
│   │   ├── CenterService.ts         # Center & admin management
│   │   ├── TestService.ts           # Test management
│   │   ├── QuestionService.ts       # Question management
│   │   ├── SubmissionService.ts     # Submission handling
│   │   ├── ScoreService.ts          # Score management
│   │   ├── AnalyticsService.ts      # Analytics data
│   │   ├── NotificationService.ts   # Notifications
│   │   │
│   │   ├── 📁 supabase/              # Supabase implementations
│   │   │   ├── SupabaseAuthService.ts
│   │   │   ├── SupabaseGlobalUserService.ts
│   │   │   ├── SupabaseExamRequestService.ts
│   │   │   ├── SupabaseExamAttemptService.ts
│   │   │   ├── SupabaseCenterService.ts
│   │   │   ├── SupabaseTestService.ts
│   │   │   ├── SupabaseQuestionService.ts
│   │   │   ├── SupabaseSubmissionService.ts
│   │   │   ├── SupabaseScoreService.ts
│   │   │   └── SupabaseAnalyticsService.ts
│   │   │
│   │   └── 📁 mocks/                 # Mock services (testing)
│   │       ├── MockAuthService.ts
│   │       ├── MockCenterService.ts
│   │       └── ...
│   │
│   ├── 📁 stores/                    # Zustand state management
│   │   ├── auth.store.ts            # Authentication state
│   │   ├── notification.store.ts    # Notification state
│   │   └── session.store.ts         # Session state
│   │
│   ├── 📁 types/                     # TypeScript type definitions
│   │   └── index.ts                 # All type exports
│   │
│   ├── 📁 shared/                    # Shared utilities & components
│   │   ├── 📁 ui/                    # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Alert.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ImageUploader.tsx
│   │   │   └── ...
│   │   ├── 📁 hooks/                 # Custom React hooks
│   │   └── 📁 utils/                 # Utility functions
│   │
│   ├── 📁 lib/                       # Library configurations
│   │   └── supabase.ts              # Supabase client setup
│   │
│   ├── App.tsx                       # Root component
│   ├── main.tsx                      # Application entry point
│   └── index.css                     # Global styles
│
├── 📁 supabase/                      # Supabase backend
│   └── 📁 functions/                 # Edge Functions (Deno)
│       ├── register-student/        # Student registration
│       │   └── index.ts
│       ├── create-exam-request/      # Create exam request
│       │   └── index.ts
│       ├── approve-exam-request/     # Admin approval
│       │   └── index.ts
│       ├── start-exam-attempt/      # Start exam session
│       │   └── index.ts
│       ├── cleanup-expired-attempts/ # Mark expired attempts
│       │   └── index.ts
│       └── delete-student/           # Delete student account
│           └── index.ts
│
├── 📁 telegram-bot/                  # Telegram Bot application
│   ├── index.ts                      # Bot entry point
│   ├── package.json                  # Bot dependencies
│   ├── tsconfig.json                 # TypeScript config
│   └── 📁 dist/                      # Compiled JavaScript
│
├── 📁 public/                        # Static assets
│   ├── logo_noback.png
│   └── vite.svg
│
├── 📁 dist/                          # Built frontend (generated)
│   ├── index.html
│   └── 📁 assets/
│
├── 📁 .github/                       # GitHub Actions
│   └── 📁 workflows/
│       └── deploy.yml                # Auto-deployment workflow
│
├── 📄 complete_database_schema.sql   # Complete database schema
├── 📄 DEPLOYMENT.md                  # Deployment documentation
├── 📄 SUPABASE_CLI.md                # Supabase CLI guide
├── 📄 PROJECT_STRUCTURE.md          # This file
│
├── 📄 package.json                   # Frontend dependencies
├── 📄 vite.config.ts                 # Vite configuration
├── 📄 tsconfig.json                  # TypeScript configuration
├── 📄 tailwind.config.js             # Tailwind CSS config
├── 📄 ecosystem.config.cjs          # PM2 configuration
├── 📄 deploy.sh                      # Deployment script
└── 📄 .env                           # Environment variables (not in git)

```

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EduAssess Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Supabase   │    │  Telegram    │  │
│  │   (React)    │◄──►│   Backend    │◄──►│     Bot      │  │
│  │              │    │              │    │              │  │
│  │  - Student   │    │  - PostgreSQL│    │  - Register  │  │
│  │  - Admin     │    │  - Edge Fns  │    │  - Notify    │  │
│  │  - SuperAdmin│    │  - Auth      │    │  - Results   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │   VPS Server   │                       │
│                    │  (Nginx + PM2) │                       │
│                    └────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Registration**:
   - Telegram Bot → Edge Function (`register-student`) → Database
   - Website → Edge Function (`register-student`) → Database

2. **Exam Request**:
   - Student → Frontend → Edge Function (`create-exam-request`) → Database → Admin Notification

3. **Exam Approval**:
   - Admin → Frontend → Edge Function (`approve-exam-request`) → Database → Student Notification

4. **Exam Taking**:
   - Student → Frontend → Edge Function (`start-exam-attempt`) → Database
   - Student → Frontend → Exam Interface → Submission → Database

5. **Grading**:
   - Admin → Frontend → Update Score → Database → Telegram Notification

---

## Frontend Structure

### Component Organization

The frontend follows a **feature-based** architecture:

#### 1. **Public Features** (`src/features/public/`)
- **LandingPage**: Homepage with center links
- **AdminLoginPage**: Email/password login for admins/superadmins
- **CenterLandingPage**: Center-specific page showing available tests

#### 2. **Student Features** (`src/features/student/`)
- **StudentPortal**: 
  - Login/Register interface
  - Dashboard with exam history
  - Telegram linking prompt
- **ExamShell**: 
  - Active exam interface
  - Timer display
  - Question navigation
  - Submission handling

#### 3. **Center Admin Features** (`src/features/center-admin/`)
- **CenterDashboard**: Overview of center activity
- **ApprovalManagement**: Approve/reject exam requests
- **TestManagement**: Create/edit/delete tests
- **QuestionManagement**: Manage questions for tests
- **SubmissionsManagement**: Grade student submissions

#### 4. **SuperAdmin Features** (`src/features/super-admin/`)
- **SuperDashboard**: Platform-wide overview
- **AnalyticsView**: Platform analytics and statistics
- **CenterManagementView**: Manage education centers
- **StudentManagementView**: Manage student accounts

### Layout System

- **AdminLayout**: Sidebar navigation for admin/superadmin pages
- **StudentLayout**: Minimal layout for exam taking interface

### Routing

Routes are defined in `src/app/router.tsx`:

```typescript
/                          → LandingPage
/login                     → AdminLoginPage
/student                   → StudentPortal
/:centerSlug               → CenterLandingPage
/:centerSlug/exam/:attemptId → ExamShell
/admin                     → CenterDashboard
/admin/approvals           → ApprovalManagement
/admin/tests               → TestManagement
/admin/submissions         → SubmissionsManagement
/super/analytics           → AnalyticsView
/super/centers             → CenterManagementView
/super/students            → StudentManagementView
```

---

## Backend Structure

### Supabase Edge Functions

All backend logic runs as **Supabase Edge Functions** (Deno runtime):

#### 1. **register-student**
- **Purpose**: Create or link student accounts
- **Input**: `{ surname, name, phone_number, telegram_id? }`
- **Output**: `{ success, login, is_new? }`
- **Process**:
  1. Validate input
  2. Check if user exists (by phone)
  3. Generate unique login (`name + phone_number`)
  4. Create `auth.users` with fixed password (`12345678`)
  5. Insert into `global_users`
  6. Link Telegram ID if provided

#### 2. **create-exam-request**
- **Purpose**: Student requests access to an exam
- **Input**: `{ center_slug, test_id }`
- **Output**: `{ success, request_id }`
- **Process**:
  1. Verify user authentication
  2. Find center by slug
  3. Check for existing request
  4. Create `exam_request` record
  5. Notify center admins

#### 3. **approve-exam-request**
- **Purpose**: Admin approves exam request
- **Input**: `{ request_id }`
- **Output**: `{ success, attempt_id }`
- **Process**:
  1. Verify admin role
  2. Update `exam_request` status to `approved`
  3. Create `exam_attempt` record
  4. Notify student

#### 4. **start-exam-attempt**
- **Purpose**: Student starts an exam
- **Input**: `{ attempt_id }`
- **Output**: `{ success, expires_at }`
- **Process**:
  1. Verify user owns attempt
  2. Check attempt status
  3. Update status to `in_progress`
  4. Set `started_at` and `expires_at` (6 hours)

#### 5. **cleanup-expired-attempts**
- **Purpose**: Mark expired attempts (cron job)
- **Process**: Find attempts where `expires_at < now()` and status is `in_progress`, set to `expired`

#### 6. **delete-student**
- **Purpose**: SuperAdmin deletes student account
- **Input**: `{ global_user_id }`
- **Process**: Cascading delete of all related data (scores, submissions, attempts, requests, auth user)

---

## Database Architecture

### Core Tables

#### 1. **global_users**
- Persistent student accounts
- Fields: `id`, `login`, `surname`, `name`, `phone_number`, `telegram_id`, `auth_user_id`
- Unique constraints: `login`, `telegram_id`, `auth_user_id`

#### 2. **profiles**
- Admin/SuperAdmin accounts
- Fields: `user_id`, `role`, `center_id`, `full_name`, `telegram_id`
- Roles: `superadmin`, `center_admin`, `student` (legacy)

#### 3. **centers**
- Education centers
- Fields: `id`, `slug`, `name`, `logo_path`, `created_at`

#### 4. **tests**
- Exam tests
- Fields: `id`, `center_id`, `name`, `exam_type`, `description`, `duration_minutes`

#### 5. **questions**
- Test questions
- Fields: `id`, `test_id`, `question_text`, `expected_answer`, `order_num`

#### 6. **exam_requests**
- Student exam requests (pending approval)
- Fields: `id`, `user_id`, `center_id`, `test_id`, `exam_type`, `status`, `requested_at`, `reviewed_at`, `reviewed_by`
- Status: `pending`, `approved`, `rejected`

#### 7. **exam_attempts**
- Active exam sessions
- Fields: `id`, `user_id`, `exam_request_id`, `center_id`, `test_id`, `exam_type`, `status`, `started_at`, `expires_at`, `submission_id`
- Status: `ready`, `in_progress`, `submitted`, `expired`

#### 8. **submissions**
- Student exam submissions
- Fields: `id`, `user_id`, `test_id`, `center_id`, `exam`, `answers`, `is_graded`, `graded_at`, `graded_by`
- Legacy fields: `generated_student_id`, `student_login`, `student_exam`, etc.

#### 9. **scores**
- Graded exam results
- Fields: `submission_id`, `user_id`, `center_id`, `exam`, `auto_score`, `manual_score`, `final_score`, `is_published`, `published_at`

#### 10. **notifications**
- Admin/SuperAdmin notifications
- Fields: `id`, `recipient_user_id`, `type`, `payload`, `is_read`, `created_at`

### Relationships

```
centers
  ├── profiles (center_id)
  ├── tests (center_id)
  └── exam_requests (center_id)

global_users
  ├── exam_requests (user_id)
  ├── exam_attempts (user_id)
  ├── submissions (user_id)
  └── scores (user_id)

tests
  ├── questions (test_id)
  ├── exam_requests (test_id)
  └── exam_attempts (test_id)

exam_requests
  └── exam_attempts (exam_request_id)

exam_attempts
  └── submissions (submission_id)

submissions
  └── scores (submission_id)
```

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- **Students**: Can read/insert their own data
- **Center Admins**: Can read/manage their center's data
- **SuperAdmins**: Full access to all data
- **No client writes**: Certain operations only via Edge Functions

---

## Service Layer

The service layer provides a clean abstraction between components and the database.

### Service Pattern

Each service has:
1. **Interface** (e.g., `AuthService.ts`): TypeScript interface defining methods
2. **Implementation** (e.g., `SupabaseAuthService.ts`): Supabase-specific implementation
3. **Mock** (e.g., `MockAuthService.ts`): For testing

### Key Services

#### **AuthService**
- `login(login: string): Promise<User>` - Student login (fixed password)
- `loginAdmin(email: string, password: string): Promise<User>` - Admin login
- `logout(): Promise<void>`
- `getCurrentUser(): Promise<User | null>`

#### **GlobalUserService**
- `register(data): Promise<User>` - Create student account
- `getCurrentUser(): Promise<User | null>`
- `getUserExamHistory(): Promise<ExamHistory[]>`
- `listAllUsers()` - SuperAdmin only
- `deleteUser(id)` - SuperAdmin only

#### **ExamRequestService**
- `createRequest(centerSlug, testId): Promise<ExamRequest>`
- `getUserRequests(): Promise<ExamRequest[]>`
- `listPendingRequests(centerId): Promise<ExamRequest[]>` - Admin only
- `approveRequest(id): Promise<void>` - Admin only
- `rejectRequest(id): Promise<void>` - Admin only

#### **ExamAttemptService**
- `getUserAttempts(): Promise<ExamAttempt[]>`
- `startAttempt(attemptId): Promise<ExamAttempt>`
- `getAttempt(attemptId): Promise<ExamAttempt>`
- `submitAttempt(attemptId, answers): Promise<void>`

#### **CenterService**
- `getCenterBySlug(slug): Promise<Center>`
- `getAllCenters(): Promise<Center[]>` - SuperAdmin only
- `createCenter(data): Promise<Center>` - SuperAdmin only
- `updateCenter(id, data): Promise<Center>` - SuperAdmin only
- `getCenterAdmins(centerId): Promise<Admin[]>`
- `createCenterAdmin(data): Promise<Admin>` - SuperAdmin only

#### **TestService**
- `getTestsByCenter(centerId): Promise<Test[]>`
- `getTestById(id): Promise<Test>`
- `createTest(data): Promise<Test>` - Admin only
- `updateTest(id, data): Promise<Test>` - Admin only
- `deleteTest(id): Promise<void>` - Admin only

#### **QuestionService**
- `getQuestionsByTest(testId): Promise<Question[]>`
- `createQuestion(data): Promise<Question>` - Admin only
- `updateQuestion(id, data): Promise<Question>` - Admin only
- `deleteQuestion(id): Promise<void>` - Admin only

#### **SubmissionService**
- `submitTest(attemptId, answers): Promise<Submission>` - Deprecated, use ExamAttemptService
- `getSubmissions(centerId): Promise<Submission[]>` - Admin only
- `getSubmissionsWithDetails(centerId): Promise<SubmissionWithDetails[]>` - Admin only

#### **ScoreService**
- `getScoreByLogin(login): Promise<Score | null>`
- `updateScore(submissionId, data): Promise<Score>` - Admin only
- `publishScore(submissionId): Promise<void>` - Admin only
- `notifyTelegramBot(login, score): Promise<void>` - Admin only

#### **AnalyticsService**
- `getCenterStats(centerId?): Promise<Analytics>` - Admin/SuperAdmin only

---

## Routing System

### Route Configuration

Routes are defined in `src/app/router.tsx` using React Router v7.

### Route Guards

- **Public Routes**: No authentication required
  - `/` (LandingPage)
  - `/:centerSlug` (CenterLandingPage)

- **Student Routes**: Student authentication required
  - `/student` (StudentPortal)
  - `/:centerSlug/exam/:attemptId` (ExamShell)

- **Admin Routes**: Center admin authentication required
  - `/admin/*` (All admin pages)

- **SuperAdmin Routes**: SuperAdmin authentication required
  - `/super/*` (All superadmin pages)

### Route Protection

Authentication checks are done in:
- **Layouts**: `AdminLayout` checks user role
- **Components**: Individual components verify permissions
- **Services**: Backend RLS policies enforce access

---

## State Management

### Zustand Stores

#### **auth.store.ts**
- `user: User | null` - Current authenticated user
- `isLoading: boolean` - Loading state
- `login()`, `logout()`, `checkAuth()` - Auth actions

#### **notification.store.ts**
- `notifications: Notification[]` - Notification list
- `unreadCount: number` - Unread count
- `markAsRead()`, `addNotification()` - Notification actions

#### **session.store.ts**
- `session: Session | null` - Supabase session
- Session management utilities

---

## Build & Deployment

### Frontend Build

```bash
npm run build
```

**Process**:
1. Vite bundles React app
2. TypeScript compiles to JavaScript
3. Tailwind CSS processes styles
4. Output: `dist/` directory with static files

### Telegram Bot Build

```bash
cd telegram-bot
npm run build
```

**Process**:
1. TypeScript compiler (`tsc`) compiles to JavaScript
2. Output: `telegram-bot/dist/index.js`

### Deployment Flow

1. **GitHub Push** → Triggers GitHub Actions
2. **GitHub Actions** → SSH into VPS
3. **Deploy Script** (`deploy.sh`):
   - Pull latest code
   - Install dependencies
   - Build frontend (`npm run build`)
   - Build bot (`cd telegram-bot && npm run build`)
   - Restart PM2 (`pm2 restart ecosystem.config.js`)
   - Reload Nginx (`sudo systemctl reload nginx`)

### Production Structure

```
VPS Server (89.169.21.81)
├── /var/www/eduassess/
│   ├── dist/                    # Built frontend (served by Nginx)
│   ├── telegram-bot/
│   │   └── dist/index.js        # Bot process (PM2)
│   └── .env                     # Environment variables
│
├── Nginx Configuration
│   └── /etc/nginx/sites-available/eduassess.uz
│       - Serves /var/www/eduassess/dist
│       - Proxies /notify → localhost:3001
│
└── PM2 Process
    └── eduassess-telegram-bot (port 3001)
```

---

## How It All Works Together

### Student Registration Flow

1. **Via Telegram Bot**:
   ```
   User → /start → Bot asks for info
   User → "Surname Name Phone" → Bot → register-student Edge Function
   Edge Function → Creates auth.users + global_users → Returns login
   Bot → Sends login to user
   ```

2. **Via Website**:
   ```
   User → /student → Fills form → Frontend → register-student Edge Function
   Edge Function → Creates auth.users + global_users → Returns login
   Frontend → Shows login, prompts Telegram linking
   ```

### Exam Request & Approval Flow

1. **Student Requests Exam**:
   ```
   Student → /:centerSlug → Sees available tests
   Student → Clicks "Request" → Frontend → create-exam-request Edge Function
   Edge Function → Creates exam_request (status: pending)
   Edge Function → Creates notification for center admins
   ```

2. **Admin Approves**:
   ```
   Admin → /admin/approvals → Sees pending requests
   Admin → Clicks "Approve" → Frontend → approve-exam-request Edge Function
   Edge Function → Updates exam_request (status: approved)
   Edge Function → Creates exam_attempt (status: ready)
   Edge Function → Creates notification for student
   ```

3. **Student Starts Exam**:
   ```
   Student → /:centerSlug → Sees "START TEST" button
   Student → Clicks button → Frontend → start-exam-attempt Edge Function
   Edge Function → Updates exam_attempt (status: in_progress, expires_at: now + 6h)
   Frontend → Redirects to /:centerSlug/exam/:attemptId
   ```

4. **Student Takes Exam**:
   ```
   Student → ExamShell → Loads questions → Student answers
   Student → Submits → Frontend → ExamAttemptService.submitAttempt()
   Service → Creates submission → Updates exam_attempt (status: submitted)
   ```

5. **Admin Grades**:
   ```
   Admin → /admin/submissions → Sees ungraded submissions
   Admin → Opens submission → Grades manually
   Admin → Saves → Frontend → ScoreService.updateScore()
   Service → Updates score → Publishes → Notifies student via Telegram
   ```

### Authentication Flow

1. **Student Login**:
   ```
   Student → /student → Enters login
   Frontend → AuthService.login(login)
   Service → Supabase signInWithPassword(login, "12345678")
   Supabase → Returns session
   Service → Fetches global_users data
   Frontend → Updates auth.store → Redirects to dashboard
   ```

2. **Admin Login**:
   ```
   Admin → /login → Enters email + password
   Frontend → AuthService.loginAdmin(email, password)
   Service → Supabase signInWithPassword(email, password)
   Supabase → Returns session
   Service → Fetches profiles data
   Frontend → Updates auth.store → Redirects to /admin or /super
   ```

### Telegram Bot Integration

1. **Registration**:
   - Bot receives user info → Calls `register-student` Edge Function
   - Edge Function creates account → Returns login
   - Bot sends login to user

2. **Score Notifications**:
   - Admin publishes score → `ScoreService.notifyTelegramBot()`
   - Service fetches `telegram_id` from `global_users`
   - Service calls bot webhook: `POST /notify`
   - Bot sends score message to user

---

## Key Design Decisions

### 1. **Service Layer Pattern**
- **Why**: Clean separation between UI and data access
- **Benefit**: Easy to swap implementations (Supabase → Firebase, etc.)
- **Benefit**: Easy to mock for testing

### 2. **Edge Functions for Critical Operations**
- **Why**: Security (server-side validation, RLS bypass when needed)
- **Benefit**: Centralized business logic
- **Benefit**: Consistent error handling

### 3. **Fixed Student Password**
- **Why**: Simplified UX (students only need login)
- **Security**: Password stored in `auth.users` but never exposed
- **Implementation**: All students use `12345678` internally

### 4. **Global User Accounts**
- **Why**: Persistent accounts across all centers
- **Benefit**: Single registration, access to multiple centers
- **Benefit**: Unified exam history

### 5. **Approval Workflow**
- **Why**: Admin control over exam access
- **Benefit**: Prevents unauthorized exam taking
- **Benefit**: Allows capacity management

### 6. **6-Hour Exam Window**
- **Why**: Balance between flexibility and security
- **Implementation**: `expires_at` timestamp set when exam starts
- **Enforcement**: Frontend checks expiration, backend RLS enforces

---

## Development Workflow

### Local Development

1. **Start Frontend**:
   ```bash
   npm run dev
   ```
   - Runs Vite dev server on `http://localhost:5173`

2. **Start Telegram Bot**:
   ```bash
   cd telegram-bot
   npm run dev
   ```
   - Runs bot with hot reload

3. **Supabase Local** (optional):
   ```bash
   supabase start
   ```
   - Runs local Supabase instance

### Testing

- **Unit Tests**: Mock services in `src/services/mocks/`
- **Integration Tests**: Test Edge Functions locally
- **E2E Tests**: Test full user flows

### Code Organization Principles

1. **Feature-based**: Group by feature, not by type
2. **Co-location**: Keep related files together
3. **Separation of Concerns**: UI, logic, and data access separated
4. **Type Safety**: Full TypeScript coverage
5. **Reusability**: Shared components in `src/shared/`

---

## Environment Variables

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://exnfvzzoxprgrzgkylnl.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_ROLE_KEY=your_service_role_key
```

### Telegram Bot (`telegram-bot/.env`)
```env
BOT=your_telegram_bot_token
BOT_WEBHOOK_PORT=3001
VITE_BOT_WEBHOOK_URL=https://eduassess.uz/notify
SUPABASE_URL=https://exnfvzzoxprgrzgkylnl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Summary

This project follows modern best practices:
- ✅ **Feature-based architecture** for scalability
- ✅ **Service layer** for clean separation
- ✅ **TypeScript** for type safety
- ✅ **Edge Functions** for secure backend logic
- ✅ **RLS policies** for database security
- ✅ **Component reusability** for maintainability
- ✅ **Automated deployment** for efficiency

The structure is designed to be:
- **Scalable**: Easy to add new features
- **Maintainable**: Clear organization and separation
- **Secure**: RLS, Edge Functions, authentication
- **Type-safe**: Full TypeScript coverage
- **Testable**: Mock services, clear interfaces

---

**Last Updated**: December 2024
**Project**: EduAssess Platform
**Version**: 2.0 (New Architecture)


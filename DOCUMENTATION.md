EduAssess Platform Documentation
==============================

Overview
--------
EduAssess is a professional & universal mock exam platform. It allows education centers to manage tests, questions, and students while providing students with a clean, high-performance testing interface.

System Architecture
-------------------
- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4.
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions).
- **Messaging**: Standalone Node.js Telegram Bot for results & notifications.

Quick Start
-----------
1) Install dependencies:
   - `npm install` (root for frontend)
   - `cd telegram-bot && npm install` (for bot)

2) Environment Setup:
   Create a `.env` file in the root directory:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_SUPABASE_ROLE_KEY=...` (admin only)
   - `BOT=...` (Telegram bot token)
   - `VITE_BOT_WEBHOOK_URL=http://localhost:3001` (for notifications)

3) Database Setup:
   - Run `mig.sql` in Supabase SQL Editor.
   - Run `apply_test_schema.sql` in Supabase SQL Editor.

4) Run services:
   - Frontend: `npm run dev`
   - Bot: `cd telegram-bot && npm run dev`

User Roles & Routing
--------------------
- **SUPER_ADMIN**: Manages centers, analytics, and global settings.
  - Route: `/super/*`
- **CENTER_ADMIN**: Manages tests, questions, and student submissions for their specific center.
  - Route: `/admin/*`
- **STUDENT**: Accesses specific tests via unique center links.
  - Route: `/:centerSlug` (landing page)
  - Route: `/:centerSlug/:testType/:sessionId` (entry page)
  - Route: `/student/exam` (test shell)

Core Features
-------------

### 1. Center-Specific Landing Pages
Every center created by a Super Admin gets its own landing page at `exam.uz/:centerSlug`.
- **Layout**: Two-column layout with center branding (logo, name).
- **Authentication**: One-time login using student credentials.

### 2. Test & Question Management
Center Admins can create and manage their own tests.
- **Tests**: Name, type (IELTS, SAT, etc.), duration, and description.
- **Questions**: Admins can add/edit questions with expected answers.
- **RLS**: Strict Row Level Security ensures admins only see their center's data.

### 3. Student Exam Experience
Students take exams in a "Shell" interface.
- **Questions**: Loaded dynamically based on the test type and center.
- **Submission**: On finish, students enter their name and phone number.
- **Follow-up**: Instructions on how to receive results via Telegram bot are shown.

### 4. Scoring & Notifications
Admins can review student answers and assign a score.
- **Scoring**: Numeric input (0-10) saved as JSON in the database.
- **Publishing**: When marked as "Published", a notification is automatically sent via the Telegram Bot.

Telegram Bot Integration
------------------------
Located in the `telegram-bot/` directory.
- **Features**:
  - Greeting & platform info (`/start`).
  - Score lookup by student login.
  - Automated grading notifications (via webhook from admin UI).
- **Persistence**: Links Telegram chat IDs to student logins in the `telegram_connections` table.
- **Webhook**: Exposes a `POST /notify` endpoint for real-time notifications.

Database Schema (Key Tables)
----------------------------
- `centers`: Organization profiles and slugs.
- `profiles`: User accounts linked to centers and roles.
- `tests`: Exam definitions created by admins.
- `questions`: Questions belonging to specific tests.
- `submissions`: Raw student answers and metadata.
- `scores`: Graded results and publication status.
- `generated_students`: Secure credentials for test-takers.
- `telegram_connections`: Mapping of student logins to Telegram users.

Analytics Logic
---------------
Analytics provide real-time insights into student generation and test usage.
- **History**: Last 7 days of activity grouped by center and test name.
- **Timezone Handling**: Frontend date keys are generated using local time to match database `date_trunc` results, ensuring accurate graph rendering.

Security (RLS Policies)
-----------------------
- **Security Definer**: Helper functions like `is_superadmin()` use security definer to avoid recursive RLS loops.
- **Isolated Access**: Students can only read their own access records and published scores.
- **Role Enforcement**: Center admins are strictly limited to their own `center_id`.

Documentation updated: Dec 20, 2025

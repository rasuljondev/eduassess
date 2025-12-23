# EduAssess Project Files Reference

Quick reference to all important files for this project.

---

## 📋 Planning & Documentation

| File | Purpose | Location |
|------|---------|----------|
| **Plan File** | Complete implementation plan for new architecture | `c:\Users\pydev\.cursor\plans\bot-first_registration_system_e5e0d456.plan.md` |
| **Supabase CLI Guide** | How to use Supabase CLI, credentials, commands | `SUPABASE_CLI.md` |
| **This Reference** | Quick index of all project files | `PROJECT_FILES_REFERENCE.md` |
| **Main Documentation** | System overview and architecture | `DOCUMENTATION.md` |

---

## 🗄️ Database & Migrations

| File | Purpose | When to Use |
|------|---------|-------------|
| **`migration_new_architecture.sql`** | Complete migration to new architecture | Run once to transform system |
| **`mig.sql`** | Original schema (old architecture) | Reference only |
| **`apply_test_schema.sql`** | Test & question management schema | Already applied |

**Apply migration**:
```bash
supabase db execute < migration_new_architecture.sql
```

---

## ⚙️ Configuration Files

| File | Contains | Location |
|------|----------|----------|
| **`.env`** | Environment variables, tokens | `D:\Projects\exam\.env` |
| **`config.toml`** | Supabase project config | `D:\Projects\exam\.supabase\config.toml` |
| **`access-token`** | Supabase auth token | `C:\Users\pydev\.supabase\access-token` |
| **`package.json`** | Frontend dependencies | `D:\Projects\exam\package.json` |

---

## 🔧 Supabase Resources

### Project Details
- **Project ID**: `exnfvzzoxprgrzgkylnl`
- **Dashboard**: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl
- **SQL Editor**: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl/sql/new

### Edge Functions (to be created)
```
supabase/functions/
├── register-student/          # Student registration (Bot + Website)
├── create-exam-request/       # Student requests exam access
├── approve-exam-request/      # Admin approves/rejects
├── start-exam-attempt/        # Begin 6-hour exam timer
└── cleanup-expired-attempts/  # Cron job to mark expired exams
```

### Existing Functions
```
supabase/functions/
├── generate-students/         # ❌ TO BE REMOVED (old system)
└── cleanup-expired-users/     # ❌ TO BE REMOVED (old system)
```

---

## 🎨 Frontend Structure

### Key Components (to be created/updated)

| Component | Path | Purpose |
|-----------|------|---------|
| **StudentPortal** | `src/features/student/StudentPortal.tsx` | Login/Register + Dashboard (NEW) |
| **CenterLandingPage** | `src/features/public/CenterLandingPage.tsx` | Exam list + Registration (UPDATE) |
| **ApprovalManagement** | `src/features/center-admin/ApprovalManagement.tsx` | Admin approval dashboard (NEW) |
| **ExamShell** | `src/features/student/ExamShell.tsx` | Exam interface (UPDATE) |
| **Router** | `src/app/router.tsx` | Route configuration (UPDATE) |

### To Remove
- ❌ `src/features/public/CenterEntryPage.tsx` (replaced by StudentPortal)

### Services (to be created/updated)

| Service | Path | Status |
|---------|------|--------|
| **GlobalUserService** | `src/services/GlobalUserService.ts` | NEW |
| **ExamRequestService** | `src/services/ExamRequestService.ts` | NEW |
| **ExamAttemptService** | `src/services/ExamAttemptService.ts` | NEW |
| **AuthService** | `src/services/AuthService.ts` | UPDATE |
| **SupabaseAuthService** | `src/services/supabase/SupabaseAuthService.ts` | UPDATE |

---

## 🤖 Telegram Bot

| File | Purpose | Status |
|------|---------|--------|
| `telegram-bot/index.ts` | Main bot logic | UPDATE |
| `telegram-bot/package.json` | Bot dependencies | KEEP |

### New Bot Features to Implement
- `/start` with contact sharing
- Data input parsing (Surname Name Phone)
- Account creation/linking
- `/results` command to view scores

---

## 📊 Database Tables

### New Architecture Tables
- ✅ `global_users` - Persistent student accounts
- ✅ `exam_requests` - Registration requests
- ✅ `exam_attempts` - Active exam sessions

### Updated Tables
- ✅ `submissions` - Added `user_id` column
- ✅ `scores` - Added `user_id` column

### Preserved Tables
- ✅ `centers` - Education centers
- ✅ `profiles` - Admin users
- ✅ `tests` - Test definitions
- ✅ `questions` - Test questions
- ✅ `telegram_connections` - Bot connections

### Removed Tables (Old System)
- ❌ `generated_students`
- ❌ `student_access`
- ❌ `generation_events`

---

## 🔐 Authentication Flow

### Old System (Being Removed)
```
Admin generates credentials → Student gets 6h access → Expires
```

### New System
```
Student registers (Bot/Website) → Login available
                                → Request exam at center
                                → Admin approves
                                → 6h timer starts
                                → Take exam
                                → Results in portal
```

---

## 🚀 Implementation Checklist

### Phase 1: Database ✅ (SQL file ready)
- [x] Create `migration_new_architecture.sql`
- [ ] Apply migration to Supabase
- [ ] Verify tables created

### Phase 2: Edge Functions
- [ ] Create `register-student`
- [ ] Create `create-exam-request`
- [ ] Create `approve-exam-request`
- [ ] Create `start-exam-attempt`
- [ ] Update `cleanup-expired-attempts`
- [ ] Remove old functions

### Phase 3: Telegram Bot
- [ ] Update `/start` flow
- [ ] Add contact sharing
- [ ] Implement account linking
- [ ] Add `/results` command

### Phase 4: Frontend
- [ ] Create `StudentPortal` page
- [ ] Update `CenterLandingPage`
- [ ] Create `ApprovalManagement`
- [ ] Update `ExamShell`
- [ ] Update router
- [ ] Remove `CenterEntryPage`

### Phase 5: Services
- [ ] Create `GlobalUserService`
- [ ] Create `ExamRequestService`
- [ ] Create `ExamAttemptService`
- [ ] Update `AuthService`

### Phase 6: Testing
- [ ] Bot registration flow
- [ ] Website registration flow
- [ ] Telegram linking
- [ ] Exam request → Approval → Start
- [ ] Submission flow
- [ ] Results viewing

---

## 📞 Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **React Router**: https://reactrouter.com/
- **Project Dashboard**: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl

---

## 🔄 Common Commands

```bash
# Navigate to project
cd D:\Projects\exam

# Link Supabase project
supabase link --project-ref exnfvzzoxprgrzgkylnl

# Apply migration
supabase db execute < migration_new_architecture.sql

# Deploy Edge Functions
supabase functions deploy

# View logs
supabase functions logs --follow

# Run frontend
npm run dev

# Run Telegram bot
cd telegram-bot && npm run dev
```

---

**Last Updated**: December 23, 2024
**Project**: EduAssess Multi-Tenant Exam Platform
**Architecture**: Bot-First Registration & Approval System


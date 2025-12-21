# Cleanup Expired Users Edge Function

This Edge Function automatically deletes expired test takers (6 hours after creation) while preserving their submissions.

## Setup

1. **Deploy the function:**
   ```bash
   supabase functions deploy cleanup-expired-users
   ```

2. **Set up cron trigger in Supabase Dashboard:**
   - Go to Database > Cron Jobs (or use Supabase CLI)
   - Add a new cron job:
     - Schedule: `0 * * * *` (runs every hour)
     - Function: `cleanup-expired-users`
     - Or use the SQL:
     ```sql
     select cron.schedule(
       'cleanup-expired-users',
       '0 * * * *', -- Every hour
       $$
       select net.http_post(
         url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-users',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
         )
       ) as request_id;
       $$
     );
     ```

## How it works

1. The function calls the database function `cleanup_expired_test_takers()`
2. The database function finds expired users (created > 6 hours ago, not submitted)
3. Before deletion, a trigger backs up student info to submissions table
4. The database function deletes `generated_students` records
5. The Edge Function deletes the corresponding auth users via admin API
6. Submissions are preserved with backup student info

## Manual execution

You can also call this function manually:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-users \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```


# How to Export Database Schema from Supabase

## Method 1: Using Supabase Dashboard (Easiest)

### Step 1: Access Database Schema
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl
2. Navigate to **Database** → **Tables** (left sidebar)
3. You'll see all your tables listed

### Step 2: View Table Structure
- Click on any table to see its columns, indexes, and relationships
- Use the **"View SQL"** button (if available) to see the CREATE TABLE statement

### Step 3: Export Schema via SQL Editor
1. Go to **SQL Editor** in the dashboard
2. Run the queries from `get_schema_from_supabase.sql`
3. Copy the results for each query
4. Save them to compare with `complete_database_schema.sql`

---

## Method 2: Using SQL Queries (Recommended for Complete Export)

### Run in Supabase SQL Editor:

1. **Get all tables and columns:**
   ```sql
   SELECT 
     table_name,
     json_agg(
       json_build_object(
         'column', column_name,
         'type', data_type,
         'nullable', is_nullable,
         'default', column_default
       ) ORDER BY ordinal_position
     ) as columns
   FROM information_schema.columns
   WHERE table_schema = 'public'
   GROUP BY table_name
   ORDER BY table_name;
   ```

2. **Get all indexes:**
   ```sql
   SELECT tablename, indexname, indexdef
   FROM pg_indexes
   WHERE schemaname = 'public'
   ORDER BY tablename, indexname;
   ```

3. **Get all RLS policies:**
   ```sql
   SELECT tablename, policyname, cmd, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```

4. **Get all functions:**
   ```sql
   SELECT proname, pg_get_functiondef(oid) as definition
   FROM pg_proc
   WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
   ORDER BY proname;
   ```

5. **Get all views:**
   ```sql
   SELECT viewname, definition
   FROM pg_views
   WHERE schemaname = 'public'
   ORDER BY viewname;
   ```

---

## Method 3: Using Supabase CLI (If Docker is available)

```bash
# Link to your project
supabase link --project-ref exnfvzzoxprgrzgkylnl

# Dump schema only (no data)
supabase db dump --linked -f schema_export.sql

# Or dump everything
supabase db dump --linked -f full_export.sql
```

**Note:** This requires Docker Desktop to be running.

---

## Method 4: Direct PostgreSQL Connection (Advanced)

If you have the database connection string, you can use `pg_dump`:

```bash
pg_dump -h db.exnfvzzoxprgrzgkylnl.supabase.co \
        -U postgres \
        -d postgres \
        --schema-only \
        --no-owner \
        --no-privileges \
        -f schema_export.sql
```

**Connection string format:**
- Host: `db.exnfvzzoxprgrzgkylnl.supabase.co`
- Database: `postgres`
- User: `postgres`
- Password: (Get from Dashboard → Settings → Database)

---

## Comparison Checklist

After exporting, compare with `complete_database_schema.sql`:

- [ ] All tables present
- [ ] All columns match (name, type, nullable, default)
- [ ] All indexes present
- [ ] All foreign keys present
- [ ] All RLS policies present
- [ ] All functions present
- [ ] All triggers present
- [ ] All views present
- [ ] All enums present

---

## Quick Export Script

I've created `get_schema_from_supabase.sql` with all the queries you need.
Just run it in Supabase SQL Editor and copy the results!


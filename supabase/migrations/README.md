# Database Migrations

This directory contains database migrations for the Civic Watch mobile app.

## Setup Instructions

### 1. Link to your Supabase project

First, you need to link this local project to your remote Supabase project:

```bash
# Replace YOUR_PROJECT_REF with your actual project reference
# You can find this in your Supabase dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Deploy migrations

Once linked, you can deploy the migrations:

```bash
# Deploy all pending migrations
supabase db push

# Or deploy a specific migration
supabase migration up
```

### 3. Alternative: Manual deployment

If you prefer to run the migrations manually:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the content of the migration files
4. Execute them in order

## Migration Files

- `20250609005059_create_notification_tables.sql` - Creates the notification system tables:
  - `user_push_tokens` - Stores device push tokens for users
  - `user_notification_preferences` - Stores user notification preferences
  - `notification_logs` - Logs notification events for analytics

## What these migrations create:

### Tables
- **user_push_tokens**: Stores push notification tokens for each user/device
- **user_notification_preferences**: Stores user's notification preferences
- **notification_logs**: Logs notification events for debugging and analytics

### Security
- Row Level Security (RLS) enabled on all tables
- Policies ensure users can only access their own data
- Proper foreign key constraints and cascading deletes

### Performance
- Indexes on frequently queried columns
- Automatic `updated_at` timestamp updates via triggers

## Development Workflow

### Creating new migrations

```bash
# Create a new migration
supabase migration new migration_name

# Edit the generated file in supabase/migrations/
# Then deploy with:
supabase db push
```

### Rolling back

```bash
# Check migration status
supabase migration list

# Create a rollback migration if needed
supabase migration new rollback_notification_tables
```

## Environment Setup

Make sure your `.env.local` file contains:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

1. **Permission denied**: Make sure you're logged in to Supabase CLI
   ```bash
   supabase login
   ```

2. **Migration fails**: Check the logs and ensure all dependencies exist
   ```bash
   supabase logs
   ```

3. **Table already exists**: The migrations use `IF NOT EXISTS` so they're safe to re-run 
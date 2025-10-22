# Deployment Guides

Deployment instructions, checklists, and migration guides.

## Contents

- **DEPLOY_TRANSCRIPTION_FIX.md** - Transcription system database migration

## Deployment Workflow

1. **Local Testing** - Test all changes locally first
2. **Database Migrations** - Run any required SQL migrations on Supabase
3. **Code Deployment** - Push to GitHub → Auto-deploys to Vercel
4. **Verification** - Test on production (kimbleai.com)

## Important

- Always run database migrations BEFORE deploying code that depends on them
- Test migrations on development database first if possible
- Keep migration files for reference and rollback scenarios

## Related

- `/database/` - Database schema and migration files
- `README.md` - Main project README with deployment info

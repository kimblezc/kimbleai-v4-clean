/**
 * Next.js Instrumentation Hook
 *
 * This file runs once when the Next.js server starts.
 * We use it to initialize cron jobs for Railway deployment.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server side (not in edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initCronJobs } = await import('./lib/cron-scheduler');
    initCronJobs();
  }
}

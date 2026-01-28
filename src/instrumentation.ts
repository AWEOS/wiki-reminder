export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    
    // Start the cron scheduler
    console.log("[Instrumentation] Starting scheduler...");
    startScheduler();
  }
}

const cron = require('node-cron');
const DailyUpdater = require('./automation/daily_update');

const updater = new DailyUpdater();

console.log('Starting AARSH Portal Scheduler...');

// Schedule daily update at 6:00 AM
// This will run every day at 6:00 AM to fetch fresh data from IBBI
cron.schedule('0 6 * * *', async () => {
    console.log('Running scheduled daily update...');
    try {
        const result = await updater.executeDailyUpdate();
        console.log('Scheduled update completed:', result);
    } catch (error) {
        console.error('Scheduled update failed:', error);
    }
}, {
    timezone: "Asia/Kolkata" // Set to Indian timezone
});

// Optional: Run an update every hour during business hours for fresh data
cron.schedule('0 9-18 * * 1-5', async () => {
    console.log('Running mid-day refresh...');
    try {
        const result = await updater.manualUpdate();
        console.log('Mid-day refresh completed:', result);
    } catch (error) {
        console.error('Mid-day refresh failed:', error);
    }
}, {
    timezone: "Asia/Kolkata"
});

console.log('Scheduler is running. Tasks:');
console.log('- Daily update at 6:00 AM IST');
console.log('- Mid-day refreshes 9:00 AM - 6:00 PM IST on weekdays');

// Keep the process alive
process.on('SIGINT', () => {
    console.log('Scheduler shutting down...');
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
const IBBIScraper = require('../scrapers/ibbi_scraper');
const GoogleSheetsIntegration = require('../integrations/google_sheets');
const fs = require('fs').promises;
const path = require('path');

class DailyUpdater {
    constructor() {
        this.scraper = new IBBIScraper();
        this.sheetIntegration = new GoogleSheetsIntegration();
        this.lastRunFile = path.join(__dirname, '../data/last_run.json');
    }

    /**
     * Execute daily update process
     */
    async executeDailyUpdate() {
        console.log('Starting daily update process...');
        
        try {
            // Check if we should run (don't run multiple times in one day)
            if (await this.shouldSkipUpdate()) {
                console.log('Skipping update - already ran today');
                return { skipped: true, reason: 'Already ran today' };
            }

            console.log('Scraping data from IBBI...');
            const scrapedData = await this.scraper.getAllData();
            
            console.log('Formatting data for Google Sheets...');
            const formattedData = this.sheetIntegration.formatForSheets(scrapedData);
            
            console.log('Writing data to Google Sheets...');
            const writeResult = await this.sheetIntegration.writeToSheets(formattedData);
            
            // Update last run timestamp
            await this.updateLastRun();
            
            console.log('Daily update completed successfully!');
            
            return {
                success: true,
                scrapedData: {
                    assignments: scrapedData.assignments.length,
                    announcements: scrapedData.announcements.length,
                    public_announcements: scrapedData.public_announcements.length
                },
                writeResult,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error during daily update:', error.message);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Check if we should skip the update (already ran today)
     */
    async shouldSkipUpdate() {
        try {
            const lastRunData = await fs.readFile(this.lastRunFile, 'utf8');
            const lastRun = JSON.parse(lastRunData);
            
            // Compare dates (not timestamps)
            const today = new Date().toISOString().split('T')[0];
            const lastRunDate = new Date(lastRun.timestamp).toISOString().split('T')[0];
            
            return today === lastRunDate;
        } catch (error) {
            // If file doesn't exist or is invalid, we should run the update
            return false;
        }
    }

    /**
     * Update the last run timestamp
     */
    async updateLastRun() {
        const now = new Date();
        const lastRunData = {
            timestamp: now.toISOString(),
            date: now.toISOString().split('T')[0],
            run_count: await this.getRunCount() + 1
        };
        
        await fs.writeFile(this.lastRunFile, JSON.stringify(lastRunData, null, 2));
    }

    /**
     * Get the number of runs
     */
    async getRunCount() {
        try {
            const lastRunData = await fs.readFile(this.lastRunFile, 'utf8');
            const data = JSON.parse(lastRunData);
            return data.run_count || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get statistics about the data
     */
    async getStatistics() {
        try {
            const stats = {
                lastRun: null,
                totalRuns: 0,
                dataCounts: {
                    assignments: 0,
                    announcements: 0,
                    publicAnnouncements: 0
                }
            };

            // Get last run info
            try {
                const lastRunData = await fs.readFile(this.lastRunFile, 'utf8');
                const lastRun = JSON.parse(lastRunData);
                stats.lastRun = lastRun;
                stats.totalRuns = lastRun.run_count || 0;
            } catch (error) {
                // Ignore errors getting last run info
            }

            // Get data counts from CSV files
            try {
                const csvDir = path.join(__dirname, '../data');
                
                // Count assignments
                try {
                    const assignmentsContent = await fs.readFile(path.join(csvDir, 'assignments.csv'), 'utf8');
                    const assignmentLines = assignmentsContent.trim().split('\n');
                    stats.dataCounts.assignments = assignmentLines.length - 1; // Subtract header
                } catch (e) {}

                // Count announcements
                try {
                    const announcementsContent = await fs.readFile(path.join(csvDir, 'announcements.csv'), 'utf8');
                    const announcementLines = announcementsContent.trim().split('\n');
                    stats.dataCounts.announcements = announcementLines.length - 1; // Subtract header
                } catch (e) {}

                // Count public announcements
                try {
                    const pubAnnouncementsContent = await fs.readFile(path.join(csvDir, 'public_announcements.csv'), 'utf8');
                    const pubAnnouncementLines = pubAnnouncementsContent.trim().split('\n');
                    stats.dataCounts.publicAnnouncements = pubAnnouncementLines.length - 1; // Subtract header
                } catch (e) {}
            } catch (error) {
                console.error('Error getting data counts:', error.message);
            }

            return stats;
        } catch (error) {
            console.error('Error getting statistics:', error.message);
            return null;
        }
    }

    /**
     * Manual trigger for immediate update
     */
    async manualUpdate() {
        console.log('Manual update triggered...');
        
        // Temporarily bypass the daily limit for manual updates
        const originalTimestamp = await this.getLastRunTimestamp();
        await this.clearLastRun();
        
        const result = await this.executeDailyUpdate();
        
        // Restore the original timestamp if the update was successful
        if (result.success && originalTimestamp) {
            // Don't restore timestamp for manual updates to allow future scheduled runs
        }
        
        return result;
    }

    async getLastRunTimestamp() {
        try {
            const lastRunData = await fs.readFile(this.lastRunFile, 'utf8');
            const lastRun = JSON.parse(lastRunData);
            return lastRun.timestamp;
        } catch (error) {
            return null;
        }
    }

    async clearLastRun() {
        try {
            await fs.unlink(this.lastRunFile);
        } catch (error) {
            // Ignore error if file doesn't exist
        }
    }
}

// For testing purposes
if (require.main === module) {
    const updater = new DailyUpdater();
    
    // Check command line arguments for mode
    const args = process.argv.slice(2);
    const mode = args[0] || 'daily';
    
    console.log(`Running in ${mode} mode...`);
    
    if (mode === 'manual') {
        updater.manualUpdate()
            .then(result => console.log('Manual update result:', result))
            .catch(console.error);
    } else if (mode === 'stats') {
        updater.getStatistics()
            .then(stats => console.log('Statistics:', stats))
            .catch(console.error);
    } else {
        updater.executeDailyUpdate()
            .then(result => console.log('Daily update result:', result))
            .catch(console.error);
    }
}

module.exports = DailyUpdater;
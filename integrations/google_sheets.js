const fs = require('fs').promises;
const path = require('path');

/**
 * Google Sheets Integration Module
 * Handles the connection between scraped data and Google Sheets
 */
class GoogleSheetsIntegration {
    constructor(credentialsPath = './credentials/google-credentials.json') {
        this.credentialsPath = credentialsPath;
        this.spreadsheetId = process.env.GOOGLE_SHEET_ID || null;
        this.isConfigured = this.validateConfiguration();
    }

    validateConfiguration() {
        // Check if credentials file exists and has basic structure
        try {
            if (!this.spreadsheetId) {
                console.warn('GOOGLE_SHEET_ID not set in environment variables');
                return false;
            }
            
            // Additional validation can be added here
            return true;
        } catch (error) {
            console.error('Google Sheets configuration validation failed:', error.message);
            return false;
        }
    }

    /**
     * Format scraped data for Google Sheets
     */
    formatForSheets(scrapedData) {
        const formattedData = {
            assignments: [],
            announcements: [],
            public_announcements: []
        };

        // Format assignments data
        scrapedData.assignments.forEach((assignment, index) => {
            formattedData.assignments.push([
                assignment.id || `assignment_${index}`,
                assignment.corporate_debtor || '',
                assignment.resolution_professional || '',
                assignment.date || '',
                assignment.status || 'Pending',
                assignment.form_g_link || '',
                assignment.scraped_at || new Date().toISOString()
            ]);
        });

        // Format announcements data
        scrapedData.announcements.forEach((announcement, index) => {
            formattedData.announcements.push([
                announcement.id || `ann_${index}`,
                announcement.title || '',
                announcement.date || '',
                announcement.link || '',
                announcement.scraped_at || new Date().toISOString()
            ]);
        });

        // Format public announcements data
        scrapedData.public_announcements.forEach((announcement, index) => {
            formattedData.public_announcements.push([
                announcement.id || `pub_ann_${index}`,
                announcement.title || '',
                announcement.date || '',
                announcement.link || '',
                announcement.category || 'Public Announcement',
                announcement.scraped_at || new Date().toISOString()
            ]);
        });

        return formattedData;
    }

    /**
     * Simulate writing data to Google Sheets (will be replaced with actual API calls)
     */
    async writeToSheets(formattedData) {
        if (!this.isConfigured) {
            throw new Error('Google Sheets integration is not properly configured');
        }

        try {
            console.log('Writing data to Google Sheets...');
            
            // This is where the actual Google Sheets API calls would go
            // For now, we'll simulate the operation and save to local CSV files
            await this.writeToSimulatedSheets(formattedData);
            
            console.log('Data successfully written to Google Sheets');
            return { success: true, message: 'Data updated successfully' };
        } catch (error) {
            console.error('Error writing to Google Sheets:', error.message);
            throw error;
        }
    }

    /**
     * Write data to local CSV files as simulation
     */
    async writeToSimulatedSheets(formattedData) {
        const csvDir = path.join(__dirname, '../data');
        await fs.mkdir(csvDir, { recursive: true });

        // Write assignments to CSV
        const assignmentsCsv = this.arrayToCsv([
            ['ID', 'Corporate Debtor', 'Resolution Professional', 'Date', 'Status', 'Form G Link', 'Scraped At'],
            ...formattedData.assignments
        ]);
        await fs.writeFile(path.join(csvDir, 'assignments.csv'), assignmentsCsv);

        // Write announcements to CSV
        const announcementsCsv = this.arrayToCsv([
            ['ID', 'Title', 'Date', 'Link', 'Scraped At'],
            ...formattedData.announcements
        ]);
        await fs.writeFile(path.join(csvDir, 'announcements.csv'), announcementsCsv);

        // Write public announcements to CSV
        const pubAnnouncementsCsv = this.arrayToCsv([
            ['ID', 'Title', 'Date', 'Link', 'Category', 'Scraped At'],
            ...formattedData.public_announcements
        ]);
        await fs.writeFile(path.join(csvDir, 'public_announcements.csv'), pubAnnouncementsCsv);

        console.log(`Simulated Google Sheets update completed. Files saved to ${csvDir}`);
    }

    /**
     * Convert array to CSV format
     */
    arrayToCsv(data) {
        return data.map(row => 
            row.map(field => {
                // Escape commas and quotes in field
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        ).join('\n');
    }

    /**
     * Initialize Google Sheets (create sheets if they don't exist)
     */
    async initializeSheets() {
        try {
            console.log('Initializing Google Sheets structure...');
            
            // In a real implementation, this would create the necessary sheets
            // For simulation, we'll ensure our data directory exists
            const csvDir = path.join(__dirname, '../data');
            await fs.mkdir(csvDir, { recursive: true });
            
            console.log('Google Sheets structure initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing Google Sheets:', error.message);
            throw error;
        }
    }

    /**
     * Get data from Google Sheets
     */
    async getDataFromSheets(sheetName = 'assignments') {
        if (!this.isConfigured) {
            throw new Error('Google Sheets integration is not properly configured');
        }

        try {
            console.log(`Fetching data from Google Sheets: ${sheetName}`);
            
            // This would be the real API call to fetch data
            // For simulation, we'll read from our local CSV
            return await this.getSimulatedData(sheetName);
        } catch (error) {
            console.error(`Error fetching data from Google Sheets (${sheetName}):`, error.message);
            throw error;
        }
    }

    /**
     * Get simulated data from local CSV
     */
    async getSimulatedData(sheetName) {
        const csvDir = path.join(__dirname, '../data');
        const filePath = path.join(csvDir, `${sheetName}.csv`);
        
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return this.csvToArray(fileContent);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, return empty array with headers
                switch (sheetName) {
                    case 'assignments':
                        return [['ID', 'Corporate Debtor', 'Resolution Professional', 'Date', 'Status', 'Form G Link', 'Scraped At']];
                    case 'announcements':
                        return [['ID', 'Title', 'Date', 'Link', 'Scraped At']];
                    case 'public_announcements':
                        return [['ID', 'Title', 'Date', 'Link', 'Category', 'Scraped At']];
                    default:
                        return [];
                }
            }
            throw error;
        }
    }

    /**
     * Convert CSV to array
     */
    csvToArray(csvString) {
        const lines = csvString.trim().split('\n');
        return lines.map(line => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            
            result.push(current);
            return result;
        });
    }
}

module.exports = GoogleSheetsIntegration;
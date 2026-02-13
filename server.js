const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;
const DailyUpdater = require('./automation/daily_update');

const app = express();
const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflicts

// Enable CORS and JSON support
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize daily updater
const dailyUpdater = new DailyUpdater();

// API Endpoint to fetch Google Sheet data
// Using a default fallback if the original sheet URL doesn't exist
const GOOGLE_SHEET_URL = process.env.ORIGINAL_SHEET_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRHRnSQ3EIUJGA-opJiNdMmenO5FKEyPHL2KAEgCVlZL8mDPD4ANZilUvIknefMXjt5iWfS7OAsE2fT/pub?output=csv';

// Endpoint to fetch data from Google Sheets
app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get(GOOGLE_SHEET_URL);
        const csvData = response.data;

        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                res.json(results.data);
            },
            error: (err) => {
                console.error('CSV Parse Error:', err);
                // Return empty array if parsing fails
                res.json([]);
            }
        });
    } catch (error) {
        console.error('Fetch Error:', error.message);
        // Return empty array if fetching fails
        res.json([]);
    }
});

// NEW: Endpoint to fetch scraped IBBI data
app.get('/api/ibbi-data', async (req, res) => {
    try {
        // Try to read from our local CSV files (simulated Google Sheets)
        const csvDir = path.join(__dirname, 'data');
        const assignmentsPath = path.join(csvDir, 'assignments.csv');
        const announcementsPath = path.join(csvDir, 'announcements.csv');
        const pubAnnouncementsPath = path.join(csvDir, 'public_announcements.csv');

        let assignments = [];
        let announcements = [];
        let publicAnnouncements = [];

        // Read assignments data
        try {
            const assignmentsContent = await fs.readFile(assignmentsPath, 'utf8');
            assignments = Papa.parse(assignmentsContent, { header: true, skipEmptyLines: true }).data;
        } catch (e) {
            console.warn('Could not read assignments data:', e.message);
        }

        // Read announcements data
        try {
            const announcementsContent = await fs.readFile(announcementsPath, 'utf8');
            announcements = Papa.parse(announcementsContent, { header: true, skipEmptyLines: true }).data;
        } catch (e) {
            console.warn('Could not read announcements data:', e.message);
        }

        // Read public announcements data
        try {
            const pubAnnouncementsContent = await fs.readFile(pubAnnouncementsPath, 'utf8');
            publicAnnouncements = Papa.parse(pubAnnouncementsContent, { header: true, skipEmptyLines: true }).data;
        } catch (e) {
            console.warn('Could not read public announcements data:', e.message);
        }

        res.json({
            assignments: assignments,
            announcements: announcements,
            public_announcements: publicAnnouncements,
            last_updated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching IBBI data:', error.message);
        res.status(500).json({ error: 'Failed to fetch IBBI data' });
    }
});

// NEW: Endpoint to trigger manual update
app.post('/api/manual-update', async (req, res) => {
    try {
        console.log('Manual update requested via API');
        const result = await dailyUpdater.manualUpdate();
        res.json(result);
    } catch (error) {
        console.error('Error during manual update:', error.message);
        res.status(500).json({ error: 'Manual update failed' });
    }
});

// NEW: Endpoint to get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await dailyUpdater.getStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Fallback to index.html for any other route (SPA behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET /api/data - Original Google Sheets data');
    console.log('  GET /api/ibbi-data - Scraped IBBI data (assignments, announcements)');
    console.log('  POST /api/manual-update - Trigger manual data update');
    console.log('  GET /api/stats - Get update statistics');
});
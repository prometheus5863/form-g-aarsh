const express = require('express');
const axios = require('axios');
const Papa = require('papaparse');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON support
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint to fetch Google Sheet data
// Replace with your actual CSV link if it changes
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRHRnSQ3EIUJGA-opJiNdMmenO5FKEyPHL2KAEgCVlZL8mDPD4ANZilUvIknefMXjt5iWfS7OAsE2fT/pub?output=csv';

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
                res.status(500).json({ error: 'Failed to parse CSV data' });
            }
        });
    } catch (error) {
        console.error('Fetch Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch data from Google Sheets' });
    }
});

// Fallback to index.html for any other route (SPA behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
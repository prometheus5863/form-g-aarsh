# AARSH Resolution Professionals Portal - Enhanced Version

This is an enhanced version of the AARSH Resolution Professionals portal with automated data scraping from the Insolvency and Bankruptcy Board of India (IBBI) website.

## Features

- **Automated Data Scraping**: Daily scraping of IBBI website for new IPE assignments and announcements
- **Multiple Data Tabs**: View IPE assignments, general announcements, and public announcements
- **Real-time Updates**: Automatic integration with Google Sheets for data storage
- **Enhanced Dashboard**: Three-tab interface for different types of data
- **Responsive Design**: Maintains the original professional aesthetic

## Architecture

```
├── server.js                     # Main server with API endpoints
├── scrapers/
│   └── ibbi_scraper.js         # Web scraper for IBBI data
├── integrations/
│   └── google_sheets.js        # Google Sheets integration
├── automation/
│   └── daily_update.js         # Automated daily update process
├── public/
│   ├── dashboard.html          # Enhanced dashboard with tabs
│   ├── dashboard.js            # Updated dashboard logic
│   ├── style.css               # Styles including tab navigation
│   └── other files...          # Other static files
└── data/                       # Local data storage (CSV files)
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create a .env file with:
GOOGLE_SHEET_ID=your_google_sheet_id_here
```

3. Start the server:
```bash
npm start
```

## Scripts

- `npm start`: Start the production server
- `npm run dev`: Start development server with hot reload
- `npm run scrape`: Manually trigger data scraping
- `npm run scrape:daily`: Run daily update process
- `npm run scrape:stats`: Get statistics about the scraping process

## API Endpoints

- `GET /api/data`: Original Google Sheets data (backward compatible)
- `GET /api/ibbi-data`: Scraped IBBI data (assignments, announcements)
- `POST /api/manual-update`: Trigger manual data update
- `GET /api/stats`: Get update statistics

## Data Sources

The application pulls data from:
1. Original Google Sheet (maintaining backward compatibility)
2. IBBI website (through automated scraping):
   - New IPE assignments
   - Latest public announcements
   - General announcements

## Dashboard Tabs

1. **IPE Assignments**: Shows corporate debtor cases with resolution professionals
2. **Announcements**: Displays general announcements from IBBI
3. **Public Announcements**: Shows official public notices and updates

## Automation

The system includes a daily automation that:
- Scrapes the IBBI website for new data
- Processes and formats the data
- Updates Google Sheets (simulated locally as CSV)
- Maintains historical records

## Security

- Login authentication maintained
- Environment variables for sensitive data
- Input sanitization for scraped data

## Technologies Used

- Node.js / Express
- Cheerio (for web scraping)
- Axios (for HTTP requests)
- Papa Parse (for CSV processing)
- Google Sheets API integration

## License

MIT License
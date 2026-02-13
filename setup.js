#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

async function setupProject() {
    console.log('Setting up AARSH Resolution Professionals Portal with automated features...\n');
    
    try {
        // Check if package.json exists
        try {
            await fs.access(path.join(__dirname, 'package.json'));
            console.log('✓ package.json found');
        } catch (error) {
            console.error('✗ package.json not found in current directory');
            process.exit(1);
        }

        // Install dependencies
        console.log('\nInstalling dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        console.log('✓ Dependencies installed successfully');

        // Create data directory
        const dataDir = path.join(__dirname, 'data');
        await fs.mkdir(dataDir, { recursive: true });
        console.log('✓ Data directory created');

        // Create initial CSV files if they don't exist
        const assignmentsPath = path.join(dataDir, 'assignments.csv');
        const announcementsPath = path.join(dataDir, 'announcements.csv');
        const pubAnnouncementsPath = path.join(dataDir, 'public_announcements.csv');
        
        const assignmentsHeader = 'ID,Corporate Debtor,Resolution Professional,Date,Status,Form G Link,Scraped At\n';
        const announcementsHeader = 'ID,Title,Date,Link,Scraped At\n';
        const pubAnnouncementsHeader = 'ID,Title,Date,Link,Category,Scraped At\n';
        
        await fs.writeFile(assignmentsPath, assignmentsHeader);
        await fs.writeFile(announcementsPath, announcementsHeader);
        await fs.writeFile(pubAnnouncementsPath, pubAnnouncementsHeader);
        
        console.log('✓ Initial CSV files created');

        // Create credentials directory
        const credsDir = path.join(__dirname, 'credentials');
        await fs.mkdir(credsDir, { recursive: true });
        console.log('✓ Credentials directory created');

        // Create sample .env file
        const envContent = `# Environment Variables for AARSH Portal

# Google Sheets Configuration
GOOGLE_SHEET_ID=your_google_sheet_id_here

# Optional: API Keys for advanced features
# IBBI_API_KEY=your_ibbi_api_key_here
`;
        await fs.writeFile(path.join(__dirname, '.env'), envContent);
        console.log('✓ Sample .env file created');

        // Create logs directory
        const logsDir = path.join(__dirname, 'logs');
        await fs.mkdir(logsDir, { recursive: true });
        console.log('✓ Logs directory created');

        console.log('\n🎉 Setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Edit the .env file with your Google Sheet ID');
        console.log('2. Run `npm start` to start the server');
        console.log('3. Access the dashboard at http://localhost:3000');
        console.log('4. Run `npm run scrape` to manually trigger data scraping');
        console.log('\nThe system is now ready for automated daily updates!');
        
    } catch (error) {
        console.error('\n✗ Setup failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    setupProject();
}

module.exports = setupProject;
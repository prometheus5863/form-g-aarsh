const axios = require('axios');
const cheerio = require('cheerio'); // npm install cheerio
const fs = require('fs').promises;

class IBBIScraper {
    constructor() {
        this.baseURL = 'https://www.ibbi.gov.in';
        this.timeout = 10000;
    }

    async scrapeAnnouncements() {
        try {
            console.log('Scraping IBBI announcements...');
            const response = await axios.get(this.baseURL, { timeout: this.timeout });
            const $ = cheerio.load(response.data);
            
            const announcements = [];
            
            // Look for announcements/news sections on the homepage
            // This selector might need adjustment based on actual page structure
            $('.news-item, .announcement, .event-item, .updates li').each((index, element) => {
                const title = $(element).find('a, h3, h4, .title').first().text().trim();
                const date = $(element).find('.date, .time, .timestamp').first().text().trim() || '';
                const link = $(element).find('a').first().attr('href');
                
                if (title) {
                    announcements.push({
                        id: `ann_${Date.now()}_${index}`,
                        title: title,
                        date: date,
                        link: link ? (link.startsWith('http') ? link : this.baseURL + link) : '',
                        scraped_at: new Date().toISOString()
                    });
                }
            });

            // Alternative selectors for announcements
            if (announcements.length === 0) {
                $('*[class*="news"], *[class*="event"], *[class*="update"]').each((index, element) => {
                    const title = $(element).find('a, div, span').first().text().trim();
                    if (title && title.length > 10) { // Filter out very short texts
                        announcements.push({
                            id: `alt_ann_${Date.now()}_${index}`,
                            title: title,
                            date: '',
                            link: '',
                            scraped_at: new Date().toISOString()
                        });
                    }
                });
            }

            console.log(`Found ${announcements.length} announcements`);
            return announcements.slice(0, 20); // Return max 20 announcements
        } catch (error) {
            console.error('Error scraping announcements:', error.message);
            return [];
        }
    }

    async scrapeIPEAssignments() {
        try {
            console.log('Scraping IPE assignments...');
            // IPE assignments are usually found on specific pages
            // Common URLs for IPE data
            const urls = [
                `${this.baseURL}/view-registered-insolvency-professionals-entities`,
                `${this.baseURL}/view-list-of-insolvency-professional-entities`,
                `${this.baseURL}/registered-ip`
            ];
            
            let assignments = [];
            
            for (const url of urls) {
                try {
                    const response = await axios.get(url, { timeout: this.timeout });
                    const $ = cheerio.load(response.data);
                    
                    // Look for assignment tables or lists
                    $('table, .assignment-list, .ipe-data').each((idx, table) => {
                        $(table).find('tr, .assignment-item').each((index, row) => {
                            if (index === 0) return; // Skip header row
                            
                            const cells = $(row).find('td, .assignment-detail');
                            if (cells.length >= 3) { // Expect at least 3 columns
                                const assignment = {
                                    id: `ipe_${Date.now()}_${idx}_${index}`,
                                    corporate_debtor: $(cells[0]).text().trim(),
                                    resolution_professional: $(cells[1]).text().trim(),
                                    date: $(cells[2]).text().trim(),
                                    status: $(cells[3]) ? $(cells[3]).text().trim() : 'Admitted',
                                    form_g_link: $(row).find('a[href*="form" i]').attr('href'),
                                    scraped_at: new Date().toISOString()
                                };
                                
                                if (assignment.corporate_debtor) {
                                    assignments.push(assignment);
                                }
                            }
                        });
                    });
                    
                    if (assignments.length > 0) break; // If we found assignments, exit loop
                } catch (err) {
                    console.warn(`Could not access ${url}:`, err.message);
                    continue;
                }
            }

            // If no assignments found from dedicated pages, try searching the main site
            if (assignments.length === 0) {
                const response = await axios.get(this.baseURL, { timeout: this.timeout });
                const $ = cheerio.load(response.data);
                
                // Look for links that might contain assignment data
                $('a[href*="assignment" i], a[href*="case" i], a[href*="cirp" i]').each((index, element) => {
                    const link = $(element).attr('href');
                    if (link) {
                        assignments.push({
                            id: `potential_${Date.now()}_${index}`,
                            corporate_debtor: $(element).text().trim(),
                            resolution_professional: 'To be determined',
                            date: new Date().toISOString().split('T')[0],
                            status: 'Potential Assignment',
                            form_g_link: link.startsWith('http') ? link : this.baseURL + link,
                            scraped_at: new Date().toISOString()
                        });
                    }
                });
            }

            console.log(`Found ${assignments.length} IPE assignments`);
            return assignments.slice(0, 50); // Return max 50 assignments
        } catch (error) {
            console.error('Error scraping IPE assignments:', error.message);
            return [];
        }
    }

    async scrapePublicAnnouncements() {
        try {
            console.log('Scraping public announcements...');
            const response = await axios.get(`${this.baseURL}/notifications`, { timeout: this.timeout });
            const $ = cheerio.load(response.data);
            
            const announcements = [];
            
            // Look for notification or announcement sections
            $('.notification, .notice, .public-announcement, table tr').each((index, element) => {
                const title = $(element).find('a, .title, td:first-child').first().text().trim();
                const date = $(element).find('.date, .dt, td:nth-child(2)').first().text().trim();
                const link = $(element).find('a').first().attr('href');
                
                if (title && title.length > 5) {
                    announcements.push({
                        id: `pub_${Date.now()}_${index}`,
                        title: title,
                        date: date,
                        link: link ? (link.startsWith('http') ? link : this.baseURL + link) : '',
                        category: 'Public Announcement',
                        scraped_at: new Date().toISOString()
                    });
                }
            });

            return announcements.slice(0, 30); // Return max 30 announcements
        } catch (error) {
            console.warn('Could not scrape public announcements from dedicated page, trying alternative methods...');
            // Return empty array to be populated by other methods
            return [];
        }
    }

    async getAllData() {
        console.log('Starting comprehensive IBBI data scrape...');
        const [announcements, assignments, publicAnnouncements] = await Promise.all([
            this.scrapeAnnouncements(),
            this.scrapeIPEAssignments(),
            this.scrapePublicAnnouncements()
        ]);
        
        const allData = {
            announcements: announcements,
            assignments: assignments,
            public_announcements: publicAnnouncements,
            last_scraped: new Date().toISOString()
        };
        
        console.log(`Scraping complete. Retrieved ${announcements.length} announcements, ${assignments.length} assignments, ${publicAnnouncements.length} public announcements`);
        return allData;
    }

    async saveToJSON(data, filename = 'ibbi_data.json') {
        try {
            await fs.writeFile(filename, JSON.stringify(data, null, 2));
            console.log(`Data saved to ${filename}`);
        } catch (error) {
            console.error('Error saving data to file:', error.message);
        }
    }
}

// For testing purposes
if (require.main === module) {
    const scraper = new IBBIScraper();
    scraper.getAllData()
        .then(data => scraper.saveToJSON(data))
        .catch(console.error);
}

module.exports = IBBIScraper;
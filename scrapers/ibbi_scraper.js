const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

class IBBIScraper {
    constructor() {
        this.baseURL = 'https://ibbi.gov.in';

        // Create an HTTPS agent that ignores SSL certificate errors
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });

        // Create a custom axios instance with strict headers and timeout
        this.axiosInstance = axios.create({
            httpsAgent: httpsAgent,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            }
        });
    }

    async scrapeAnnouncements() {
        const url = 'https://ibbi.gov.in/en/whats-new';
        console.log(`[DEBUG] Fetching URL: ${url}`);

        try {
            const response = await this.axiosInstance.get(url);
            console.log(`[DEBUG] Response Status: ${response.status}`);
            console.log(`[DEBUG] Response Data Length: ${response.data.length}`);

            const $ = cheerio.load(response.data);
            const rows = $('table tbody tr');
            console.log(`[DEBUG] Found ${rows.length} table rows`);

            const announcements = [];

            rows.each((index, element) => {
                const tds = $(element).find('td');

                if (tds.length >= 2) {
                    const date = $(tds[0]).text().trim();
                    const titleElement = $(tds[1]).find('a');
                    const title = titleElement.text().trim() || $(tds[1]).text().trim();
                    let link = titleElement.attr('href');

                    if (link) {
                        link = link.trim();
                        if (!link.startsWith('http')) {
                            link = `https://ibbi.gov.in${link.startsWith('/') ? '' : '/'}${link}`;
                        }
                    }

                    if (title) {
                        announcements.push({
                            id: `ann_${Date.now()}_${index}`,
                            title: title,
                            date: date,
                            link: link || '',
                            scraped_at: new Date().toISOString()
                        });
                    }
                }
            });

            console.log(`[DEBUG] Parsed ${announcements.length} announcements`);
            return announcements;
        } catch (error) {
            console.error(`[ERROR] Failed to scrape announcements: ${error.message}`);
            if (error.response) {
                console.error(`[ERROR] Response Status: ${error.response.status}`);
            }
            return [];
        }
    }

    async scrapeIPEAssignments() {
        const url = 'https://ibbi.gov.in/resolution-plans';
        console.log(`[DEBUG] Fetching URL: ${url}`);

        try {
            const response = await this.axiosInstance.get(url);
            console.log(`[DEBUG] Response Status: ${response.status}`);
            console.log(`[DEBUG] Response Data Length: ${response.data.length}`);

            const $ = cheerio.load(response.data);
            const rows = $('table tr');
            console.log(`[DEBUG] Found ${rows.length} table rows`);

            const assignments = [];

            rows.each((index, element) => {
                if (index === 0) return; // Skip header

                const tds = $(element).find('td');

                if (tds.length >= 5) {
                    const corporate_debtor = $(tds[0]).text().trim();
                    const resolution_professional = $(tds[1]).text().trim();
                    const date = $(tds[3]).text().trim();
                    const status = "Active";

                    let form_g_link = '';
                    if (tds.length > 5) {
                        const linkEl = $(tds[5]).find('a');

                        // Try to get link from onclick attribute first using regex
                        const onclick = linkEl.attr('onclick');
                        if (onclick) {
                            const match = onclick.match(/(?:newwindow\d*|window\.open)\s*\(\s*['"]([^'"]+)['"]/i);
                            if (match && match[1]) {
                                form_g_link = match[1].trim();
                            }
                        }

                        // Fallback to href if no onclick extraction
                        if (!form_g_link) {
                            const href = linkEl.attr('href');
                            if (href && href !== '#' && !href.startsWith('javascript:')) {
                                form_g_link = href.trim();
                            }
                        }

                        if (form_g_link && !form_g_link.startsWith('http')) {
                            // Ensure no double slash issue if link starts with /
                            form_g_link = `https://ibbi.gov.in${form_g_link.startsWith('/') ? '' : '/'}${form_g_link}`;
                        }
                    }

                    if (corporate_debtor) {
                        assignments.push({
                            id: `assign_${Date.now()}_${index}`,
                            corporate_debtor: corporate_debtor,
                            resolution_professional: resolution_professional,
                            date: date,
                            status: status,
                            form_g_link: form_g_link,
                            scraped_at: new Date().toISOString()
                        });
                    }
                }
            });

            console.log(`[DEBUG] Parsed ${assignments.length} assignments`);
            return assignments;
        } catch (error) {
            console.error(`[ERROR] Failed to scrape IPE assignments: ${error.message}`);
            if (error.response) {
                console.error(`[ERROR] Response Status: ${error.response.status}`);
            }
            return [];
        }
    }

    async scrapePublicAnnouncements() {
        const url = 'https://ibbi.gov.in/en/public-announcement';
        console.log(`[DEBUG] Fetching URL: ${url}`);

        try {
            const response = await this.axiosInstance.get(url);
            console.log(`[DEBUG] Response Status: ${response.status}`);
            console.log(`[DEBUG] Response Data Length: ${response.data.length}`);

            const $ = cheerio.load(response.data);
            const rows = $('table tbody tr');
            console.log(`[DEBUG] Found ${rows.length} table rows`);

            const announcements = [];

            rows.each((index, element) => {
                const tds = $(element).find('td');

                if (tds.length >= 3) {
                    const titleElement = $(tds[0]).find('a');
                    const title = titleElement.text().trim() || $(tds[0]).text().trim();
                    let link = titleElement.attr('href');

                    if (link) {
                        link = link.trim();
                        if (!link.startsWith('http')) {
                            link = `https://ibbi.gov.in${link.startsWith('/') ? '' : '/'}${link}`;
                        }
                    }

                    const category = $(tds[1]).text().trim();
                    const date = $(tds[2]).text().trim();

                    if (title) {
                        announcements.push({
                            id: `pub_${Date.now()}_${index}`,
                            title: title,
                            date: date,
                            link: link || '',
                            category: category,
                            scraped_at: new Date().toISOString()
                        });
                    }
                }
            });

            console.log(`[DEBUG] Parsed ${announcements.length} public announcements`);
            return announcements;
        } catch (error) {
            console.error(`[ERROR] Failed to scrape public announcements: ${error.message}`);
            if (error.response) {
                console.error(`[ERROR] Response Status: ${error.response.status}`);
            }
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

        return {
            announcements,
            assignments,
            public_announcements: publicAnnouncements,
            last_scraped: new Date().toISOString()
        };
    }
}

module.exports = IBBIScraper;

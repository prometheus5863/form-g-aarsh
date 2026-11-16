const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const crypto = require('crypto');

const BASE = 'https://ibbi.gov.in';
const DATE_RE = /^(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}(st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})$/;
const SERIAL_RE = /^\d{1,5}\.?$/;

// An id that depends only on the row's content, so the same notice gets the same id on every run.
// (Ids used to embed the scrape time, which made every row look new each day.)
function stableId(prefix, ...parts) {
    const hash = crypto.createHash('sha1').update(parts.join('|').toLowerCase()).digest('hex').slice(0, 12);
    return `${prefix}_${hash}`;
}

function absolute(link) {
    if (!link) return '';
    link = link.trim();
    if (!link || link === '#' || link.startsWith('javascript:')) return '';
    return link.startsWith('http') ? link : `${BASE}${link.startsWith('/') ? '' : '/'}${link}`;
}

// First usable link anywhere in a row. IBBI opens most documents from an onclick handler, so check that too.
function rowLink($, tr) {
    let found = '';
    $(tr).find('a').each((_, a) => {
        if (found) return;
        const onclick = $(a).attr('onclick') || '';
        const match = onclick.match(/(?:newwindow\d*|window\.open)\s*\(\s*['"]([^'"]+)['"]/i);
        found = absolute(match ? match[1] : $(a).attr('href'));
    });
    return found;
}

const cellTexts = ($, tr) => $(tr).find('td').map((_, td) => $(td).text().replace(/\s+/g, ' ').trim()).get();

/**
 * "What's new" table. The columns are a serial number, a date and a subject, but their order has
 * changed before, so each cell is classified by what it contains instead of by position.
 */
function parseAnnouncements(html) {
    const $ = cheerio.load(html);
    const out = [];
    $('table tbody tr').each((_, tr) => {
        const cells = cellTexts($, tr);
        if (cells.length < 2) return;
        const date = cells.find((c) => DATE_RE.test(c)) || '';
        const rest = cells.filter((c) => c && c !== date && !SERIAL_RE.test(c));
        const title = rest.sort((x, y) => y.length - x.length)[0] || '';
        if (!title) return;
        out.push({ id: stableId('ann', title, date), title, date, link: rowLink($, tr), scraped_at: new Date().toISOString() });
    });
    return out;
}

/**
 * Public announcements table: type of announcement, date announced, last date for submission,
 * then the corporate debtor and the people involved. The debtor's name is what a reader scans for,
 * so it becomes the title and the announcement type becomes the category.
 */
function parsePublicAnnouncements(html) {
    const $ = cheerio.load(html);
    const out = [];
    $('table tbody tr').each((_, tr) => {
        const cells = cellTexts($, tr);
        if (cells.length < 3) return;
        const type = cells[0];
        const dates = cells.filter((c) => DATE_RE.test(c));
        const names = cells.slice(1).filter((c) => c && !DATE_RE.test(c) && !SERIAL_RE.test(c));
        const debtor = names[0] || '';
        const title = debtor || type;
        if (!title) return;
        out.push({
            id: stableId('pub', type, debtor, dates[0] || ''),
            title,
            date: dates[0] || '',
            last_date: dates[1] || '',
            link: rowLink($, tr),
            category: type || 'Public Announcement',
            scraped_at: new Date().toISOString()
        });
    });
    return out;
}

// Logged on every run so a change in IBBI's page layout shows up in the job output.
function describeTable(html, label) {
    const $ = cheerio.load(html);
    const headers = $('table thead th, table tr th').map((_, th) => $(th).text().replace(/\s+/g, ' ').trim()).get();
    const first = cellTexts($, $('table tbody tr').first());
    console.log(`[DEBUG] ${label} headers: ${JSON.stringify(headers)}`);
    console.log(`[DEBUG] ${label} first row: ${JSON.stringify(first)}`);
}

class IBBIScraper {
    constructor() {
        this.baseURL = BASE;

        // IBBI's server has at times sent an incomplete certificate chain, which Node rejects.
        // Verification is therefore off by default so the daily job keeps working.
        // Set IBBI_STRICT_TLS=1 to turn it back on.
        const httpsAgent = new https.Agent({
            rejectUnauthorized: process.env.IBBI_STRICT_TLS === '1'
        });

        this.axiosInstance = axios.create({
            httpsAgent: httpsAgent,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'max-age=0'
            }
        });
    }

    async fetchAndParse(url, label, parse) {
        console.log(`[DEBUG] Fetching URL: ${url}`);
        try {
            const response = await this.axiosInstance.get(url);
            console.log(`[DEBUG] Response Status: ${response.status}, length ${response.data.length}`);
            describeTable(response.data, label);
            const rows = parse(response.data);
            console.log(`[DEBUG] Parsed ${rows.length} ${label}`);
            return rows;
        } catch (error) {
            console.error(`[ERROR] Failed to scrape ${label}: ${error.message}`);
            if (error.response) console.error(`[ERROR] Response Status: ${error.response.status}`);
            return [];
        }
    }

    scrapeAnnouncements() {
        return this.fetchAndParse(`${BASE}/en/whats-new`, 'announcements', parseAnnouncements);
    }

    scrapePublicAnnouncements() {
        return this.fetchAndParse(`${BASE}/en/public-announcement`, 'public announcements', parsePublicAnnouncements);
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
                            id: stableId('assign', corporate_debtor, resolution_professional, date),
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
module.exports.parseAnnouncements = parseAnnouncements;
module.exports.parsePublicAnnouncements = parsePublicAnnouncements;
module.exports.stableId = stableId;

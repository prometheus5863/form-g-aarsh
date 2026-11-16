// Run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const { parseAnnouncements, parsePublicAnnouncements, stableId } = require('../scrapers/ibbi_scraper');

const table = (rows) => `<table><thead><tr><th>x</th></tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

test('announcements: serial number and date are not mistaken for the title', () => {
    const rows = parseAnnouncements(table([
        ['1', '2026-11-10', '<a href="/uploads/a.pdf">Circular on valuation of assets</a>'],
        ['2', '05-11-2026', '<a href="#" onclick="newwindow1(\'https://ibbi.gov.in/uploads/b.pdf\')">Discussion paper</a>'],
    ]));
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].title, 'Circular on valuation of assets');
    assert.strictEqual(rows[0].date, '2026-11-10');
    assert.strictEqual(rows[0].link, 'https://ibbi.gov.in/uploads/a.pdf');
    assert.strictEqual(rows[1].link, 'https://ibbi.gov.in/uploads/b.pdf');
});

test('announcements: column order does not matter', () => {
    const [row] = parseAnnouncements(table([['<a href="/x.pdf">Notice about fees</a>', '10-11-2026']]));
    assert.strictEqual(row.title, 'Notice about fees');
    assert.strictEqual(row.date, '10-11-2026');
});

test('announcements: a row with no subject is skipped, not saved as junk', () => {
    assert.deepStrictEqual(parseAnnouncements(table([['1', '2026-11-10']])), []);
});

test('public announcements: debtor becomes the title, type the category, both dates kept', () => {
    const [row] = parsePublicAnnouncements(table([[
        'Public Announcement of Corporate Insolvency Resolution Process', '09-11-2026', '23-11-2026',
        'Acme Steel Private Limited', 'A Bank', 'Mr. Example', 'Delhi', '<a href="/pa/1.pdf">View</a>',
    ]]));
    assert.strictEqual(row.title, 'Acme Steel Private Limited');
    assert.strictEqual(row.category, 'Public Announcement of Corporate Insolvency Resolution Process');
    assert.strictEqual(row.date, '09-11-2026');
    assert.strictEqual(row.last_date, '23-11-2026');
    assert.strictEqual(row.link, 'https://ibbi.gov.in/pa/1.pdf');
});

test('ids depend on content only, so the same notice keeps its id between runs', () => {
    assert.strictEqual(stableId('ann', 'Notice', '10-11-2026'), stableId('ann', 'notice', '10-11-2026'));
    assert.notStrictEqual(stableId('ann', 'Notice', '10-11-2026'), stableId('ann', 'Notice', '11-11-2026'));
});

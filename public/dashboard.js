// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    fetchSheetData();
    setupSearch();
    // Pagination listeners are set up dynamically in renderPagination
});

// --- AUTHENTICATION ---
function checkAuth() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('aarshrp_logged_in');
    
    // Redirect if not logged in (Uncomment next line for production)
    // if (!isLoggedIn) window.location.href = 'login.html'; 

    // Load User Info into Sidebar
    const userStr = localStorage.getItem('aarshrp_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        const nameEl = document.getElementById('userName');
        if(nameEl) nameEl.textContent = user.name;
        
        const avatarEl = document.getElementById('userAvatar');
        if(avatarEl) avatarEl.textContent = getInitials(user.name);
    }
    
    // Logout Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('aarshrp_logged_in');
            window.location.href = 'login.html';
        });
    }
}

// --- DATA FETCHING & STATE ---
let allAssignments = [];
let currentFiltered = [];
let currentPage = 1;

async function fetchSheetData() {
    const tbody = document.getElementById('assignmentsTable');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Loading live data...</td></tr>';

    try {
        // Fetch from the URL defined in config.js
        const response = await fetch(CONFIG.SHEET_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const csvText = await response.text();
        const rows = parseCSV(csvText); // Use robust parser

        // STEP 1: SMART HEADER DETECTION
        // We look at the first row (headers) to find column indices dynamically
        const headers = rows[0].map(h => h.toLowerCase().trim());
        
        const map = {
            company: headers.findIndex(h => h.includes('company')),
            rp: headers.findIndex(h => h.includes('resolution professional') || h === 'rp' || h.includes('name of ip')),
            date: headers.findIndex(h => h.includes('date') || h.includes('order')),
            status: headers.findIndex(h => h.includes('status')),
            formG: headers.findIndex(h => h.includes('form g') || h.includes('link')),
            cin: headers.findIndex(h => h.includes('cin')),
            sector: headers.findIndex(h => h.includes('sector')),
            remarks: headers.findIndex(h => h.includes('remarks') || h.includes('analysis'))
        };

        // STEP 2: MAP DATA TO OBJECTS
        allAssignments = rows.slice(1).map((col, i) => {
            // Helper to get column data safely
            const get = (index) => (index > -1 && col[index]) ? clean(col[index]) : "";

            return {
                id: i,
                company: get(map.company) || "Unknown",
                rp: get(map.rp) || "N/A",
                date: get(map.date) || "",
                status: get(map.status) || "Admitted", // Default status if empty
                formG: get(map.formG),
                cin: get(map.cin) || "N/A",
                sector: get(map.sector) || "General",
                remarks: get(map.remarks) || "No additional details available."
            };
        }).filter(item => item.company !== "Unknown" && item.company !== "");

        currentFiltered = allAssignments;
        updateStats();
        renderTable(1);

    } catch (err) {
        console.error("Fetch Error:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding:20px;">Error loading data. Check Console.</td></tr>`;
    }
}

// --- ROBUST CSV PARSER ---
// Handles quoted fields like "Company, Inc." correctly
function parseCSV(text) {
    const result = [];
    let row = [];
    let current = "";
    let inQuote = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') { 
            inQuote = !inQuote; 
        } else if (char === ',' && !inQuote) { 
            row.push(current); 
            current = ""; 
        } else if ((char === '\r' || char === '\n') && !inQuote) {
            if (char === '\r' && text[i + 1] === '\n') i++; // Handle Windows \r\n
            row.push(current); 
            current = "";
            if (row.length > 0) result.push(row); 
            row = [];
        } else { 
            current += char; 
        }
    }
    if (current || row.length > 0) { row.push(current); result.push(row); }
    return result;
}

// --- RENDERING ---
function renderTable(page) {
    currentPage = page;
    const start = (page - 1) * CONFIG.ITEMS_PER_PAGE;
    const end = start + CONFIG.ITEMS_PER_PAGE;
    const pageData = currentFiltered.slice(start, end);

    const tbody = document.getElementById('assignmentsTable');
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No records found matching your search.</td></tr>';
        updatePagination();
        return;
    }

    tbody.innerHTML = pageData.map(item => `
        <tr>
            <td>
                <div style="font-weight:600; color:#1B2430;">${item.company}</div>
                <div style="font-size:11px; color:#9CA3AF; font-family:'JetBrains Mono'">${item.cin}</div>
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:24px; height:24px; background:#D4AF37; color:#1B2430; font-size:10px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                        ${getInitials(item.rp)}
                    </div>
                    <span>${item.rp}</span>
                </div>
            </td>
            <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
            <td>
                ${item.formG && item.formG.includes('http') 
                    ? `<a href="${item.formG}" target="_blank" style="color:#D4AF37; text-decoration:none; font-weight:600;"><i class="fas fa-file-pdf"></i> PDF</a>` 
                    : '<span style="color:#ccc">--</span>'}
            </td>
            <td style="font-family:'JetBrains Mono'; font-size:12px;">${item.date}</td>
            <td>
                <button onclick="openModal(${item.id})" class="action-btn" style="border:1px solid #E5E7EB; background:white; cursor:pointer; padding:6px 10px; border-radius:4px;">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updatePagination();
}

// --- PAGINATION LOGIC ---
function updatePagination() {
    const totalItems = currentFiltered.length;
    const totalPages = Math.ceil(totalItems / CONFIG.ITEMS_PER_PAGE);
    const startItem = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE + 1;
    const endItem = Math.min(startItem + CONFIG.ITEMS_PER_PAGE - 1, totalItems);

    // Update Text
    const infoEl = document.getElementById('pageInfo');
    if(infoEl) {
        infoEl.innerHTML = `Showing <strong>${totalItems === 0 ? 0 : startItem}-${endItem}</strong> of <strong>${totalItems}</strong>`;
    }

    // Generate Buttons
    const container = document.getElementById('pageNumbers');
    if (!container) return;

    let html = '';
    
    // Prev Button
    if (currentPage > 1) {
        html += `<button class="page-btn" onclick="renderTable(${currentPage - 1})">←</button>`;
    }

    // Logic to show limited page numbers (e.g., 1, 2, ... 10)
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            html += createPageBtn(i);
        }
    } else {
        html += createPageBtn(1);
        if (currentPage > 3) html += `<span>...</span>`;
        
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);
        
        for (let i = startPage; i <= endPage; i++) {
            html += createPageBtn(i);
        }
        
        if (currentPage < totalPages - 2) html += `<span>...</span>`;
        html += createPageBtn(totalPages);
    }

    // Next Button
    if (currentPage < totalPages) {
        html += `<button class="page-btn" onclick="renderTable(${currentPage + 1})">→</button>`;
    }

    container.innerHTML = html;
}

function createPageBtn(pageNum) {
    const activeClass = pageNum === currentPage ? 'active' : '';
    // Inline styles for the button to match your theme
    const style = `border:1px solid #E5E7EB; background:${activeClass ? '#1B2430' : 'white'}; color:${activeClass ? '#D4AF37' : '#4B5563'}; width:30px; height:30px; cursor:pointer; border-radius:4px;`;
    return `<button onclick="renderTable(${pageNum})" style="${style}">${pageNum}</button>`;
}

// --- SEARCH & UTILS ---
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            currentFiltered = allAssignments.filter(item => 
                item.company.toLowerCase().includes(term) || 
                item.rp.toLowerCase().includes(term) ||
                item.cin.toLowerCase().includes(term)
            );
            renderTable(1); // Reset to page 1 on search
        });
    }
}

function updateStats() {
    const statEl = document.querySelector('.stat-value');
    if(statEl) statEl.textContent = allAssignments.length;
}

function getStatusClass(status) {
    if (!status) return '';
    status = status.toLowerCase();
    if (status.includes('cirp')) return 'cirp';
    if (status.includes('liquid')) return 'liquidation';
    if (status.includes('resolved')) return 'resolved';
    return 'admitted';
}

function clean(str) {
    if (!str) return "";
    return str.replace(/^['"\s]+|['"\s]+$/g, '').trim();
}

function getInitials(name) {
    return name ? name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'NA';
}

// --- MODAL LOGIC ---
window.openModal = function(id) {
    const item = allAssignments.find(x => x.id === id);
    if (!item) return;
    
    document.getElementById('modalTitle').innerText = item.company;
    
    // Update the link button
    const ipLink = document.getElementById('modalIpLink');
    if(ipLink) {
        if(item.formG && item.formG.includes('http')) {
            ipLink.href = item.formG;
            ipLink.style.display = 'inline-block';
            ipLink.textContent = "View Documents";
        } else {
            ipLink.style.display = 'none';
        }
    }

    document.getElementById('modalBody').innerHTML = `
        <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="detail-item">
                <label style="display:block; font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase;">RP Name</label>
                <p style="color:#1B2430; font-weight:500;">${item.rp}</p>
            </div>
            <div class="detail-item">
                <label style="display:block; font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase;">CIN</label>
                <p style="color:#1B2430; font-weight:500;">${item.cin}</p>
            </div>
            <div class="detail-item">
                <label style="display:block; font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase;">Status</label>
                <p style="color:#1B2430; font-weight:500;">${item.status}</p>
            </div>
            <div class="detail-item">
                <label style="display:block; font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase;">Date</label>
                <p style="color:#1B2430; font-weight:500;">${item.date}</p>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label style="display:block; font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase;">Sector</label>
                <p style="color:#1B2430; font-weight:500;">${item.sector}</p>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label style="display:block; font-size:11px; font-weight:700; color:#9CA3AF; text-transform:uppercase;">Remarks / Analysis</label>
                <div style="background:#F9F5F0; padding:12px; border-radius:4px; font-size:13px; line-height:1.5; border-left:2px solid #D4AF37;">
                    ${item.remarks}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('detailModal').classList.add('active');
}

window.closeModal = function() {
    document.getElementById('detailModal').classList.remove('active');
}

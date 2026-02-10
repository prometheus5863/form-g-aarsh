// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    fetchSheetData();
    setupSearch();
});

// --- AUTHENTICATION ---
function checkAuth() {
    const isLoggedIn = localStorage.getItem('aarshrp_logged_in');
    // if (!isLoggedIn) window.location.href = 'login.html'; 

    const userStr = localStorage.getItem('aarshrp_user');
    if (userStr) {
        const user = JSON.parse(userStr);
        const nameEl = document.getElementById('userName');
        if (nameEl) nameEl.textContent = user.name;
        
        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) avatarEl.textContent = getInitials(user.name);
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('aarshrp_logged_in');
            window.location.href = 'login.html';
        });
    }
}

// --- GLOBAL STATE ---
let allAssignments = [];
let currentFiltered = [];
let currentPage = 1;

// --- CORE: FETCH DATA FROM SERVER ---
async function fetchSheetData() {
    const tbody = document.getElementById('assignmentsTable');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">Loading live data...</td></tr>';

    try {
        const response = await fetch(CONFIG.SHEET_URL);
        const jsonData = await response.json();

        if (!jsonData || jsonData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No data found.</td></tr>';
            return;
        }

        // --- SMART MAPPING ---
        // Detects column headers dynamically
        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow);
        const findCol = (keywords) => keys.find(k => keywords.some(w => k.toLowerCase().includes(w)));

        const map = {
            company: findCol(['corporate debtor', 'company', 'name of corporate']),
            rp: findCol(['resolution professional', 'rp name', 'name of ip', 'ip name']),
            date: findCol(['date', 'order']),
            status: findCol(['status', 'stage', 'subject']),
            formG: findCol(['form g', 'link', 'url', 'pdf']),
            cin: findCol(['cin']),
            sector: findCol(['sector', 'industry']),
            remarks: findCol(['remark', 'analysis', 'note'])
        };

        // --- MAP DATA ---
        allAssignments = jsonData.map((row, index) => {
            return {
                id: index,
                company: row[map.company] || "Unknown Company",
                rp: row[map.rp] || "N/A",
                date: row[map.date] || "",
                status: row[map.status] || "Admitted",
                formG: row[map.formG] || "#",
                cin: row[map.cin] || "N/A",
                sector: row[map.sector] || "General",
                remarks: row[map.remarks] || ""
            };
        }).filter(item => item.company !== "Unknown Company");

        currentFiltered = allAssignments;
        updateStats();
        renderTable(1);

    } catch (err) {
        console.error("Dashboard Error:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">System Error. Please try again later.</td></tr>`;
    }
}

// --- RENDERING (Using Your New CSS Classes) ---
function renderTable(page) {
    currentPage = page;
    const start = (page - 1) * CONFIG.ITEMS_PER_PAGE;
    const end = start + CONFIG.ITEMS_PER_PAGE;
    const pageData = currentFiltered.slice(start, end);

    const tbody = document.getElementById('assignmentsTable');
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No records found.</td></tr>';
        updatePagination();
        return;
    }

    tbody.innerHTML = pageData.map(item => `
        <tr>
            <td>
                <div style="font-weight: 700; color: var(--ibc-navy);">${item.company}</div>
                <div style="font-size: 11px; color: #6B7280; font-family: 'JetBrains Mono', monospace;">${item.cin}</div>
            </td>
            
            <td>${item.sector}</td>
            
            <td>
                <span class="badge ${getStatusClass(item.status)}">
                    ${item.status}
                </span>
            </td>
            
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:24px; height:24px; background:var(--ibc-navy); color:var(--ibc-gold); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold;">
                        ${getInitials(item.rp)}
                    </div>
                    <span>${item.rp}</span>
                </div>
            </td>
            
            <td>
                ${item.formG.includes('http') 
                    ? `<a href="${item.formG}" target="_blank" style="color:var(--ibc-navy); font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                        <i class="fas fa-file-pdf"></i> PDF
                       </a>` 
                    : '<span style="color:#ccc; font-size:12px;">--</span>'}
            </td>
            
            <td style="font-family:'JetBrains Mono'; font-size:12px;">${item.date}</td>
            
            <td>
                <button onclick="openModal(${item.id})" style="border:1px solid #E5E7EB; background:white; width:32px; height:32px; border-radius:4px; cursor:pointer; color:#4B5563;">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updatePagination();
}

// --- CSS CLASS HELPERS ---
function getStatusClass(status) {
    if (!status) return 'admitted';
    const s = status.toLowerCase();
    if (s.includes('cirp')) return 'cirp';      // Blue
    if (s.includes('liquid')) return 'liquid';  // Red
    if (s.includes('resolved')) return 'resolved'; // Green
    return 'admitted'; // Orange (Default)
}

function getInitials(name) {
    return name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'NA';
}

// --- PAGINATION ---
function updatePagination() {
    const totalItems = currentFiltered.length;
    const totalPages = Math.ceil(totalItems / CONFIG.ITEMS_PER_PAGE);
    const startItem = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE + 1;
    const endItem = Math.min(startItem + CONFIG.ITEMS_PER_PAGE - 1, totalItems);

    const infoEl = document.querySelector('.pagination-info');
    if (infoEl) infoEl.innerHTML = `Showing <strong>${totalItems === 0 ? 0 : startItem}-${endItem}</strong> of <strong>${totalItems}</strong>`;

    const container = document.querySelector('.pagination');
    if (!container) return;

    let html = '';
    // Prev
    if (currentPage > 1) {
        html += `<button onclick="renderTable(${currentPage - 1})" style="padding:6px 12px; border:1px solid #ddd; background:white; border-radius:4px; cursor:pointer;">←</button>`;
    }
    
    // Current Page Number
    html += `<button style="padding:6px 12px; border:1px solid var(--ibc-navy); background:var(--ibc-navy); color:white; border-radius:4px; cursor:default;">${currentPage}</button>`;
    
    // Next
    if (currentPage < totalPages) {
        html += `<button onclick="renderTable(${currentPage + 1})" style="padding:6px 12px; border:1px solid #ddd; background:white; border-radius:4px; cursor:pointer;">→</button>`;
    }
    
    container.innerHTML = html;
}

// --- SEARCH & STATS ---
function setupSearch() {
    const input = document.getElementById('searchInput');
    if(input) {
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            currentFiltered = allAssignments.filter(item => 
                item.company.toLowerCase().includes(term) || 
                item.rp.toLowerCase().includes(term) ||
                item.cin.toLowerCase().includes(term)
            );
            renderTable(1);
        });
    }
}

function updateStats() {
    const el = document.querySelector('.stat-value');
    if(el) el.textContent = allAssignments.length;
}

// --- MODAL ---
window.openModal = function(id) {
    const item = allAssignments.find(x => x.id === id);
    if (!item) return;
    
    document.getElementById('modalTitle').innerText = item.company;
    document.getElementById('modalBody').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div><label style="font-size:11px; font-weight:700; color:#9CA3AF;">RP NAME</label><p style="font-weight:600; color:#1B2430;">${item.rp}</p></div>
            <div><label style="font-size:11px; font-weight:700; color:#9CA3AF;">CIN</label><p style="font-weight:600; color:#1B2430;">${item.cin}</p></div>
            <div><label style="font-size:11px; font-weight:700; color:#9CA3AF;">STATUS</label><p style="font-weight:600; color:#1B2430;">${item.status}</p></div>
            <div><label style="font-size:11px; font-weight:700; color:#9CA3AF;">DATE</label><p style="font-weight:600; color:#1B2430;">${item.date}</p></div>
            <div style="grid-column: span 2;">
                <label style="font-size:11px; font-weight:700; color:#9CA3AF;">REMARKS</label>
                <div style="background:#F9F5F0; padding:12px; border-left:3px solid #D4AF37; font-size:13px; line-height:1.5;">${item.remarks || "No additional remarks."}</div>
            </div>
        </div>
    `;
    
    document.getElementById('detailModal').classList.add('active');
}

window.closeModal = function() {
    document.getElementById('detailModal').classList.remove('active');
}

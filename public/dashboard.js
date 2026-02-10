// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    fetchSheetData();
    setupSearch();
});

// --- AUTHENTICATION ---
function checkAuth() {
    const isLoggedIn = localStorage.getItem('aarshrp_logged_in');
    // if (!isLoggedIn) window.location.href = 'login.html'; // Uncomment for security in production

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
        // 1. Fetch from YOUR server (defined in config.js as '/api/data')
        const response = await fetch(CONFIG.SHEET_URL);
        
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        // 2. Server returns clean JSON
        const jsonData = await response.json();

        if (!jsonData || jsonData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No data found in sheet.</td></tr>';
            return;
        }

        // 3. SMART MAPPING (The Fix)
        // Detect column names dynamically based on keywords
        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow);

        const findCol = (keywords) => keys.find(k => keywords.some(w => k.toLowerCase().includes(w)));

        const map = {
            company: findCol(['corporate debtor', 'company', 'name of corporate']),
            rp: findCol(['resolution professional', 'rp name', 'name of ip', 'ip name']),
            date: findCol(['date', 'order']),
            status: findCol(['status', 'stage']),
            formG: findCol(['form g', 'link', 'url']),
            cin: findCol(['cin']),
            caseNo: findCol(['case', 'number']),
            remarks: findCol(['remark', 'analysis', 'note'])
        };

        console.log("Mapped Columns:", map); // Check console to see what it found

        // 4. Transform Data
        allAssignments = jsonData.map((row, index) => ({
            id: index,
            company: row[map.company] || "Unknown Company",
            rp: row[map.rp] || "N/A",
            date: row[map.date] || "",
            status: row[map.status] || "Admitted",
            formG: row[map.formG] || "#",
            cin: row[map.cin] || "N/A",
            caseNumber: row[map.caseNo] || "Pending",
            remarks: row[map.remarks] || ""
        })).filter(item => item.company !== "Unknown Company"); // Remove empty rows

        currentFiltered = allAssignments;
        updateStats();
        renderTable(1);

    } catch (err) {
        console.error("Dashboard Error:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">System Error. Please try again later.</td></tr>`;
    }
}

// --- RENDERING ---
function renderTable(page) {
    currentPage = page;
    const start = (page - 1) * CONFIG.ITEMS_PER_PAGE;
    const end = start + CONFIG.ITEMS_PER_PAGE;
    const pageData = currentFiltered.slice(start, end);

    const tbody = document.getElementById('assignmentsTable');
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No records found.</td></tr>';
        updatePagination();
        return;
    }

    tbody.innerHTML = pageData.map(item => `
        <tr>
            <td>
                <div class="company-cell">
                    <span class="company-name" style="font-weight:600; color:#1B2430;">${item.company}</span>
                    <span class="company-id" style="font-size:11px; color:#9CA3AF; font-family:'JetBrains Mono'">${item.cin}</span>
                </div>
            </td>
            <td><span style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">${item.caseNumber}</span></td>
            <td>
                <span class="status-badge ${getStatusClass(item.status)}">
                    ${item.status}
                </span>
            </td>
            <td>
                <div class="rp-cell" style="display:flex; align-items:center; gap:8px;">
                    <div class="rp-avatar" style="width:24px; height:24px; background:#D4AF37; color:#1B2430; font-size:10px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                        ${getInitials(item.rp)}
                    </div>
                    <span class="rp-name">${item.rp}</span>
                </div>
            </td>
            <td>
                ${item.formG && item.formG.includes('http') 
                    ? `<a href="${item.formG}" target="_blank" class="form-g-link" style="color:#D4AF37; text-decoration:none; font-weight:600; font-size:12px;"><i class="fas fa-file-pdf"></i> View</a>` 
                    : '<span style="color:#ccc; font-size:12px;">--</span>'}
            </td>
            <td class="date-cell" style="font-family:'JetBrains Mono'; font-size:12px;">${item.date}</td>
            <td>
                <button class="action-btn" onclick="openModal(${item.id})" style="border:1px solid #E5E7EB; background:white; cursor:pointer; padding:6px 10px; border-radius:4px;">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updatePagination();
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
    if (currentPage > 1) html += `<button class="page-btn" onclick="renderTable(${currentPage - 1})">←</button>`;
    html += `<button class="page-btn active" style="background:#1B2430; color:#D4AF37; border-color:#1B2430;">${currentPage}</button>`;
    if (currentPage < totalPages) html += `<button class="page-btn" onclick="renderTable(${currentPage + 1})">→</button>`;
    
    container.innerHTML = html;
}

// --- UTILS ---
function setupSearch() {
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        currentFiltered = allAssignments.filter(item => 
            item.company.toLowerCase().includes(term) || 
            item.rp.toLowerCase().includes(term) ||
            item.cin.toLowerCase().includes(term)
        );
        renderTable(1);
    });
}

function updateStats() {
    const el = document.querySelector('.stat-value');
    if (el) el.textContent = allAssignments.length;
}

function getStatusClass(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('cirp')) return 'cirp';
    if (s.includes('liquid')) return 'liquidation';
    if (s.includes('resolved')) return 'resolved';
    return 'admitted';
}

function getInitials(name) {
    return name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'NA';
}

// --- MODAL ---
window.openModal = function(id) {
    const item = allAssignments.find(x => x.id === id);
    if (!item) return;
    
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const modal = document.getElementById('detailModal');

    if (title) title.innerText = item.company;
    if (body) {
        body.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div><label style="font-size:11px; font-weight:700; color:#9CA3AF;">RP NAME</label><p style="font-weight:600; color:#1B2430;">${item.rp}</p></div>
                <div><label style="font-size:11px; font-weight:700; color:#9CA3AF;">CIN</label><p style="font-weight:600; color:#1B2430;">${item.cin}</p></div>
                <div><label style="font-size:11px; font-weight:700; color:#9CA3AF;">STATUS</label><p style="font-weight:600; color:#1B2430;">${item.status}</p></div>
                <div><label style="font-size:11px; font-weight:700; color:#9CA3AF;">DATE</label><p style="font-weight:600; color:#1B2430;">${item.date}</p></div>
                <div style="grid-column: span 2;">
                    <label style="font-size:11px; font-weight:700; color:#9CA3AF;">REMARKS</label>
                    <div style="background:#F9F5F0; padding:10px; border-left:3px solid #D4AF37; font-size:13px;">${item.remarks}</div>
                </div>
            </div>
        `;
    }
    if (modal) modal.classList.add('active');
}

window.closeModal = function() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
}

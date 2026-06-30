document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const token = localStorage.getItem('ams_token');
    if (!token) window.location.href = 'login.html';

    const userRole = localStorage.getItem('ams_role');
    const userName = localStorage.getItem('ams_user');
    
    // RBAC logic
    if (userRole === 'Viewer') {
        document.body.classList.add('role-viewer');
    }
    document.getElementById('userName').textContent = userName;
    document.getElementById('userRoleBadge').textContent = userRole;
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // Global State
    let currentPage = 1;
    let currentDeptId = 'all';
    let currentSearch = '';
    let departments = [];

    // DOM Elements
    const tableBody = document.getElementById('tableBody');
    const deptTitle = document.getElementById('deptTitle');
    const searchInput = document.getElementById('searchInput');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const sidebarNav = document.getElementById('sidebarNav');
    
    // Chart instances
    let condChart, deptDistributionChart;

    // Fetch initial data
    initDashboard();

    async function fetchAPI(endpoint, options = {}) {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        const res = await fetch(endpoint, { ...options, headers });
        if (res.status === 401 || res.status === 403) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    }

    async function initDashboard() {
        try {
            // Load Departments
            departments = await fetchAPI('/api/departments');
            renderDepartments();

            // Load Assets & Analytics
            await fetchAssets();
            await fetchAnalytics();
        } catch (err) {
            showToast('Failed to load dashboard data', 'error');
        }
    }

    function renderDepartments() {
        const deptSelect = document.getElementById('itemDept');
        deptSelect.innerHTML = '';
        
        departments.forEach(dept => {
            // Sidebar
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'nav-item';
            a.setAttribute('data-dept-id', dept.id);
            a.innerHTML = `<ion-icon name="folder-outline"></ion-icon><span>${dept.name}</span>`;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
                a.classList.add('active');
                currentDeptId = dept.id;
                deptTitle.textContent = dept.name + ' Assets';
                currentPage = 1;
                fetchAssets();
            });
            sidebarNav.appendChild(a);

            // Modal select
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            deptSelect.appendChild(option);
        });
        
        // Add click to overview
        document.querySelector('.sidebar-nav .nav-item[data-dept="all"]').addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentDeptId = 'all';
            deptTitle.textContent = 'Asset Overview';
            currentPage = 1;
            fetchAssets();
        });
    }

    async function fetchAssets() {
        try {
            const data = await fetchAPI(`/api/assets?page=${currentPage}&limit=10&search=${currentSearch}&deptId=${currentDeptId}`);
            renderTable(data);
        } catch(err) {
            showToast('Failed to fetch assets', 'error');
        }
    }

    function renderTable(data) {
        tableBody.innerHTML = '';
        document.getElementById('totalAssets').textContent = data.total;
        
        pageInfo.textContent = `Page ${data.page} of ${data.totalPages || 1}`;
        prevPageBtn.disabled = data.page <= 1;
        nextPageBtn.disabled = data.page >= data.totalPages;

        data.data.forEach(asset => {
            // Logic for status badge
            let status = asset.condition.replace(' ', '.');
            let maintText = asset.next_maintenance || 'N/A';
            
            // Check overdue logic
            if (asset.next_maintenance) {
                const diff = (new Date(asset.next_maintenance) - new Date()) / (1000*60*60*24);
                if (diff < 0) {
                    status = 'danger';
                    maintText = `<span style="color:var(--danger);font-weight:600">Overdue</span>`;
                } else if (diff < 30) {
                    status = 'warning';
                    maintText = `<span style="color:var(--warning)">Due Soon</span>`;
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="asset-title">${asset.name}</div>
                    <div class="asset-sub">${asset.category} | ${asset.department_name}</div>
                </td>
                <td>
                    <div>${asset.location || '-'}</div>
                    <div class="asset-sub">${asset.assigned_to ? '👤 ' + asset.assigned_to : 'Unassigned'}</div>
                </td>
                <td>${asset.quantity}</td>
                <td><span class="status-badge ${status}">${asset.condition}</span></td>
                <td>${maintText}</td>
                <td class="admin-only">
                    <button class="btn-icon delete" title="Delete Asset" data-id="${asset.id}"><ion-icon name="trash-outline"></ion-icon></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Re-attach delete listeners
        document.querySelectorAll('.btn-icon.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Are you sure you want to completely delete this asset?')) {
                    try {
                        await fetchAPI(`/api/assets/${id}`, { method: 'DELETE' });
                        showToast('Asset deleted successfully');
                        fetchAssets();
                        fetchAnalytics();
                    } catch(err) {
                        showToast('Error deleting asset', 'error');
                    }
                }
            });
        });
    }

    async function fetchAnalytics() {
        try {
            const data = await fetchAPI('/api/analytics/dashboard');
            
            // Render Activity Feed
            const activityList = document.getElementById('activityList');
            activityList.innerHTML = '';
            data.recentActivity.forEach(act => {
                const date = new Date(act.timestamp).toLocaleString();
                const div = document.createElement('div');
                div.className = 'activity-item';
                div.innerHTML = `
                    <span class="activity-time">${date}</span>
                    <span class="activity-user">${act.username}</span> ${act.details}
                `;
                activityList.appendChild(div);
            });

            // Render Charts
            renderCharts(data.conditionBreakdown, data.departmentDistribution);

        } catch (err) {
            console.error('Analytics load error', err);
        }
    }

    function renderCharts(condData, deptData) {
        if(condChart) condChart.destroy();
        if(deptDistributionChart) deptDistributionChart.destroy();

        // Chart defaults
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';

        // Condition Chart
        const condCtx = document.getElementById('conditionChart').getContext('2d');
        const condLabels = condData.map(d => d.condition);
        const condCounts = condData.map(d => d.count);
        condChart = new Chart(condCtx, {
            type: 'doughnut',
            data: {
                labels: condLabels,
                datasets: [{
                    data: condCounts,
                    backgroundColor: ['#22c55e', '#6366f1', '#f59e0b', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '75%', plugins: { legend: { position: 'right' } } }
        });

        // Dept Chart
        const deptCtx = document.getElementById('deptChart').getContext('2d');
        const deptLabels = deptData.map(d => d.name);
        const deptCounts = deptData.map(d => d.count);
        deptDistributionChart = new Chart(deptCtx, {
            type: 'bar',
            data: {
                labels: deptLabels,
                datasets: [{
                    label: 'Assets',
                    data: deptCounts,
                    backgroundColor: '#6366f1',
                    borderRadius: 4
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { beginAtZero: true } }
            }
        });
    }

    // Search and Pagination Events
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            fetchAssets();
        }, 300);
    });

    prevPageBtn.addEventListener('click', () => { if(currentPage > 1) { currentPage--; fetchAssets(); } });
    nextPageBtn.addEventListener('click', () => { currentPage++; fetchAssets(); });

    // Modal Logic
    const addModal = document.getElementById('addModal');
    const addAssetForm = document.getElementById('addAssetForm');
    
    document.getElementById('addAssetBtn')?.addEventListener('click', () => addModal.classList.add('active'));
    document.querySelector('.close-btn').addEventListener('click', () => addModal.classList.remove('active'));

    addAssetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            name: document.getElementById('itemName').value,
            category: document.getElementById('itemCategory').value,
            department_id: document.getElementById('itemDept').value,
            quantity: document.getElementById('itemQty').value,
            condition: document.getElementById('itemCondition').value,
            asset_value: document.getElementById('itemValue').value,
            location: document.getElementById('itemLocation').value,
            assigned_to: document.getElementById('itemAssignee').value
        };

        try {
            await fetchAPI('/api/assets', { method: 'POST', body: JSON.stringify(payload) });
            addModal.classList.remove('active');
            addAssetForm.reset();
            showToast('Asset added successfully!');
            fetchAssets();
            fetchAnalytics();
        } catch (err) {
            showToast('Failed to add asset', 'error');
        }
    });

    // CSV Export
    document.getElementById('exportBtn').addEventListener('click', () => {
        showToast('Exporting data to CSV...');
        // In a real app we'd fetch all (or a dedicated export API). Here we just demo toast.
        setTimeout(() => { showToast('CSV Export functionality not yet implemented in backend', 'warning'); }, 1000);
    });

    function showToast(message, type='success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});

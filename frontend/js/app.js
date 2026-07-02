const API_BASE = '/api';

// DOM Elements
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

// State
let currentUser = null;

// Utilities
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast alert-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Auth Management
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function requireAuth() {
    currentUser = getUser();
    if (!getToken() || !currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (currentUser.password_reset_required && !window.location.pathname.includes('login.html')) {
        // Redirect to login to force reset
        window.location.href = 'login.html?reset=true';
        return false;
    }
    
    renderNavbar();
    return true;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// API Fetch Wrapper
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                if (data.requiresReset) {
                    window.location.href = 'login.html?reset=true';
                } else {
                    logout();
                }
            }
            throw new Error(data.error || 'API Error');
        }
        
        return data;
    } catch (err) {
        showToast(err.message, 'danger');
        throw err;
    }
}

// Render Navbar
function renderNavbar() {
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';
    
    const links = [
        { label: 'Dashboard', href: 'dashboard.html', roles: ['Admin', 'Engineer', 'Worker'] },
        { label: 'Locomotives', href: 'locos.html', roles: ['Admin', 'Engineer', 'Worker'] },
        { label: 'Issues', href: 'issues.html', roles: ['Admin', 'Engineer', 'Worker'] },
        { label: 'Reports', href: 'reports.html', roles: ['Admin'] },
        { label: 'Users', href: 'users.html', roles: ['Admin'] }
    ];

    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

    const linksHtml = links
        .filter(link => link.roles.includes(currentUser.role))
        .map(link => `<a href="${link.href}" class="${currentPath === link.href ? 'active' : ''}">${link.label}</a>`)
        .join('');

    navbar.innerHTML = `
        <div class="navbar-brand">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
            BLW Varanasi
        </div>
        <div class="navbar-links">
            ${linksHtml}
        </div>
        <div class="navbar-user">
            <span>${currentUser.name} | ${currentUser.role}</span>
            <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
    `;

    document.body.insertBefore(navbar, document.body.firstChild);
}

// Global Exports
window.apiFetch = apiFetch;
window.showToast = showToast;
window.requireAuth = requireAuth;
window.getUser = getUser;
window.logout = logout;

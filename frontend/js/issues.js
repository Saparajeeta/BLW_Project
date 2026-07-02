document.addEventListener('DOMContentLoaded', async () => {
    if (!currentUser) return;

    await loadIssues();

    // Log Issue
    document.getElementById('logIssueBtn').addEventListener('click', () => {
        document.getElementById('logIssueModal').classList.remove('hidden');
    });

    document.getElementById('logIssueForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            loco_number: document.getElementById('locoNumber').value,
            issue_type: document.getElementById('issueType').value,
            severity: document.getElementById('issueSeverity').value,
            description: document.getElementById('issueDesc').value
        };

        try {
            await window.apiFetch('/issues', { method: 'POST', body: JSON.stringify(body) });
            window.showToast('Issue logged successfully', 'success');
            document.getElementById('logIssueModal').classList.add('hidden');
            document.getElementById('logIssueForm').reset();
            loadIssues();
        } catch (err) {}
    });

    // Update Issue
    document.getElementById('resolveIssueForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const issueId = document.getElementById('updateIssueId').value;
        const body = {
            status: document.getElementById('updateStatus').value,
            resolution_notes: document.getElementById('resNotes').value
        };

        try {
            await window.apiFetch(`/issues/${issueId}`, { method: 'PUT', body: JSON.stringify(body) });
            window.showToast('Issue status updated', 'success');
            document.getElementById('resolveIssueModal').classList.add('hidden');
            document.getElementById('resolveIssueForm').reset();
            loadIssues();
        } catch (err) {}
    });
});

async function loadIssues() {
    try {
        const issues = await window.apiFetch('/issues');
        const tbody = document.getElementById('issuesTableBody');
        
        if (issues.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No issues found.</td></tr>';
            return;
        }

        tbody.innerHTML = issues.map(issue => {
            let severityBadge = 'info';
            if (issue.severity === 'Critical') severityBadge = 'danger';
            if (issue.severity === 'High') severityBadge = 'warning';
            
            let statusBadge = issue.status === 'Resolved' ? 'success' : 'warning';
            
            let actionBtn = '--';
            if (['Admin', 'Engineer'].includes(currentUser.role) && issue.status !== 'Resolved') {
                actionBtn = `<button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="openResolve(${issue.id})">Update</button>`;
            }

            return `
                <tr>
                    <td><strong>${issue.loco_number}</strong></td>
                    <td>${new Date(issue.created_at).toLocaleString()}</td>
                    <td>${issue.issue_type}</td>
                    <td><span class="badge ${severityBadge}">${issue.severity}</span></td>
                    <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${issue.description}">${issue.description}</td>
                    <td>${issue.logged_by_name}</td>
                    <td><span class="badge ${statusBadge}">${issue.status}</span></td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {}
}

window.openResolve = function(id) {
    document.getElementById('updateIssueId').value = id;
    document.getElementById('resolveIssueModal').classList.remove('hidden');
};

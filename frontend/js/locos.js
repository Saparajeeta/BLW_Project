let allLocos = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!currentUser) return;
    
    if (['Admin', 'Engineer'].includes(currentUser.role)) {
        document.getElementById('addLocoBtn').style.display = 'block';
    }
    
    await loadLocos();

    // Search filtering
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allLocos.filter(l => l.loco_number.toLowerCase().includes(query));
        renderLocosTable(filtered);
    });

    // Add Loco
    document.getElementById('addLocoBtn').addEventListener('click', () => {
        document.getElementById('addLocoModal').classList.remove('hidden');
    });

    document.getElementById('addLocoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            loco_number: document.getElementById('locoNumber').value,
            model: document.getElementById('locoModel').value,
            start_date: document.getElementById('startDate').value,
            target_dispatch_date: document.getElementById('targetDate').value
        };

        try {
            await window.apiFetch('/locos', { method: 'POST', body: JSON.stringify(body) });
            window.showToast('Locomotive added to production pipeline', 'success');
            document.getElementById('addLocoModal').classList.add('hidden');
            document.getElementById('addLocoForm').reset();
            loadLocos();
        } catch (err) {}
    });

    // Update Stage Submit
    document.getElementById('updateStageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const locoNumber = document.getElementById('updateLocoNumber').value;
        const action = document.getElementById('stageAction').value;
        const remarks = document.getElementById('stageRemarks').value;
        
        let dispatch_details = null;
        if (!document.getElementById('dispatchFields').classList.contains('hidden') && action === 'Forward') {
            dispatch_details = {
                destination_zone: document.getElementById('destZone').value,
                receiving_shed: document.getElementById('receivingShed').value,
                consignment_number: document.getElementById('consignmentNum').value,
                dispatch_date: new Date().toISOString().split('T')[0]
            };
        }

        try {
            await window.apiFetch(`/locos/${locoNumber}/stage`, { 
                method: 'POST', 
                body: JSON.stringify({ action, remarks, dispatch_details }) 
            });
            window.showToast(`Loco ${locoNumber} stage updated successfully. Logged by ${currentUser.name}.`, 'success');
            document.getElementById('updateStageModal').classList.add('hidden');
            document.getElementById('updateStageForm').reset();
            loadLocos();
        } catch (err) {}
    });

    document.getElementById('stageAction').addEventListener('change', (e) => {
        const locoNumber = document.getElementById('updateLocoNumber').value;
        const loco = allLocos.find(l => l.loco_number === locoNumber);
        
        // Show dispatch fields if next stage is dispatch
        if (loco && loco.current_stage === 'Ready for Dispatch' && e.target.value === 'Forward') {
            document.getElementById('dispatchFields').classList.remove('hidden');
            document.getElementById('destZone').required = true;
            document.getElementById('receivingShed').required = true;
            document.getElementById('consignmentNum').required = true;
        } else {
            document.getElementById('dispatchFields').classList.add('hidden');
            document.getElementById('destZone').required = false;
            document.getElementById('receivingShed').required = false;
            document.getElementById('consignmentNum').required = false;
        }
    });
});

async function loadLocos() {
    try {
        allLocos = await window.apiFetch('/locos');
        renderLocosTable(allLocos);
    } catch (err) {}
}

function renderLocosTable(locos) {
    const tbody = document.getElementById('locosTableBody');
    if (locos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No locomotives found.</td></tr>';
        return;
    }

    tbody.innerHTML = locos.map(loco => {
        const statusBadge = loco.status === 'Completed' ? 'success' : 'info';
        
        let actions = `<a href="loco-detail.html?loco=${loco.loco_number}" class="text-accent" style="margin-right: 1rem;">View Details →</a>`;
        
        if (['Admin', 'Engineer'].includes(currentUser.role) && loco.status !== 'Completed') {
            actions += `<button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="openUpdateStage('${loco.loco_number}', '${loco.current_stage}')">Update Stage</button>`;
        }

        return `
            <tr>
                <td><strong>${loco.loco_number}</strong></td>
                <td>${loco.model}</td>
                <td>${loco.start_date}</td>
                <td>${loco.target_dispatch_date}</td>
                <td>${loco.current_stage}</td>
                <td><span class="badge ${statusBadge}">${loco.status}</span></td>
                <td>${actions}</td>
            </tr>
        `;
    }).join('');
}

window.openUpdateStage = function(locoNumber, currentStage) {
    document.getElementById('updateLocoNumber').value = locoNumber;
    document.getElementById('updateStageTitle').textContent = `Update Stage: ${locoNumber} (${currentStage})`;
    
    if (currentStage === 'Ready for Dispatch') {
        document.getElementById('stageAction').value = 'Forward';
        document.getElementById('dispatchFields').classList.remove('hidden');
    } else {
        document.getElementById('dispatchFields').classList.add('hidden');
    }
    
    document.getElementById('updateStageModal').classList.remove('hidden');
};

window.initDashboardChart = function(stageData, stages) {
    const ctx = document.getElementById('stageChart').getContext('2d');
    
    const dataCounts = stages.map(stage => {
        const item = stageData.find(s => s.current_stage === stage);
        return item ? item.count : 0;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stages,
            datasets: [{
                label: 'Locos in Stage',
                data: dataCounts,
                backgroundColor: '#f97316',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#94a3b8', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
};

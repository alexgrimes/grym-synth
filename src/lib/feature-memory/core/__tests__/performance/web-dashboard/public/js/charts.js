const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 300
    },
    scales: {
        x: {
            type: 'time',
            time: {
                unit: 'second',
                displayFormats: {
                    second: 'HH:mm:ss'
                }
            },
            grid: {
                display: false
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.1)'
            }
        }
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            mode: 'index',
            intersect: false
        }
    }
};

const createGradient = (ctx, color) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    return gradient;
};

export function createCharts() {
    const cpuCtx = document.getElementById('cpuChart').getContext('2d');
    const memoryCtx = document.getElementById('memoryChart').getContext('2d');
    const loadCtx = document.getElementById('loadChart').getContext('2d');
    const historyCtx = document.getElementById('historyChart').getContext('2d');

    const cpuChart = new Chart(cpuCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'CPU Usage',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: createGradient(cpuCtx, 'rgba(75, 192, 192, 0.2)'),
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...defaultOptions,
            scales: {
                ...defaultOptions.scales,
                y: {
                    ...defaultOptions.scales.y,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Usage %'
                    }
                }
            }
        }
    });

    const memoryChart = new Chart(memoryCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Memory Usage',
                data: [],
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: createGradient(memoryCtx, 'rgba(54, 162, 235, 0.2)'),
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...defaultOptions,
            scales: {
                ...defaultOptions.scales,
                y: {
                    ...defaultOptions.scales.y,
                    title: {
                        display: true,
                        text: 'Memory (MB)'
                    }
                }
            }
        }
    });

    const loadChart = new Chart(loadCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'System Load',
                data: [],
                borderColor: 'rgb(153, 102, 255)',
                backgroundColor: createGradient(loadCtx, 'rgba(153, 102, 255, 0.2)'),
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: defaultOptions
    });

    const historyChart = new Chart(historyCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Historical Data',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: createGradient(historyCtx, 'rgba(255, 99, 132, 0.2)'),
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...defaultOptions,
            plugins: {
                ...defaultOptions.plugins,
                legend: {
                    display: true
                }
            }
        }
    });

    return {
        cpu: cpuChart,
        memory: memoryChart,
        load: loadChart,
        history: historyChart
    };
}
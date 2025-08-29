// Global variables to store loaded data
let umapProposed = null;
let umapOriginal = null;
let cellLabels = null;
let cellMetadata = null;
let labelMapping = null;
let uniqueCellTypes = [];
let colorMap = {};



// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    updateUIFromConfig();
    // showLoadingMessage('Loading data and creating visualization...');
    loadData();
    setupEventListeners();
});

// Update UI elements from configuration
function updateUIFromConfig() {
    // Update page title
    document.title = CONFIG.ui.title;
    
    // Update header
    const mainTitle = document.getElementById('main-title');
    const mainSubtitle = document.getElementById('main-subtitle');
    
    if (mainTitle) mainTitle.textContent = CONFIG.ui.title;
    if (mainSubtitle) mainSubtitle.textContent = CONFIG.ui.subtitle;
}

// Load all data files
async function loadData() {
    try {
        console.log('Loading data files from', CONFIG.dataset.dataPath);
        
        // Load all data files in parallel
        const dataPath = CONFIG.dataset.dataPath;
        const [proposedData, originalData, labelsData, labelMappingData, cellMetadataData] = await Promise.all([
            fetch(dataPath + 'Z_umap_proposed.json').then(response => {
                if (!response.ok) throw new Error(`Failed to load proposed data: ${response.status}`);
                return response.json();
            }),
            fetch(dataPath + 'Z_umap_original.json').then(response => {
                if (!response.ok) throw new Error(`Failed to load original UMAP data: ${response.status}`);
                return response.json();
            }),
            fetch(dataPath + 'y.json').then(response => {
                if (!response.ok) throw new Error(`Failed to load cell labels: ${response.status}`);
                return response.json();
            }),
            fetch(dataPath + 'label_mapping.json').then(response => {
                if (!response.ok) throw new Error(`Failed to load label mapping: ${response.status}`);
                return response.json();
            }),
            fetch(dataPath + 'cell_metadata.json').then(response => {
                if (!response.ok) throw new Error(`Failed to load cell metadata: ${response.status}`);
                return response.json();
            })
        ]);
        
        // Extract data arrays
        umapProposed = proposedData.data;
        umapOriginal = originalData.data;
        cellLabels = labelsData.data;
        labelMapping = labelMappingData;
        cellMetadata = cellMetadataData;
        
        console.log('✅ Data loaded successfully:');
        console.log('  Proposed:', umapProposed.length, 'points');
        console.log('  Original UMAP:', umapOriginal.length, 'points');
        console.log('  Cell labels:', cellLabels.length, 'labels');
        console.log('  Label mapping:', Object.keys(labelMapping.label_to_idx).length, 'cell types');
        console.log('  Cell metadata:', cellMetadata.cell_ids.length, 'cells');
        
        // Process cell types
        processCellTypes();
        
        // Update UI
        updateCellTypeDropdown();
        updateStats();
        
        // Create initial plot
        createPlot();
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showError(`Failed to load data: ${error.message}. Please check that the data files exist in ${CONFIG.dataset.dataPath}`);
    }
}

// Process cell types and create color mapping
function processCellTypes() {
    // Get unique cell types
    uniqueCellTypes = [...new Set(cellLabels)].sort((a, b) => a - b);
    
    // Create color mapping
    uniqueCellTypes.forEach((cellType, index) => {
        colorMap[cellType] = CONFIG.colors[index % CONFIG.colors.length];
    });
    
    console.log('Unique cell types:', uniqueCellTypes);
    console.log('Color mapping created for', Object.keys(colorMap).length, 'cell types');
    
    // Log some example mappings
    if (labelMapping && uniqueCellTypes.length > 0) {
        console.log('Example label mappings:');
        uniqueCellTypes.slice(0, 5).forEach(cellType => {
            const cellTypeName = labelMapping.idx_to_label[cellType.toString()];
            console.log(`  ${cellType} -> ${cellTypeName}`);
        });
    }
}

// Update cell type dropdown
function updateCellTypeDropdown() {
    const dropdown = document.getElementById('cell-type-select');
    
    // Clear existing options except "All"
    dropdown.innerHTML = '<option value="all">All Cell Types</option>';
    
    // Add cell type options with both index and name
    uniqueCellTypes.forEach(cellType => {
        const option = document.createElement('option');
        option.value = cellType;
        
        // Get cell type name from mapping
        const cellTypeName = labelMapping ? labelMapping.idx_to_label[cellType.toString()] : `Type ${cellType}`;
        option.textContent = `${cellType} - ${cellTypeName}`;
        
        dropdown.appendChild(option);
    });
}

// Update statistics panel
function updateStats() {
    const statsContent = document.getElementById('stats-content');
    const selectedCellType = document.getElementById('cell-type-select').value;
    
    if (selectedCellType === 'all') {
        // Show overall statistics
        const cellTypeCounts = {};
        cellLabels.forEach(label => {
            cellTypeCounts[label] = (cellTypeCounts[label] || 0) + 1;
        });
        
        let statsHTML = `
            <div class="stat-item">
                <div class="stat-label">Total Cells</div>
                <div class="stat-value">${cellLabels.length.toLocaleString()}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Cell Types</div>
                <div class="stat-value">${uniqueCellTypes.length}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Dataset</div>
                <div class="stat-value">${CONFIG.dataset.name}</div>
            </div>
        `;
        
        // Add cell type distribution
        statsHTML += '<div class="stat-item"><div class="stat-label">Cell Type Distribution</div></div>';
        Object.entries(cellTypeCounts)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .forEach(([cellType, count]) => {
                const percentage = ((count / cellLabels.length) * 100).toFixed(1);
                const cellTypeName = labelMapping ? labelMapping.idx_to_label[cellType.toString()] : `Type ${cellType}`;
                statsHTML += `
                    <div class="stat-item">
                        <div class="stat-value">${cellType} - ${cellTypeName}: ${count.toLocaleString()} (${percentage}%)</div>
                    </div>
                `;
            });
        
        statsContent.innerHTML = statsHTML;
    } else {
        // Show selected cell type statistics
        const count = cellLabels.filter(label => label === parseInt(selectedCellType)).length;
        const percentage = ((count / cellLabels.length) * 100).toFixed(1);
        
        const cellTypeName = labelMapping ? labelMapping.idx_to_label[selectedCellType.toString()] : `Type ${selectedCellType}`;
        statsContent.innerHTML = `
            <div class="stat-item">
                <div class="stat-label">Selected Cell Type</div>
                <div class="stat-value">${selectedCellType} - ${cellTypeName}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Count</div>
                <div class="stat-value">${count.toLocaleString()}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Percentage</div>
                <div class="stat-value">${percentage}%</div>
            </div>
        `;
    }
}

// Create the UMAP plot
function createPlot() {
    const method = document.getElementById('method-select').value;
    const selectedCellType = document.getElementById('cell-type-select').value;
    
    if (method === 'both') {
        createComparisonPlot(selectedCellType);
    } else {
        createSinglePlot(method, selectedCellType);
    }
}

// Create comparison plot (side by side)
function createComparisonPlot(selectedCellType) {
    const traces = [];
    
    // Create traces for both methods
    ['proposed', 'original'].forEach((method, methodIndex) => {
        const umapData = method === 'proposed' ? umapProposed : umapOriginal;
        const methodName = method === 'proposed' ? 'P' : 'O';
        
        uniqueCellTypes.forEach(cellType => {
            const isHighlighted = selectedCellType !== 'all' && cellType === parseInt(selectedCellType);
            
            // Filter data for this cell type
            const cellIndices = cellLabels.map((label, index) => label === cellType ? index : -1).filter(i => i !== -1);
            const x = cellIndices.map(i => umapData[i][0]);
            const y = cellIndices.map(i => umapData[i][1]);
            
            if (x.length > 0) {
                // Get cell IDs for this cell type
                const cellIds = cellIndices.map(i => cellMetadata ? cellMetadata.cell_ids[i] : `Cell_${i}`);
                
                traces.push({
                    x: x,
                    y: y,
                    customdata: cellIds,
                    mode: 'markers',
                    type: 'scatter',
                    name: `${cellType} - ${labelMapping ? labelMapping.idx_to_label[cellType.toString()] : 'Unknown'}`,
                    marker: {
                        size: isHighlighted ? CONFIG.visualization.markerSize.highlighted : CONFIG.visualization.markerSize.normal,
                        opacity: isHighlighted ? CONFIG.visualization.opacity.highlighted : CONFIG.visualization.opacity.normal,
                        color: colorMap[cellType],
                        line: isHighlighted ? { width: 2, color: '#333' } : undefined
                    },
                    hovertemplate: `
                        <b>Cell Type ${cellType} - ${labelMapping ? labelMapping.idx_to_label[cellType.toString()] : 'Unknown'}</b><br>
                        Cell ID: %{customdata}<br>
                        UMAP1: %{x:.3f}<br>
                        UMAP2: %{y:.3f}<br>
                        Method: ${methodName}<br>
                        <extra></extra>
                    `,
                    showlegend: methodIndex === 0, // Only show legend for first method
                    legendgroup: `type_${cellType}`,
                    xaxis: methodIndex === 0 ? 'x' : 'x2',
                    yaxis: methodIndex === 0 ? 'y' : 'y2'
                });
            }
        });
    });
    
    const layout = {
        title: {
            text: '',
            font: { size: 20 }
        },
        grid: {
            rows: 1,
            columns: 2,
            pattern: 'independent'
        },
        xaxis: { title: 'UMAP 1 (Proposed)', domain: [0, 0.48] },
        yaxis: { title: 'UMAP 2 (Proposed)', domain: [0, 1] },
        xaxis2: { title: 'UMAP 1 (Original)', domain: [0.52, 1] },
        yaxis2: { title: 'UMAP 2 (Original)', domain: [0, 1] },
        showlegend: true,
        legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1
        },
        height: CONFIG.visualization.plotHeight,
        margin: { l: 50, r: 50, t: 80, b: 50 }
    };
    
    const config = {
        responsive: CONFIG.plotly.responsive,
        displayModeBar: CONFIG.plotly.displayModeBar,
        modeBarButtonsToRemove: CONFIG.plotly.modeBarButtonsToRemove,
        displaylogo: CONFIG.plotly.displaylogo
    };
    
    Plotly.newPlot('umap-plot', traces, layout, config);
}

// Create single plot
function createSinglePlot(method, selectedCellType) {
    const traces = [];
    const umapData = method === 'proposed' ? umapProposed : umapOriginal;
    const methodName = method === 'proposed' ? 'Proposed' : 'Original';
    
    uniqueCellTypes.forEach(cellType => {
        const isHighlighted = selectedCellType !== 'all' && cellType === parseInt(selectedCellType);
        
        // Filter data for this cell type
        const cellIndices = cellLabels.map((label, index) => label === cellType ? index : -1).filter(i => i !== -1);
        const x = cellIndices.map(i => umapData[i][0]);
        const y = cellIndices.map(i => umapData[i][1]);
        
        if (x.length > 0) {
            // Get cell IDs for this cell type
            const cellIds = cellIndices.map(i => cellMetadata ? cellMetadata.cell_ids[i] : `Cell_${i}`);
            
            traces.push({
                x: x,
                y: y,
                customdata: cellIds,
                mode: 'markers',
                type: 'scatter',
                name: `${cellType} - ${labelMapping ? labelMapping.idx_to_label[cellType.toString()] : 'Unknown'}`,
                marker: {
                    size: isHighlighted ? CONFIG.visualization.markerSize.highlighted : CONFIG.visualization.markerSize.normal,
                    opacity: isHighlighted ? CONFIG.visualization.opacity.highlighted : CONFIG.visualization.opacity.normal,
                    color: colorMap[cellType],
                    line: isHighlighted ? { width: 2, color: '#333' } : undefined
                },
                hovertemplate: `
                    <b>Cell Type ${cellType} - ${labelMapping ? labelMapping.idx_to_label[cellType.toString()] : 'Unknown'}</b><br>
                    Cell ID: %{customdata}<br>
                    UMAP1: %{x:.3f}<br>
                    UMAP2: %{y:.3f}<br>
                    Method: ${methodName}<br>
                    <extra></extra>
                `
            });
        }
    });
    
    const layout = {
        title: {
            text: `${methodName} UMAP - ${CONFIG.dataset.name} Dataset`,
            font: { size: 20 }
        },
        xaxis: { title: 'UMAP 1' },
        yaxis: { title: 'UMAP 2' },
        showlegend: true,
        height: CONFIG.visualization.plotHeight,
        margin: { l: 50, r: 50, t: 80, b: 50 }
    };
    
    const config = {
        responsive: CONFIG.plotly.responsive,
        displayModeBar: CONFIG.plotly.displayModeBar,
        modeBarButtonsToRemove: CONFIG.plotly.modeBarButtonsToRemove,
        displaylogo: CONFIG.plotly.displaylogo
    };
    
    Plotly.newPlot('umap-plot', traces, layout, config);
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('method-select').addEventListener('change', createPlot);
    document.getElementById('cell-type-select').addEventListener('change', function() {
        updateStats();
        createPlot();
    });
}

// Show loading message
function showLoadingMessage(message) {
    const plotContainer = document.getElementById('umap-plot');
    plotContainer.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            ${message}
        </div>
    `;
    
    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Loading...
        </div>
    `;
}

// Show error message
function showError(message) {
    const plotContainer = document.getElementById('umap-plot');
    plotContainer.innerHTML = `<div class="error">${message}</div>`;
    
    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = `<div class="error">${message}</div>`;
}

// Handle window resize
window.addEventListener('resize', function() {
    if (umapProposed && umapOriginal && cellLabels) {
        createPlot();
    }
});

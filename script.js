// Global variables to store loaded data
let umapProposed = null;
let umapOriginal = null;
let cellLabels = null;
let cellMetadata = null;
let detailedCellMetadata = null;
let labelMapping = null;
let uniqueCellTypes = [];
let colorMap = {};

// Color palettes based on number of unique labels (similar to Python implementation)
const COLOR_PALETTES = {
    // For ≤ 10 labels: tab10 equivalent
    tab10: [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ],
    // For ≤ 20 labels: tab20 equivalent
    tab20: [
        '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c',
        '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
        '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
        '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
    ],
    // For ≤ 40 labels: tab20b equivalent
    tab20b: [
        '#393b79', '#5254a3', '#6b6ecf', '#9c9ede', '#637939',
        '#8ca252', '#b5cf6b', '#cedb9c', '#8c6d31', '#bd9e39',
        '#e7ba52', '#e7cb94', '#843c39', '#ad494a', '#d6616b',
        '#e7969c', '#7b4173', '#a55194', '#ce6dbd', '#de9ed6'
    ],
    // For ≤ 64 labels: tab20c equivalent
    tab20c: [
        '#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#e6550d',
        '#fd8d3c', '#fdae6b', '#fdd0a2', '#31a354', '#74c476',
        '#a1d99b', '#c7e9c0', '#756bb1', '#9e9ac8', '#bcbddc',
        '#dadaeb', '#636363', '#969696', '#bdbdbd', '#d9d9d9'
    ],
    // For > 64 labels: viridis equivalent (continuous)
    viridis: [
        '#440154', '#482878', '#3e4989', '#31688e', '#26828e',
        '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'
    ]
};



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
        const [proposedData, originalData, labelsData, labelMappingData, cellMetadataData, detailedCellMetadataData] = await Promise.all([
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
            }),
            fetch(dataPath + 'detailed_cell_metadata.json').then(response => {
                if (!response.ok) throw new Error(`Failed to load detailed cell metadata: ${response.status}`);
                return response.json();
            })
        ]);
        
        // Extract data arrays
        umapProposed = proposedData.data;
        umapOriginal = originalData.data;
        cellLabels = labelsData.data;
        labelMapping = labelMappingData;
        cellMetadata = cellMetadataData;
        detailedCellMetadata = detailedCellMetadataData;
        
        console.log('✅ Data loaded successfully:');
        console.log('  Proposed:', umapProposed.length, 'points');
        console.log('  Original UMAP:', umapOriginal.length, 'points');
        console.log('  Cell labels:', cellLabels.length, 'labels');
        console.log('  Label mapping:', Object.keys(labelMapping.label_to_idx).length, 'cell types');
        console.log('  Cell metadata:', cellMetadata.cell_ids.length, 'cells');
        console.log('  Detailed metadata:', Object.keys(detailedCellMetadata).length, 'cells');
        
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

// Function to select color palette based on number of unique labels
function selectColorPalette(numUniqueLabels) {
    if (numUniqueLabels <= 10) {
        return COLOR_PALETTES.tab10;
    } else if (numUniqueLabels <= 20) {
        return COLOR_PALETTES.tab20;
    } else if (numUniqueLabels <= 40) {
        return COLOR_PALETTES.tab20b;
    } else if (numUniqueLabels <= 64) {
        return COLOR_PALETTES.tab20c;
    } else {
        return COLOR_PALETTES.viridis;
    }
}

// Function to generate continuous colors for many labels (viridis-like)
function generateContinuousColors(numColors) {
    const colors = [];
    const viridisColors = COLOR_PALETTES.viridis;
    
    for (let i = 0; i < numColors; i++) {
        const t = i / (numColors - 1);
        const colorIndex = t * (viridisColors.length - 1);
        const lowIndex = Math.floor(colorIndex);
        const highIndex = Math.min(lowIndex + 1, viridisColors.length - 1);
        const fraction = colorIndex - lowIndex;
        
        if (lowIndex === highIndex) {
            colors.push(viridisColors[lowIndex]);
        } else {
            // Simple linear interpolation between colors
            const lowColor = viridisColors[lowIndex];
            const highColor = viridisColors[highIndex];
            const interpolatedColor = interpolateColor(lowColor, highColor, fraction);
            colors.push(interpolatedColor);
        }
    }
    return colors;
}

// Helper function to interpolate between two hex colors
function interpolateColor(color1, color2, factor) {
    // Convert hex to RGB
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Process cell types and create color mapping
function processCellTypes() {
    // Get unique cell types
    uniqueCellTypes = [...new Set(cellLabels)].sort((a, b) => a - b);
    
    // Select appropriate color palette
    const numUniqueLabels = uniqueCellTypes.length;
    let selectedColors;
    
    if (numUniqueLabels <= 64) {
        selectedColors = selectColorPalette(numUniqueLabels);
    } else {
        // For many labels, generate continuous colors
        selectedColors = generateContinuousColors(numUniqueLabels);
    }
    
    // Create color mapping
    uniqueCellTypes.forEach((cellType, index) => {
        colorMap[cellType] = selectedColors[index % selectedColors.length];
    });
    
    console.log('Unique cell types:', uniqueCellTypes);
    console.log('Color mapping created for', Object.keys(colorMap).length, 'cell types');
    console.log('Selected color palette for', numUniqueLabels, 'labels');
    
    // Log some example mappings
    if (labelMapping && uniqueCellTypes.length > 0) {
        console.log('Example label mappings:');
        uniqueCellTypes.slice(0, 5).forEach(cellType => {
            const cellTypeName = labelMapping.idx_to_label[cellType.toString()];
            console.log(`  ${cellType} -> ${cellTypeName}`);
        });
    }
    
    // Log some example detailed metadata
    if (detailedCellMetadata && Object.keys(detailedCellMetadata).length > 0) {
        console.log('Example detailed metadata:');
        const firstCellId = Object.keys(detailedCellMetadata)[0];
        console.log('  First cell metadata:', detailedCellMetadata[firstCellId]);
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
                // Get cell IDs and detailed metadata for this cell type
                const cellIds = cellIndices.map(i => cellMetadata ? cellMetadata.cell_ids[i] : `Cell_${i}`);
                const detailedData = cellIds.map(cellId => {
                    const info = getDetailedCellInfo(cellId);
                    return [info.cell_id, info.sample, info.num_genes_expressed, info.n_umi, info.size_factor];
                });
                
                traces.push({
                    x: x,
                    y: y,
                    customdata: detailedData,
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
                        Cell ID: %{customdata[0]}<br>
                        Sample: %{customdata[1]}<br>
                        Genes Expressed: %{customdata[2]}<br>
                        UMI Count: %{customdata[3]}<br>
                        Size Factor: %{customdata[4]:.3f}<br>
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
        xaxis: { title: 'Proposed 1', domain: [0, 0.48] },
        yaxis: { title: 'Proposed 2', domain: [0, 1] },
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
            // Get cell IDs and detailed metadata for this cell type
            const cellIds = cellIndices.map(i => cellMetadata ? cellMetadata.cell_ids[i] : `Cell_${i}`);
            const detailedData = cellIds.map(cellId => {
                const info = getDetailedCellInfo(cellId);
                return [info.cell_id, info.sample, info.num_genes_expressed, info.n_umi, info.size_factor];
            });
            
            traces.push({
                x: x,
                y: y,
                customdata: detailedData,
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
                    Cell ID: %{customdata[0]}<br>
                    Sample: %{customdata[1]}<br>
                    Genes Expressed: %{customdata[2]}<br>
                    UMI Count: %{customdata[3]}<br>
                    Size Factor: %{customdata[4]:.3f}<br>
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
            text: `${methodName}  - ${CONFIG.dataset.name} Dataset`,
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

// Helper function to get detailed cell metadata safely
function getDetailedCellInfo(cellId) {
    if (!detailedCellMetadata || !detailedCellMetadata[cellId]) {
        return {
            cell_id: cellId,
            sample: 'Unknown',
            num_genes_expressed: 'N/A',
            n_umi: 'N/A',
            size_factor: 'N/A'
        };
    }
    return detailedCellMetadata[cellId];
}

// Handle window resize
window.addEventListener('resize', function() {
    if (umapProposed && umapOriginal && cellLabels) {
        createPlot();
    }
});

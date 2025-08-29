// Configuration file for UMAP Visualization
// Modify these settings to customize the visualization

const CONFIG = {
    // Dataset information
    dataset: {
        name: "C. elegans L2",
        description: "C. elegans L2 larval stage single-cell RNA-seq data",
        dataPath: "data/d1/"
    },
    
    // Visualization settings
    visualization: {
        defaultMethod: "both", // "both", "proposed", or "original"
        defaultCellType: "all",
        plotHeight: 1000,
        markerSize: {
            normal: 3,
            highlighted: 8
        },
        opacity: {
            normal: 0.4,
            highlighted: 1.0
        }
    },
    
    // Color palette selection (now handled dynamically based on number of cell types)
    // See COLOR_PALETTES in script.js for available palettes
    colorSelection: {
        useDynamicPalettes: true,  // Use dynamic palette selection based on cell type count
        fallbackPalette: 'tab10'   // Fallback if dynamic selection fails
    },
    
    // Plotly configuration
    plotly: {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
        displaylogo: false
    },
    
    // UI settings
    ui: {
        title: "UMAP Visualization",
        subtitle: "Interactive Scatter Plot",
        showStatistics: true,
        showControls: true
    },
    
    // Data file names
    files: {
        proposed: "Z_umap_proposed.json",
        original: "Z_umap_original.json",
        labels: "y.json",
        labelMapping: "label_mapping.json",
        cellMetadata: "cell_metadata.json",
        detailedCellMetadata: "detailed_cell_metadata.json",
        config: "experiment_config.json"
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

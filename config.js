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
    
    // Color palette for cell types
    colors: [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
        '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
        '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
    ],
    
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
        config: "experiment_config.json"
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

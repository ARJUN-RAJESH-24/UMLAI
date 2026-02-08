/**
 * UML AI - History Manager
 * Manages diagram history with localStorage persistence
 */

const HISTORY_STORAGE_KEY = 'umlai_diagram_history';
const MAX_HISTORY_ITEMS = 10;
const HISTORY_EXPIRY_HOURS = 24;

/**
 * Get all history items, filtering out expired ones
 */
function getHistory() {
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!stored) return [];

        const history = JSON.parse(stored);
        const now = Date.now();
        const expiryMs = HISTORY_EXPIRY_HOURS * 60 * 60 * 1000;

        // Filter out expired items
        const validHistory = history.filter(item => {
            return (now - item.timestamp) < expiryMs;
        });

        // Save filtered list if items were removed
        if (validHistory.length !== history.length) {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(validHistory));
        }

        return validHistory;
    } catch (e) {
        console.error('Error reading history:', e);
        return [];
    }
}

/**
 * Save a diagram to history
 * @param {Object} diagram - The diagram to save
 * @param {string} diagram.input - The original natural language input
 * @param {string} diagram.diagramType - Type of diagram (class, sequence, etc.)
 * @param {Object} diagram.ir - The intermediate representation
 * @param {string} diagram.plantUML - The generated PlantUML code
 * @param {string} diagram.mdj - The StarUML MDJ code
 */
function saveToHistory(diagram) {
    try {
        const history = getHistory();

        const newItem = {
            id: generateId(),
            timestamp: Date.now(),
            input: diagram.input,
            diagramType: diagram.diagramType,
            ir: diagram.ir,
            plantUML: diagram.plantUML,
            mdj: diagram.mdj,
            inputPreview: diagram.input.substring(0, 50) + (diagram.input.length > 50 ? '...' : '')
        };

        // Add to beginning
        history.unshift(newItem);

        // Keep only MAX_HISTORY_ITEMS
        const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmedHistory));

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('historyUpdated', { detail: trimmedHistory }));

        return newItem;
    } catch (e) {
        console.error('Error saving to history:', e);
        return null;
    }
}

/**
 * Get a specific history item by ID
 */
function getHistoryItem(id) {
    const history = getHistory();
    return history.find(item => item.id === id) || null;
}

/**
 * Delete a history item by ID
 */
function deleteHistoryItem(id) {
    try {
        const history = getHistory();
        const filtered = history.filter(item => item.id !== id);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('historyUpdated', { detail: filtered }));
        return true;
    } catch (e) {
        console.error('Error deleting history item:', e);
        return false;
    }
}

/**
 * Clear all history
 */
function clearHistory() {
    try {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('historyUpdated', { detail: [] }));
        return true;
    } catch (e) {
        console.error('Error clearing history:', e);
        return false;
    }
}

/**
 * Generate a unique ID for history items
 */
function generateId() {
    return 'h_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get diagram type icon emoji
 */
function getDiagramIcon(type) {
    const icons = {
        class: '📦',
        sequence: '🔄',
        state: '🎯',
        activity: '⚡',
        component: '🧩',
        deployment: '🖥️',
        package: '📁',
        er: '🗄️'
    };
    return icons[type] || '📊';
}

// Export for use in app.js
window.HistoryManager = {
    getHistory,
    saveToHistory,
    getHistoryItem,
    deleteHistoryItem,
    clearHistory,
    formatTimestamp,
    getDiagramIcon
};

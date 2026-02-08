/**
 * UML AI - Keyboard Shortcuts
 * Centralized keyboard shortcut handling
 */

const SHORTCUTS = {
    'ctrl+enter': {
        description: 'Generate UML diagram',
        action: 'generate'
    },
    'ctrl+shift+c': {
        description: 'Copy PlantUML code',
        action: 'copy'
    },
    'ctrl+shift+s': {
        description: 'Download SVG',
        action: 'downloadSvg'
    },
    'ctrl+shift+p': {
        description: 'Download PNG',
        action: 'downloadPng'
    },
    'ctrl+shift+d': {
        description: 'Download PlantUML file',
        action: 'downloadPuml'
    },
    'escape': {
        description: 'Close modal / fullscreen',
        action: 'closeModal'
    },
    'f': {
        description: 'Toggle fullscreen preview',
        action: 'fullscreen',
        requiresNoInput: true
    },
    '?': {
        description: 'Show keyboard shortcuts',
        action: 'showShortcuts',
        requiresNoInput: true
    },
    'ctrl+z': {
        description: 'Restore last diagram from history',
        action: 'restoreLast'
    }
};

let shortcutHandlers = {};
let isModalOpen = false;

/**
 * Initialize keyboard shortcuts
 */
function initShortcuts() {
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Handle keydown events
 */
function handleKeyDown(e) {
    // Build key string
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');

    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';

    parts.push(key);
    const keyCombo = parts.join('+');

    // Check single key shortcuts
    const shortcut = SHORTCUTS[keyCombo] || SHORTCUTS[key];

    if (shortcut) {
        // Check if shortcut requires focus not to be in an input
        if (shortcut.requiresNoInput) {
            const activeEl = document.activeElement;
            const isInInput = activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                activeEl.contentEditable === 'true';
            if (isInInput) return;
        }

        e.preventDefault();
        executeAction(shortcut.action);
    }
}

/**
 * Execute shortcut action
 */
function executeAction(action) {
    const handler = shortcutHandlers[action];
    if (handler && typeof handler === 'function') {
        handler();
    }
}

/**
 * Register a handler for a shortcut action
 */
function registerHandler(action, handler) {
    shortcutHandlers[action] = handler;
}

/**
 * Set modal state (to handle Escape key properly)
 */
function setModalOpen(open) {
    isModalOpen = open;
}

/**
 * Get all shortcuts for display
 */
function getShortcutsList() {
    return Object.entries(SHORTCUTS).map(([key, value]) => ({
        key: formatKeyDisplay(key),
        description: value.description
    }));
}

/**
 * Format key combo for display
 */
function formatKeyDisplay(key) {
    return key
        .split('+')
        .map(part => {
            if (part === 'ctrl') return '⌘/Ctrl';
            if (part === 'shift') return '⇧';
            if (part === 'alt') return 'Alt';
            if (part === 'enter') return '↵';
            if (part === 'escape') return 'Esc';
            return part.toUpperCase();
        })
        .join(' + ');
}

/**
 * Create and show shortcuts modal
 */
function showShortcutsModal() {
    // Remove existing modal if any
    const existing = document.getElementById('shortcutsModal');
    if (existing) existing.remove();

    const shortcuts = getShortcutsList();

    const modal = document.createElement('div');
    modal.id = 'shortcutsModal';
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
        <div class="shortcuts-modal-content">
            <div class="shortcuts-modal-header">
                <h2>⌨️ Keyboard Shortcuts</h2>
                <button class="shortcuts-close-btn" title="Close (Esc)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="shortcuts-list">
                ${shortcuts.map(s => `
                    <div class="shortcut-item">
                        <kbd>${s.key}</kbd>
                        <span>${s.description}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setModalOpen(true);

    // Close handlers
    modal.querySelector('.shortcuts-close-btn').addEventListener('click', hideShortcutsModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideShortcutsModal();
    });

    // Animate in
    requestAnimationFrame(() => modal.classList.add('show'));
}

/**
 * Hide shortcuts modal
 */
function hideShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 200);
        setModalOpen(false);
    }
}

// Export for use in app.js
window.KeyboardShortcuts = {
    initShortcuts,
    registerHandler,
    setModalOpen,
    getShortcutsList,
    showShortcutsModal,
    hideShortcutsModal,
    SHORTCUTS
};

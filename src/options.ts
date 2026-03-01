import { BrowserStorageConfigurationStore } from "./adapters/BrowserStorageConfigurationStore.js";
import type { ConfigurationData } from "./application/ports/ConfigurationStore";

declare const browser: typeof import("webextension-polyfill");


// Default configuration with sensible starting values
const DEFAULT_CONFIGURATION_DATA: ConfigurationData = {
    windows: [
        {
            tag: '[WORK]',
            match: ['github.com', 'gitlab.com', 'jira', 'confluence'],
            theme: {
                accentColor: '#3498db',
                textColor: '#ffffff'
            }
        },
        {
            tag: '[RESEARCH]',
            match: ['wikipedia.org', 'stackoverflow.com', 'mdn.org'],
            theme: {
                accentColor: '#9b59b6',
                textColor: '#ffffff'
            }
        },
        {
            tag: '[DEFAULT]',
            match: [],
            theme: {
                accentColor: '#95a5a6',
                textColor: '#ffffff'
            }
        }
    ],
    defaultWindowTag: '[DEFAULT]',
    ignoredUrlPatterns: ['about:', 'moz-extension:']
};

const configStore = new BrowserStorageConfigurationStore();
let currentConfig: ConfigurationData;

// DOM Elements
let specsList: HTMLElement;
let statusMessage: HTMLElement;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    specsList = document.getElementById('specsList')!;
    statusMessage = document.getElementById('statusMessage')!;

    // Verify elements exist
    if (!specsList || !statusMessage) {
        console.error('[OPTIONS] Required DOM elements not found');
        return;
    }

    try {
        await loadConfiguration();
        setupEventListeners();
    } catch (error) {
        console.error('[OPTIONS] Initialization error:', error);
        if (statusMessage) {
            statusMessage.textContent = 'Error loading configuration';
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
        }
    }
});

async function loadConfiguration() {
    currentConfig = await configStore.getConfiguration();
    renderSpecs();
}

function renderSpecs() {
    if (!specsList) {
        console.error('[OPTIONS] specsList element not found');
        return;
    }

    specsList.innerHTML = '';

    if (currentConfig.windows.length === 0) {
        specsList.innerHTML = '<div class="empty-state">No specifications configured yet.</div>';
        return;
    }

    currentConfig.windows.forEach((windowDef, index) => {
        const isDefault = index === currentConfig.windows.length - 1;

        const specItem = document.createElement('div');
        specItem.className = `spec-item ${isDefault ? 'is-default' : ''}`;
        specItem.dataset.index = String(index);

        const stickyBadge = windowDef.sticky ? '📌' : '';
        const accentColor = windowDef.theme?.accentColor || '#3498db';
        const textColor = windowDef.theme?.textColor || '#ffffff';
        const rulesText = windowDef.match.join('\n');

        specItem.innerHTML = `
            <div class="spec-bar">
                <span class="spec-sticky">${stickyBadge}</span>
                <span class="spec-name">${escapeHtml(windowDef.tag)}</span>
                ${isDefault ? '<span class="default-badge">Default</span>' : ''}
                <div class="spec-controls">
                    ${index > 0 ? `<button class="btn-icon btn-move-up" title="Move up in priority">↑</button>` : ''}
                    ${index < currentConfig.windows.length - 1 ? `<button class="btn-icon btn-move-down" title="Move down in priority">↓</button>` : ''}
                    ${!isDefault ? `<button class="btn-icon btn-delete" title="Delete">🗑</button>` : ''}
                </div>
            </div>

            <div class="spec-content">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" class="spec-name-input" value="${escapeHtml(windowDef.tag)}" placeholder="e.g., Work, Research">
                </div>

                ${!isDefault ? `
                    <div class="spec-content-row">
                        <div class="form-group">
                            <label>URL Keywords (one per line)</label>
                            <textarea class="spec-rules-input" placeholder="github.com&#10;gitlab.com&#10;jira.company.com">${escapeHtml(rulesText)}</textarea>
                            <small>Tabs with URLs matching these keywords will be assigned to this window</small>
                        </div>
                    </div>
                ` : `
                    <div class="info-box">
                        This is the default window. Tabs that don't match any other specification will go here.
                    </div>
                `}

                <div class="spec-content-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" class="spec-sticky-input" ${windowDef.sticky ? 'checked' : ''}>
                            📌 Sticky (prevent automatic tab reassignment)
                        </label>
                    </div>

                    <div class="form-group">
                        <label>Theme Colors</label>
                        <div class="color-section">
                            <div class="color-picker">
                                <label>Toolbar</label>
                                <input type="color" class="spec-accent-input" value="${accentColor}">
                            </div>
                            <div class="color-picker">
                                <label>Text</label>
                                <input type="color" class="spec-text-input" value="${textColor}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        specsList.appendChild(specItem);

        // Add event listeners
        const bar = specItem.querySelector('.spec-bar') as HTMLElement;
        bar.addEventListener('click', () => toggleExpanded(specItem));

        const moveUpBtn = specItem.querySelector('.btn-move-up');
        if (moveUpBtn) {
            moveUpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleMoveUp(index);
            });
        }

        const moveDownBtn = specItem.querySelector('.btn-move-down');
        if (moveDownBtn) {
            moveDownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleMoveDown(index);
            });
        }

        const deleteBtn = specItem.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteSpec(index);
            });
        }

        // Auto-save on input changes
        const inputs = specItem.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => saveSpecChanges(index));
        });
    });
}

function toggleExpanded(specItem: Element) {
    specItem.classList.toggle('expanded');
}

function saveSpecChanges(index: number) {
    const specItem = document.querySelector(`[data-index="${index}"]`);
    if (!specItem) return;

    const name = (specItem.querySelector('.spec-name-input') as HTMLInputElement)?.value.trim();
    const rulesText = (specItem.querySelector('.spec-rules-input') as HTMLTextAreaElement)?.value || '';
    const isSticky = (specItem.querySelector('.spec-sticky-input') as HTMLInputElement)?.checked || false;
    const accentColor = (specItem.querySelector('.spec-accent-input') as HTMLInputElement)?.value || '#3498db';
    const textColor = (specItem.querySelector('.spec-text-input') as HTMLInputElement)?.value || '#ffffff';

    if (!name) return;

    const rules = rulesText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    const windows = [...currentConfig.windows];
    const oldDef = windows[index];

    if (!oldDef) return;

    windows[index] = {
        ...oldDef!,
        tag: name,
        match: index === currentConfig.windows.length - 1 ? oldDef!.match : rules,
        sticky: isSticky,
        theme: {
            accentColor,
            textColor
        }
    };

    currentConfig = { ...currentConfig, windows };

    // Update the display name in the bar
    const specNameDisplay = specItem.querySelector('.spec-name') as HTMLElement;
    if (specNameDisplay && !specNameDisplay.classList.contains('spec-name-input')) {
        specNameDisplay.textContent = name;
    }
}

function handleMoveUp(index: number) {
    if (index <= 0) return;
    const windows = [...currentConfig.windows];
    const temp = windows[index - 1]!;
    windows[index - 1] = windows[index]!;
    windows[index] = temp;
    currentConfig = { ...currentConfig, windows };
    renderSpecs();
}

function handleMoveDown(index: number) {
    if (index >= currentConfig.windows.length - 1) return;
    const windows = [...currentConfig.windows];
    const temp = windows[index]!;
    windows[index] = windows[index + 1]!;
    windows[index + 1] = temp;
    currentConfig = { ...currentConfig, windows };
    renderSpecs();
}

function handleDeleteSpec(index: number) {
    if (index === currentConfig.windows.length - 1) {
        showStatus('Cannot delete the default window', 'error');
        return;
    }

    const windowToDelete = currentConfig.windows[index];
    if (!windowToDelete) {
        return;
    }

    if (confirm(`Delete "${windowToDelete.tag}"? This cannot be undone.`)) {
        const windows = currentConfig.windows.filter((_, i) => i !== index);
        currentConfig = { ...currentConfig, windows };
        renderSpecs();
    }
}

function setupEventListeners() {
    const addSpecBtn = document.getElementById('addSpecBtn');
    const saveBtn = document.getElementById('saveConfigBtn');
    const resetBtn = document.getElementById('resetConfigBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');

    if (addSpecBtn) {
        addSpecBtn.addEventListener('click', () => {
            const windows = [...currentConfig.windows];
            windows.splice(windows.length - 1, 0, {
                tag: 'New Specification',
                match: ['example.com'],
                theme: { accentColor: '#3498db', textColor: '#ffffff' }
            });
            currentConfig = { ...currentConfig, windows };
            renderSpecs();

            // Auto-expand the new spec for editing
            setTimeout(() => {
                const newItem = document.querySelector(`[data-index="${windows.length - 2}"]`);
                if (newItem) {
                    newItem.classList.add('expanded');
                    const input = newItem.querySelector('.spec-name-input') as HTMLInputElement;
                    input?.select();
                }
            }, 0);
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                await configStore.saveConfiguration(currentConfig);
                showStatus('✓ Configuration saved successfully', 'success');
                await browser.runtime.sendMessage({ type: 'configUpdated' });
            } catch (error) {
                showStatus('Error saving: ' + (error as Error).message, 'error');
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset to default configuration?')) {
                currentConfig = DEFAULT_CONFIGURATION_DATA;
                renderSpecs();
                showStatus('Reset to defaults. Click Save to apply.', 'success');
            }
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const json = JSON.stringify(currentConfig, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'defenestrator-config.json';
            a.click();
            URL.revokeObjectURL(url);
            showStatus('✓ Configuration exported', 'success');
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                try {
                    const text = await file.text();
                    const imported = JSON.parse(text);

                    if (!imported.windows || !Array.isArray(imported.windows)) {
                        showStatus('Error importing: Invalid configuration format', 'error');
                        return;
                    }

                    currentConfig = imported as ConfigurationData;
                    renderSpecs();
                    showStatus('✓ Configuration imported. Click Save to apply.', 'success');
                } catch (error) {
                    showStatus('Error importing: ' + (error as Error).message, 'error');
                }
            };
            input.click();
        });
    }
}

function showStatus(message: string, type: 'success' | 'error') {
    if (!statusMessage) return;

    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';

    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 4000);
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

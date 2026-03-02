import { ConfigurationPrioritizedNamedWindowSpecificationsRepository } from "./adapters/ConfigurationPrioritizedNamedWindowSpecificationsRepository.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import type { PrioritizedNamedWindowSpecifications } from "./domain/specifications/PrioritizedNamedWindowSpecifications.js";
import { createDefaultPrioritizedNamedWindowSpecifications } from "./domain/specifications/PrioritizedNamedWindowSpecifications.js";

declare const browser: typeof import("webextension-polyfill");

const logger = new ConsoleLogger();
const configRepository = new ConfigurationPrioritizedNamedWindowSpecificationsRepository(logger);

let currentConfig: PrioritizedNamedWindowSpecifications;

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
    const loaded = await configRepository.getPrioritizedSpecifications();
    currentConfig = loaded ?? createDefaultPrioritizedNamedWindowSpecifications();
    renderSpecs();
}

function renderSpecs() {
    if (!specsList) {
        console.error('[OPTIONS] specsList element not found');
        return;
    }

    specsList.innerHTML = '';

    const specs = currentConfig.specifications;
    if (specs.length === 0) {
        specsList.innerHTML = '<div class="empty-state">No specifications configured yet.</div>';
        return;
    }

    specs.forEach((spec, index) => {
        const isDefault = index === specs.length - 1;

        const specItem = document.createElement('div');
        specItem.className = `spec-item ${isDefault ? 'is-default' : ''}`;
        specItem.dataset.index = String(index);

        const stickyBadge = spec.sticky ? '📌' : '';

        specItem.innerHTML = `
            <div class="spec-bar">
                <span class="spec-sticky">${stickyBadge}</span>
                <span class="spec-name">${escapeHtml(spec.name)}</span>
                ${isDefault ? '<span class="default-badge">Default</span>' : ''}
                <div class="spec-controls">
                    ${index > 0 ? `<button class="btn-icon btn-move-up" title="Move up in priority">↑</button>` : ''}
                    ${index < specs.length - 1 ? `<button class="btn-icon btn-move-down" title="Move down in priority">↓</button>` : ''}
                    ${!isDefault ? `<button class="btn-icon btn-delete" title="Delete">🗑</button>` : ''}
                </div>
            </div>

            <div class="spec-content">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" class="spec-name-input" value="${escapeHtml(spec.name)}" placeholder="e.g., Work, Research">
                </div>

                ${!isDefault ? `
                    <div class="spec-content-row">
                        <div class="form-group">
                            <label>Note: URL matching is configured in the specification implementation</label>
                            <small>This UI currently shows the specification names</small>
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
                            <input type="checkbox" class="spec-sticky-input" ${spec.sticky ? 'checked' : ''}>
                            📌 Sticky (prevent automatic tab reassignment)
                        </label>
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

    if (!name) return;

    // Note: Full specification editing would require updating the domain objects
    // For now, we just track the name
    // TODO: Implement full spec editing capability
}

function handleMoveUp(index: number) {
    if (index <= 0) return;
    const specs = [...currentConfig.specifications];
    const temp = specs[index - 1]!;
    specs[index - 1] = specs[index]!;
    specs[index] = temp;
    currentConfig = { ...currentConfig, specifications: specs };
    renderSpecs();
}

function handleMoveDown(index: number) {
    if (index >= currentConfig.specifications.length - 1) return;
    const specs = [...currentConfig.specifications];
    const temp = specs[index]!;
    specs[index] = specs[index + 1]!;
    specs[index + 1] = temp;
    currentConfig = { ...currentConfig, specifications: specs };
    renderSpecs();
}

function handleDeleteSpec(index: number) {
    if (index === currentConfig.specifications.length - 1) {
        showStatus('Cannot delete the default window', 'error');
        return;
    }

    const specToDelete = currentConfig.specifications[index];
    if (!specToDelete) {
        return;
    }

    if (confirm(`Delete "${specToDelete.name}"? This cannot be undone.`)) {
        const specs = currentConfig.specifications.filter((_, i) => i !== index);
        currentConfig = { ...currentConfig, specifications: specs };
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
            // TODO: Implement adding new specifications
            showStatus('Adding new specifications is not yet implemented', 'error');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                await configRepository.savePrioritizedSpecifications(currentConfig);
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
                currentConfig = createDefaultPrioritizedNamedWindowSpecifications();
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

                    if (!imported.specifications || !Array.isArray(imported.specifications)) {
                        showStatus('Error importing: Invalid configuration format', 'error');
                        return;
                    }

                    // Note: Full validation would be needed here
                    currentConfig = imported as PrioritizedNamedWindowSpecifications;
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

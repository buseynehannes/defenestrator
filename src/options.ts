import { ConfigurationPrioritizedNamedWindowSpecificationsRepository } from "./adapters/ConfigurationPrioritizedNamedWindowSpecificationsRepository.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import type { PrioritizedNamedWindowSpecifications } from "./domain/specifications/PrioritizedNamedWindowSpecifications.js";
import { createDefaultPrioritizedNamedWindowSpecifications } from "./domain/specifications/PrioritizedNamedWindowSpecifications.js";
import { createGlobalIgnoredUrls } from "./domain/specifications/GlobalIgnoredUrls.js";
import { createNamedWindowSpecification, type NamedWindowSpecification } from "./domain/specifications/NamedWindowSpecification.js";
import { createTabSpecification } from "./domain/specifications/TabSpecification.js";
import type { WindowName } from "./domain/WindowName.js";

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

    if (!specsList || !statusMessage) {
        console.error('[OPTIONS] Required DOM elements not found');
        return;
    }

    try {
        await loadConfiguration();
        setupEventListeners();
    } catch (error) {
        console.error('[OPTIONS] Initialization error:', error);
        showStatus('Error loading configuration', 'error');
    }
});

async function loadConfiguration() {
    const loaded = await configRepository.getPrioritizedSpecifications();
    currentConfig = loaded ?? createDefaultPrioritizedNamedWindowSpecifications();
    renderSpecs();
    renderIgnoredUrls();
}

function renderIgnoredUrls() {
    const container = document.getElementById('ignoredUrlsContainer');
    if (!container) return;
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
        textarea.value = currentConfig.globalIgnoredUrls.urlPatterns.join('\n');
    }
}

function renderSpecs() {
    if (!specsList) return;

    specsList.innerHTML = '';

    const specs = currentConfig.specifications;
    if (specs.length === 0) {
        specsList.innerHTML = '<div class="empty-state">No specifications configured yet.</div>';
        return;
    }

    specs.forEach((spec, index) => {
        const isDefault = index === specs.length - 1;
        const matchUrls = spec.tabSpecifications?.map(s => s.urlPattern).join('\n') ?? '';

        const specItem = document.createElement('div');
        specItem.className = `spec-item ${isDefault ? 'is-default' : ''}`;
        specItem.dataset.index = String(index);

        specItem.innerHTML = `
            <div class="spec-bar">
                <span class="spec-sticky">${spec.sticky ? '📌' : ''}</span>
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
                <div class="form-group">
                    <label>Match URLs (one per line)</label>
                    <textarea class="spec-urls-input" placeholder="mail.google.com&#10;outlook.com">${escapeHtml(matchUrls)}</textarea>
                    <small>Tabs whose URL contains any of these patterns will be assigned to this window.</small>
                </div>
                ` : `
                <div class="info-box">
                    This is the default window. Tabs that don't match any other specification will go here.
                </div>
                `}
                <div class="form-group">
                    <label>Theme Colors</label>
                    <div class="color-section">
                        <div class="color-picker">
                            <label>Accent</label>
                            <input type="color" class="spec-accent-color" value="${spec.theme?.accentColor ?? '#667eea'}">
                        </div>
                        <div class="color-picker">
                            <label>Text</label>
                            <input type="color" class="spec-text-color" value="${spec.theme?.textColor ?? '#ffffff'}">
                        </div>
                        <div class="color-picker">
                            <label>Frame</label>
                            <input type="color" class="spec-frame-color" value="${spec.theme?.frameColor ?? '#4a5568'}">
                        </div>
                        <div class="color-picker">
                            <label>Tab text</label>
                            <input type="color" class="spec-tab-bg-text" value="${spec.theme?.tabBackgroundText ?? '#333333'}">
                        </div>
                    </div>
                </div>
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

        specItem.querySelector('.spec-bar')!.addEventListener('click', () => specItem.classList.toggle('expanded'));

        specItem.querySelector('.btn-move-up')?.addEventListener('click', e => { e.stopPropagation(); handleMoveUp(index); });
        specItem.querySelector('.btn-move-down')?.addEventListener('click', e => { e.stopPropagation(); handleMoveDown(index); });
        specItem.querySelector('.btn-delete')?.addEventListener('click', e => { e.stopPropagation(); handleDeleteSpec(index); });

        specItem.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('change', () => saveSpecChanges(index));
        });
    });
}

function saveSpecChanges(index: number) {
    const specItem = document.querySelector(`[data-index="${index}"]`);
    if (!specItem) return;

    const spec = currentConfig.specifications[index];
    if (!spec) return;

    const isDefault = index === currentConfig.specifications.length - 1;

    const nameInput = specItem.querySelector('.spec-name-input') as HTMLInputElement;
    const stickyInput = specItem.querySelector('.spec-sticky-input') as HTMLInputElement;
    const urlsInput = specItem.querySelector('.spec-urls-input') as HTMLTextAreaElement | null;
    const accentColorInput = specItem.querySelector('.spec-accent-color') as HTMLInputElement;
    const textColorInput = specItem.querySelector('.spec-text-color') as HTMLInputElement;
    const frameColorInput = specItem.querySelector('.spec-frame-color') as HTMLInputElement;
    const tabBgTextInput = specItem.querySelector('.spec-tab-bg-text') as HTMLInputElement;

    const name = nameInput?.value.trim() as WindowName;
    if (!name) return;

    const sticky = stickyInput?.checked ?? spec.sticky;

    const accentColor = accentColorInput?.value || spec.theme?.accentColor;
    const textColor = textColorInput?.value || spec.theme?.textColor;
    const frameColor = frameColorInput?.value || spec.theme?.frameColor;
    const tabBackgroundText = tabBgTextInput?.value || spec.theme?.tabBackgroundText;

    const theme = {
        ...(accentColor !== undefined && { accentColor }),
        ...(textColor !== undefined && { textColor }),
        ...(frameColor !== undefined && { frameColor }),
        ...(tabBackgroundText !== undefined && { tabBackgroundText }),
    };

    let updatedSpec: NamedWindowSpecification;

    if (isDefault) {
        updatedSpec = { ...spec, name, sticky, theme };
    } else {
        const urlPatterns = (urlsInput?.value ?? '')
            .split('\n')
            .map(u => u.trim())
            .filter(u => u.length > 0);

        const tabSpecs = urlPatterns.length > 0
            ? urlPatterns.map(createTabSpecification)
            : spec.tabSpecifications ?? [createTabSpecification('')];

        updatedSpec = createNamedWindowSpecification(
            name,
            tabSpecs as unknown as readonly [any, ...any[]],
            theme,
            sticky
        );
    }

    const specs = [...currentConfig.specifications];
    specs[index] = updatedSpec;
    currentConfig = { ...currentConfig, specifications: specs };

    // Update the visible name in the bar
    const nameEl = specItem.querySelector('.spec-name') as HTMLElement;
    if (nameEl) nameEl.textContent = name;
    const stickyEl = specItem.querySelector('.spec-sticky') as HTMLElement;
    if (stickyEl) stickyEl.textContent = sticky ? '📌' : '';
}

function handleMoveUp(index: number) {
    if (index <= 0) return;
    const specs = [...currentConfig.specifications];
    [specs[index - 1], specs[index]] = [specs[index]!, specs[index - 1]!];
    currentConfig = { ...currentConfig, specifications: specs };
    renderSpecs();
}

function handleMoveDown(index: number) {
    if (index >= currentConfig.specifications.length - 1) return;
    const specs = [...currentConfig.specifications];
    [specs[index], specs[index + 1]] = [specs[index + 1]!, specs[index]!];
    currentConfig = { ...currentConfig, specifications: specs };
    renderSpecs();
}

function handleDeleteSpec(index: number) {
    if (index === currentConfig.specifications.length - 1) {
        showStatus('Cannot delete the default window', 'error');
        return;
    }
    const specToDelete = currentConfig.specifications[index];
    if (!specToDelete) return;

    if (confirm(`Delete "${specToDelete.name}"? This cannot be undone.`)) {
        const specs = currentConfig.specifications.filter((_, i) => i !== index);
        currentConfig = { ...currentConfig, specifications: specs };
        renderSpecs();
    }
}

function handleAddSpec() {
    // Insert a new blank spec just before the default (last) spec
    const specs = [...currentConfig.specifications];
    const newSpec = createNamedWindowSpecification(
        'New Window' as WindowName,
        [createTabSpecification('')],
    );
    specs.splice(specs.length - 1, 0, newSpec);
    currentConfig = { ...currentConfig, specifications: specs };
    renderSpecs();
    // Auto-expand the newly added spec
    const newIndex = specs.length - 2;
    const newItem = document.querySelector(`[data-index="${newIndex}"]`);
    newItem?.classList.add('expanded');
}

function setupEventListeners() {
    document.getElementById('addSpecBtn')?.addEventListener('click', handleAddSpec);

    document.getElementById('saveConfigBtn')?.addEventListener('click', async () => {
        try {
            const ignoredUrlsTextarea = document.getElementById('ignoredUrlsContainer')
                ?.querySelector('textarea') as HTMLTextAreaElement;
            if (ignoredUrlsTextarea) {
                const urlPatterns = ignoredUrlsTextarea.value
                    .split('\n').map(u => u.trim()).filter(u => u.length > 0);
                currentConfig = { ...currentConfig, globalIgnoredUrls: createGlobalIgnoredUrls(urlPatterns) };
            }

            await configRepository.savePrioritizedSpecifications(currentConfig);
            showStatus('✓ Configuration saved successfully', 'success');
            try {
                await browser.runtime.sendMessage({ type: 'configUpdated' });
            } catch {
                // Background script may not be running — safe to ignore
            }
        } catch (error) {
            showStatus('Error saving: ' + (error as Error).message, 'error');
        }
    });

    document.getElementById('resetConfigBtn')?.addEventListener('click', () => {
        if (confirm('Reset to default configuration?')) {
            currentConfig = createDefaultPrioritizedNamedWindowSpecifications();
            renderSpecs();
            renderIgnoredUrls();
            showStatus('Reset to defaults. Click Save to apply.', 'success');
        }
    });

    document.getElementById('exportBtn')?.addEventListener('click', () => {
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

    document.getElementById('importBtn')?.addEventListener('click', () => {
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
                currentConfig = imported as PrioritizedNamedWindowSpecifications;
                renderSpecs();
                renderIgnoredUrls();
                showStatus('✓ Configuration imported. Click Save to apply.', 'success');
            } catch (error) {
                showStatus('Error importing: ' + (error as Error).message, 'error');
            }
        };
        input.click();
    });
}

function showStatus(message: string, type: 'success' | 'error') {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    setTimeout(() => { statusMessage.style.display = 'none'; }, 4000);
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

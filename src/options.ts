import { ConfigurationPrioritizedNamedWindowSpecificationsRepository } from "./adapters/ConfigurationPrioritizedNamedWindowSpecificationsRepository.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import type { PrioritizedNamedWindowSpecifications } from "./domain/specifications/PrioritizedNamedWindowSpecifications.js";
import { createDefaultPrioritizedNamedWindowSpecifications } from "./domain/specifications/PrioritizedNamedWindowSpecifications.js";
import { createGlobalIgnoredUrls } from "./domain/specifications/GlobalIgnoredUrls.js";
import { createNamedWindowSpecification, type NamedWindowSpecification } from "./domain/specifications/NamedWindowSpecification.js";
import { createDefaultNamedWindowSpecification } from "./domain/specifications/DefaultNamedWindowSpecification.js";
import { createTabSpecification, type TabSpecification } from "./domain/specifications/TabSpecification.js";
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

function buildSpecElement(spec: NamedWindowSpecification, index: number, totalSpecs: number): HTMLDivElement {
    const matchUrls = spec.isDefault ? '' : spec.tabSpecifications.map(s => s.urlPattern).join('\n');

    const specItem = document.createElement('div');
    specItem.className = `spec-item${spec.isDefault ? ' is-default' : ''}`;
    specItem.dataset.index = String(index);

    // --- Bar ---
    const bar = document.createElement('div');
    bar.className = 'spec-bar';

    const stickySpan = document.createElement('span');
    stickySpan.className = 'spec-sticky';
    stickySpan.textContent = spec.sticky ? '📌' : '';
    bar.appendChild(stickySpan);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'spec-name';
    nameSpan.textContent = spec.name;
    bar.appendChild(nameSpan);

    if (spec.isDefault) {
        const badge = document.createElement('span');
        badge.className = 'default-badge';
        badge.textContent = 'Default';
        bar.appendChild(badge);
    }

    const controls = document.createElement('div');
    controls.className = 'spec-controls';
    if (index > 0) {
        const btn = document.createElement('button');
        btn.className = 'btn-icon btn-move-up';
        btn.title = 'Move up in priority';
        btn.textContent = '↑';
        controls.appendChild(btn);
    }
    if (index < totalSpecs - 1) {
        const btn = document.createElement('button');
        btn.className = 'btn-icon btn-move-down';
        btn.title = 'Move down in priority';
        btn.textContent = '↓';
        controls.appendChild(btn);
    }
    if (!spec.isDefault) {
        const btn = document.createElement('button');
        btn.className = 'btn-icon btn-delete';
        btn.title = 'Delete';
        btn.textContent = '🗑';
        controls.appendChild(btn);
    }
    bar.appendChild(controls);
    specItem.appendChild(bar);

    // --- Content ---
    const content = document.createElement('div');
    content.className = 'spec-content';

    // Name input
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'spec-name-input';
    nameInput.value = spec.name;
    nameInput.placeholder = 'e.g., Work, Research';
    nameGroup.append(nameLabel, nameInput);
    content.appendChild(nameGroup);

    // URL patterns or default notice
    if (!spec.isDefault) {
        const urlGroup = document.createElement('div');
        urlGroup.className = 'form-group';
        const urlLabel = document.createElement('label');
        urlLabel.textContent = 'Match URLs (one per line)';
        const urlArea = document.createElement('textarea');
        urlArea.className = 'spec-urls-input';
        urlArea.placeholder = 'mail.google.com\noutlook.com';
        urlArea.value = matchUrls;
        const urlHint = document.createElement('small');
        urlHint.textContent = 'Tabs whose URL contains any of these patterns will be assigned to this window.';
        urlGroup.append(urlLabel, urlArea, urlHint);
        content.appendChild(urlGroup);
    } else {
        const infoBox = document.createElement('div');
        infoBox.className = 'info-box';
        infoBox.textContent = "This is the default window. Tabs that don't match any other specification will go here.";
        content.appendChild(infoBox);
    }

    // Theme colours
    const themeGroup = document.createElement('div');
    themeGroup.className = 'form-group';
    const themeLabel = document.createElement('label');
    themeLabel.textContent = 'Theme Colors';
    const colorSection = document.createElement('div');
    colorSection.className = 'color-section';
    for (const { label, cls, value } of [
        { label: 'Accent',   cls: 'spec-accent-color', value: spec.theme?.accentColor      ?? '#667eea' },
        { label: 'Text',     cls: 'spec-text-color',   value: spec.theme?.textColor        ?? '#ffffff' },
        { label: 'Frame',    cls: 'spec-frame-color',  value: spec.theme?.frameColor       ?? '#4a5568' },
        { label: 'Tab text', cls: 'spec-tab-bg-text',  value: spec.theme?.tabBackgroundText ?? '#333333' },
    ]) {
        const picker = document.createElement('div');
        picker.className = 'color-picker';
        const pickerLabel = document.createElement('label');
        pickerLabel.textContent = label;
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = cls;
        colorInput.value = value;
        picker.append(pickerLabel, colorInput);
        colorSection.appendChild(picker);
    }
    themeGroup.append(themeLabel, colorSection);
    content.appendChild(themeGroup);

    // Sticky checkbox
    const stickyRow = document.createElement('div');
    stickyRow.className = 'spec-content-row';
    const stickyGroup = document.createElement('div');
    stickyGroup.className = 'form-group';
    const stickyLabel = document.createElement('label');
    const stickyCheckbox = document.createElement('input');
    stickyCheckbox.type = 'checkbox';
    stickyCheckbox.className = 'spec-sticky-input';
    stickyCheckbox.checked = spec.sticky;
    stickyLabel.append(stickyCheckbox, ' 📌 Sticky (prevent automatic tab reassignment)');
    stickyGroup.appendChild(stickyLabel);
    stickyRow.appendChild(stickyGroup);
    content.appendChild(stickyRow);

    specItem.appendChild(content);
    return specItem;
}

function renderSpecs() {
    if (!specsList) return;

    specsList.replaceChildren();

    const specs = currentConfig.specifications;
    if (specs.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No specifications configured yet.';
        specsList.appendChild(empty);
        return;
    }

    specs.forEach((spec, index) => {
        const specItem = buildSpecElement(spec, index, specs.length);
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

    if (spec.isDefault) {
        updatedSpec = createDefaultNamedWindowSpecification(name, theme);
    } else {
        const urlPatterns = (urlsInput?.value ?? '')
            .split('\n')
            .map(u => u.trim())
            .filter(u => u.length > 0);

        const tabSpecs: readonly [TabSpecification, ...TabSpecification[]] = urlPatterns.length > 0
            ? urlPatterns.map(createTabSpecification) as [TabSpecification, ...TabSpecification[]]
            : spec.tabSpecifications;

        updatedSpec = createNamedWindowSpecification(name, tabSpecs, theme, sticky);
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


import { BrowserStorageConfigurationStore } from "./adapters/BrowserStorageConfigurationStore.js";
import { DEFAULT_CONFIGURATION_DATA } from "./domain/ConfigurationStore.js";
import type { ConfigurationData } from "./domain/ConfigurationStore.js";

declare const browser: typeof import("webextension-polyfill");

const configStore = new BrowserStorageConfigurationStore();
let currentConfig: ConfigurationData;

// DOM Elements (will be initialized on DOMContentLoaded)
let windowsContainer: HTMLElement;
let globalRulesContainer: HTMLElement;
let defaultWindowSelect: HTMLSelectElement;
let statusMessage: HTMLElement;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements after DOM is ready
    windowsContainer = document.getElementById('windowsContainer')!;
    globalRulesContainer = document.getElementById('globalRulesContainer')!;
    defaultWindowSelect = document.getElementById('defaultWindowSelect') as HTMLSelectElement;
    statusMessage = document.getElementById('statusMessage')!;

    await loadConfiguration();
    setupEventListeners();
});

async function loadConfiguration() {
    currentConfig = await configStore.getConfiguration();
    renderWindows();
    renderGlobalRules();
    renderDefaultWindowSelect();
}

function renderWindows() {
    windowsContainer.innerHTML = '';

    if (currentConfig.windows.length === 0) {
        windowsContainer.innerHTML = '<div class="empty-state">No windows defined. Click "Add ClassifiedWindow" to create one.</div>';
        return;
    }

    currentConfig.windows.forEach((windowDef, index) => {
        const isDefault = index === currentConfig.windows.length - 1;
        const windowDiv = document.createElement('div');
        windowDiv.className = `window-item ${isDefault ? 'window-default' : ''}`;

        const theme = windowDef.theme || {};
        const accentColor = theme.accentColor || '#3498db';
        const textColor = theme.textColor || '#ffffff';
        const frameColor = theme.frameColor || '';
        const tabBgText = theme.tabBackgroundText || '';
        const isSticky = windowDef.sticky === true;
        const matchPatterns = windowDef.match.join('\n');

        windowDiv.innerHTML = `
            <div class="window-header">
                <div class="window-title">
                    <input type="text" class="window-tag" data-index="${index}" value="${escapeHtml(windowDef.tag)}" placeholder="e.g., [DEV]">
                    ${isDefault ? '<span class="badge-default">Default ClassifiedWindow</span>' : ''}
                </div>
                <div class="window-controls">
                    ${index > 0 ? `<button class="btn-small btn-up" data-index="${index}">↑ Move Up</button>` : ''}
                    ${index < currentConfig.windows.length - 1 ? `<button class="btn-small btn-down" data-index="${index}">↓ Move Down</button>` : ''}
                </div>
            </div>
            <div class="form-group">
                <label>Match Keywords (one per line)</label>
                <textarea class="window-match" data-index="${index}" rows="3" ${isDefault ? 'disabled' : ''} placeholder="github.com&#10;gitlab.com">${escapeHtml(matchPatterns)}</textarea>
                ${isDefault ? '<small>Default window has no matching rules - all unmatched tabs go here</small>' : ''}
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" class="window-sticky" data-index="${index}" ${isSticky ? 'checked' : ''}>
                    <span>📌 Sticky Window (prevent tabs from being auto-moved)</span>
                </label>
            </div>
            <div class="theme-section">
                <h4>🎨 Window Theme</h4>
                <div class="theme-colors">
                    <div class="color-picker-group">
                        <label>Toolbar Color</label>
                        <div class="color-input-wrapper">
                            <input type="color" class="theme-accent" data-index="${index}" value="${accentColor}">
                            <span class="color-value">${accentColor}</span>
                        </div>
                    </div>
                    <div class="color-picker-group">
                        <label>Text Color</label>
                        <div class="color-input-wrapper">
                            <input type="color" class="theme-text" data-index="${index}" value="${textColor}">
                            <span class="color-value">${textColor}</span>
                        </div>
                    </div>
                    <div class="color-picker-group">
                        <label>Frame Color (optional)</label>
                        <div class="color-input-wrapper">
                            <input type="color" class="theme-frame" data-index="${index}" value="${frameColor || '#333333'}">
                            <span class="color-value">${frameColor || 'none'}</span>
                        </div>
                    </div>
                    <div class="color-picker-group">
                        <label>Tab Text (optional)</label>
                        <div class="color-input-wrapper">
                            <input type="color" class="theme-tab-text" data-index="${index}" value="${tabBgText || '#000000'}">
                            <span class="color-value">${tabBgText || 'none'}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="button-group">
                ${!isDefault ? `<button class="btn-danger btn-remove-window" data-index="${index}">Remove Window</button>` : ''}
            </div>
        `;
        windowsContainer.appendChild(windowDiv);
    });

    // Add event listeners for windows
    document.querySelectorAll('.window-tag').forEach(input => {
        input.addEventListener('input', handleWindowTagChange);
    });
    document.querySelectorAll('.window-match').forEach(textarea => {
        textarea.addEventListener('input', handleWindowMatchChange);
    });
    document.querySelectorAll('.window-sticky').forEach(checkbox => {
        checkbox.addEventListener('change', handleWindowStickyChange);
    });
    document.querySelectorAll('.theme-accent, .theme-text, .theme-frame, .theme-tab-text').forEach(input => {
        input.addEventListener('input', handleThemeChange);
    });
    document.querySelectorAll('.btn-remove-window').forEach(btn => {
        btn.addEventListener('click', handleRemoveWindow);
    });
    document.querySelectorAll('.btn-up').forEach(btn => {
        btn.addEventListener('click', handleMoveUp);
    });
    document.querySelectorAll('.btn-down').forEach(btn => {
        btn.addEventListener('click', handleMoveDown);
    });
}

function renderGlobalRules() {
    globalRulesContainer.innerHTML = '';

    if (currentConfig.ignoredUrlPatterns.length === 0) {
        globalRulesContainer.innerHTML = '<div class="empty-state">No ignored patterns defined.</div>';
        return;
    }

    currentConfig.ignoredUrlPatterns.forEach((pattern, index) => {
        const patternDiv = document.createElement('div');
        patternDiv.className = 'pattern-item';
        patternDiv.innerHTML = `
            <div class="form-group">
                <label>URL Pattern Prefix</label>
                <input type="text" class="pattern-value" data-index="${index}" value="${escapeHtml(pattern)}">
            </div>
            <div class="button-group">
                <button class="btn-danger btn-remove-pattern" data-index="${index}">Remove Pattern</button>
            </div>
        `;
        globalRulesContainer.appendChild(patternDiv);
    });

    // Add event listeners for patterns
    document.querySelectorAll('.pattern-value').forEach(input => {
        input.addEventListener('input', handlePatternChange);
    });
    document.querySelectorAll('.btn-remove-pattern').forEach(btn => {
        btn.addEventListener('click', handleRemovePattern);
    });
}

function renderDefaultWindowSelect() {
    defaultWindowSelect.innerHTML = '';
    currentConfig.windows.forEach((windowDef, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = windowDef.tag;
        if (index === currentConfig.windows.length - 1) {
            option.selected = true;
            option.textContent += ' (current default)';
        }
        defaultWindowSelect.appendChild(option);
    });
}

// Event handlers for windows
function handleWindowTagChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!);
    const windows = [...currentConfig.windows];
    const currentWindow = windows[index];

    if (!currentWindow) return;

    windows[index] = { ...currentWindow, tag: target.value };
    currentConfig = { ...currentConfig, windows };
}

function handleWindowMatchChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    const index = parseInt(target.dataset.index!);
    const isDefault = index === currentConfig.windows.length - 1;

    if (isDefault) return; // Can't change match for default window

    const windows = [...currentConfig.windows];
    const currentWindow = windows[index];

    if (!currentWindow) return;

    const match = target.value.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    windows[index] = { ...currentWindow, match };
    currentConfig = { ...currentConfig, windows };
}

function handleWindowStickyChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!);
    const windows = [...currentConfig.windows];
    const currentWindow = windows[index];

    if (!currentWindow) return;

    windows[index] = { ...currentWindow, sticky: target.checked };
    currentConfig = { ...currentConfig, windows };
}

function handleThemeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!);
    const windows = [...currentConfig.windows];
    const currentWindow = windows[index];

    if (!currentWindow) return;

    const theme = currentWindow.theme || {};

    // Create new theme object with updated property
    let updatedTheme;
    if (target.classList.contains('theme-accent')) {
        updatedTheme = { ...theme, accentColor: target.value };
    } else if (target.classList.contains('theme-text')) {
        updatedTheme = { ...theme, textColor: target.value };
    } else if (target.classList.contains('theme-frame')) {
        updatedTheme = { ...theme, frameColor: target.value };
    } else if (target.classList.contains('theme-tab-text')) {
        updatedTheme = { ...theme, tabBackgroundText: target.value };
    } else {
        updatedTheme = theme;
    }

    windows[index] = { ...currentWindow, theme: updatedTheme };
    currentConfig = { ...currentConfig, windows };

    // Update the color value display
    const colorValueSpan = target.nextElementSibling as HTMLSpanElement;
    if (colorValueSpan) {
        colorValueSpan.textContent = target.value;
    }
}

function handlePatternChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!);
    const patterns = [...currentConfig.ignoredUrlPatterns];
    patterns[index] = target.value;
    currentConfig = {
        ...currentConfig,
        ignoredUrlPatterns: patterns
    };
}

function handleRemoveWindow(event: Event) {
    const target = event.target as HTMLButtonElement;
    const index = parseInt(target.dataset.index!);
    // Don't allow removing the default window
    if (index === currentConfig.windows.length - 1) {
        showStatus('Cannot remove the default window', 'error');
        return;
    }
    const windows = currentConfig.windows.filter((_, i) => i !== index);
    currentConfig = { ...currentConfig, windows };
    renderWindows();
    renderDefaultWindowSelect();
}

function handleRemovePattern(event: Event) {
    const target = event.target as HTMLButtonElement;
    const index = parseInt(target.dataset.index!);
    const patterns = currentConfig.ignoredUrlPatterns.filter((_, i) => i !== index);
    currentConfig = {
        ...currentConfig,
        ignoredUrlPatterns: patterns
    };
    renderGlobalRules();
}

function handleMoveUp(event: Event) {
    const target = event.target as HTMLButtonElement;
    const index = parseInt(target.dataset.index!);
    if (index === 0) return; // Can't move first window up

    const windows = [...currentConfig.windows];
    const temp = windows[index - 1]!;
    windows[index - 1] = windows[index]!;
    windows[index] = temp;
    currentConfig = { ...currentConfig, windows };
    renderWindows();
    renderDefaultWindowSelect();
}

function handleMoveDown(event: Event) {
    const target = event.target as HTMLButtonElement;
    const index = parseInt(target.dataset.index!);
    if (index >= currentConfig.windows.length - 1) return; // Can't move last window down

    const windows = [...currentConfig.windows];
    const temp = windows[index]!;
    windows[index] = windows[index + 1]!;
    windows[index + 1] = temp;
    currentConfig = { ...currentConfig, windows };
    renderWindows();
    renderDefaultWindowSelect();
}

function setupEventListeners() {
    document.getElementById('addWindowBtn')!.addEventListener('click', () => {
        const windows = [...currentConfig.windows];
        // Insert before the default window
        windows.splice(windows.length - 1, 0, {
            tag: '[NEW]',
            match: ['example.com'],
            theme: { accentColor: '#3498db', textColor: '#ffffff' }
        });
        currentConfig = { ...currentConfig, windows };
        renderWindows();
        renderDefaultWindowSelect();
    });

    document.getElementById('addPatternBtn')!.addEventListener('click', () => {
        const patterns = [...currentConfig.ignoredUrlPatterns, 'new-pattern:'];
        currentConfig = {
            ...currentConfig,
            ignoredUrlPatterns: patterns
        };
        renderGlobalRules();
    });

    document.getElementById('saveBtn')!.addEventListener('click', async () => {
        try {
            await configStore.saveConfiguration(currentConfig);
            showStatus('Configuration saved successfully! Changes will take effect immediately.', 'success');

            // Notify background script to reload configuration
            await browser.runtime.sendMessage({ type: 'configUpdated' });
        } catch (error) {
            showStatus('Error saving configuration: ' + (error as Error).message, 'error');
        }
    });

    document.getElementById('resetBtn')!.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset to default configuration? This cannot be undone.')) {
            currentConfig = DEFAULT_CONFIGURATION_DATA;
            renderWindows();
            renderGlobalRules();
            renderDefaultWindowSelect();
            showStatus('Reset to default configuration. Click "Save" to apply.', 'success');
        }
    });

    document.getElementById('exportBtn')!.addEventListener('click', () => {
        const json = JSON.stringify(currentConfig, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'defenestrator-config.json';
        a.click();
        URL.revokeObjectURL(url);
        showStatus('Configuration exported successfully!', 'success');
    });

    document.getElementById('importBtn')!.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const imported = JSON.parse(text);

                // Validate structure before using
                if (!imported || typeof imported !== 'object') {
                    showStatus('Error importing configuration: Invalid JSON format', 'error');
                    return;
                }

                if (!imported.windows || !Array.isArray(imported.windows)) {
                    showStatus('Error importing configuration: missing windows array', 'error');
                    return;
                }

                if (!imported.ignoredUrlPatterns || !Array.isArray(imported.ignoredUrlPatterns)) {
                    showStatus('Error importing configuration: missing ignoredUrlPatterns', 'error');
                    return;
                }

                currentConfig = imported as ConfigurationData;
                renderWindows();
                renderGlobalRules();
                renderDefaultWindowSelect();
                showStatus('Configuration imported successfully! Click "Save" to apply.', 'success');
            } catch (error) {
                showStatus('Error importing configuration: ' + (error as Error).message, 'error');
            }
        };
        input.click();
    });

    document.getElementById('defaultWindowSelect')!.addEventListener('change', (e) => {
        const selectedIndex = parseInt((e.target as HTMLSelectElement).value);
        if (selectedIndex >= 0 && selectedIndex < currentConfig.windows.length - 1) {
            // Swap the selected window to be last (default)
            const windows = [...currentConfig.windows];
            const selected = windows[selectedIndex]!;
            windows[selectedIndex] = windows[windows.length - 1]!;
            windows[windows.length - 1] = selected;
            currentConfig = { ...currentConfig, windows };
            renderWindows();
            renderDefaultWindowSelect();
        }
    });
}

function showStatus(message: string, type: 'success' | 'error') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';

    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

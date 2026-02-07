import { BrowserStorageConfigurationStore } from "./adapters/BrowserStorageConfigurationStore.js";
import { DEFAULT_CONFIGURATION } from "./domain/ConfigurationStore.js";
import type { Configuration } from "./domain/ConfigurationStore.js";

declare const browser: typeof import("webextension-polyfill");

const configStore = new BrowserStorageConfigurationStore();
let currentConfig: Configuration;

// DOM Elements (will be initialized on DOMContentLoaded)
let rulesContainer: HTMLElement;
let patternsContainer: HTMLElement;
let statusMessage: HTMLElement;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements after DOM is ready
    rulesContainer = document.getElementById('rulesContainer')!;
    patternsContainer = document.getElementById('patternsContainer')!;
    statusMessage = document.getElementById('statusMessage')!;

    await loadConfiguration();
    setupEventListeners();
});

async function loadConfiguration() {
    currentConfig = await configStore.getConfiguration();
    renderRules();
    renderPatterns();
}

function renderRules() {
    rulesContainer.innerHTML = '';

    if (currentConfig.rules.length === 0) {
        rulesContainer.innerHTML = '<div class="empty-state">No rules defined. Click "Add Rule" to create one.</div>';
        return;
    }

    currentConfig.rules.forEach((rule, index) => {
        const ruleDiv = document.createElement('div');
        ruleDiv.className = 'rule-item';

        const theme = rule.theme || {};
        const accentColor = theme.accentColor || '#3498db';
        const textColor = theme.textColor || '#ffffff';
        const frameColor = theme.frameColor || '';
        const tabBgText = theme.tabBackgroundText || '';
        const isSticky = rule.sticky === true;

        ruleDiv.innerHTML = `
            <div class="form-group">
                <label>Tag Name (e.g., [DEV], [WORK], [PERSONAL])</label>
                <input type="text" class="rule-tag" data-index="${index}" value="${escapeHtml(rule.tag)}">
            </div>
            <div class="form-group">
                <label>Match Keywords (one per line)</label>
                <textarea class="rule-match" data-index="${index}" rows="3">${escapeHtml(rule.match.join('\n'))}</textarea>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" class="rule-sticky" data-index="${index}" ${isSticky ? 'checked' : ''}>
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
                <button class="btn-danger btn-remove-rule" data-index="${index}">Remove Rule</button>
            </div>
        `;
        rulesContainer.appendChild(ruleDiv);
    });

    // Add event listeners
    document.querySelectorAll('.rule-tag').forEach(input => {
        input.addEventListener('input', handleRuleChange);
    });
    document.querySelectorAll('.rule-match').forEach(textarea => {
        textarea.addEventListener('input', handleRuleChange);
    });
    document.querySelectorAll('.rule-sticky').forEach(checkbox => {
        checkbox.addEventListener('change', handleStickyChange);
    });
    document.querySelectorAll('.theme-accent, .theme-text, .theme-frame, .theme-tab-text').forEach(input => {
        input.addEventListener('input', handleThemeChange);
    });
    document.querySelectorAll('.btn-remove-rule').forEach(btn => {
        btn.addEventListener('click', handleRemoveRule);
    });
}

function renderPatterns() {
    patternsContainer.innerHTML = '';

    if (currentConfig.ignoredUrlPatterns.length === 0) {
        patternsContainer.innerHTML = '<div class="empty-state">No ignored patterns defined.</div>';
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
        patternsContainer.appendChild(patternDiv);
    });

    // Add event listeners
    document.querySelectorAll('.pattern-value').forEach(input => {
        input.addEventListener('input', handlePatternChange);
    });
    document.querySelectorAll('.btn-remove-pattern').forEach(btn => {
        btn.addEventListener('click', handleRemovePattern);
    });
}

function handleRuleChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const index = parseInt(target.dataset.index!);
    const rules = [...currentConfig.rules];
    const currentRule = rules[index];

    if (!currentRule) {
        return;
    }

    if (target.classList.contains('rule-tag')) {
        rules[index] = { ...currentRule, tag: target.value };
    } else if (target.classList.contains('rule-match')) {
        const match = target.value.split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        rules[index] = { ...currentRule, match };
    }

    currentConfig = { ...currentConfig, rules };
}

function handleStickyChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!);
    const rules = [...currentConfig.rules];
    const currentRule = rules[index];

    if (!currentRule) {
        return;
    }

    rules[index] = { ...currentRule, sticky: target.checked };
    currentConfig = { ...currentConfig, rules };
}

function handleThemeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const index = parseInt(target.dataset.index!);
    const rules = [...currentConfig.rules];
    const currentRule = rules[index];

    if (!currentRule) {
        return;
    }

    const theme = currentRule.theme || {};
    let updatedTheme = { ...theme };

    if (target.classList.contains('theme-accent')) {
        updatedTheme.accentColor = target.value;
    } else if (target.classList.contains('theme-text')) {
        updatedTheme.textColor = target.value;
    } else if (target.classList.contains('theme-frame')) {
        updatedTheme.frameColor = target.value;
    } else if (target.classList.contains('theme-tab-text')) {
        updatedTheme.tabBackgroundText = target.value;
    }

    rules[index] = { ...currentRule, theme: updatedTheme };
    currentConfig = { ...currentConfig, rules };

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
    currentConfig = { ...currentConfig, ignoredUrlPatterns: patterns };
}

function handleRemoveRule(event: Event) {
    const target = event.target as HTMLButtonElement;
    const index = parseInt(target.dataset.index!);
    const rules = currentConfig.rules.filter((_, i) => i !== index);
    currentConfig = { ...currentConfig, rules };
    renderRules();
}

function handleRemovePattern(event: Event) {
    const target = event.target as HTMLButtonElement;
    const index = parseInt(target.dataset.index!);
    const patterns = currentConfig.ignoredUrlPatterns.filter((_, i) => i !== index);
    currentConfig = { ...currentConfig, ignoredUrlPatterns: patterns };
    renderPatterns();
}

function setupEventListeners() {
    document.getElementById('addRuleBtn')!.addEventListener('click', () => {
        const rules = [...currentConfig.rules, {
            tag: '[NEW]',
            match: ['example.com'],
            theme: { accentColor: '#3498db', textColor: '#ffffff' }
        }];
        currentConfig = { ...currentConfig, rules };
        renderRules();
    });

    document.getElementById('addPatternBtn')!.addEventListener('click', () => {
        const patterns = [...currentConfig.ignoredUrlPatterns, 'new-pattern:'];
        currentConfig = { ...currentConfig, ignoredUrlPatterns: patterns };
        renderPatterns();
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
            currentConfig = DEFAULT_CONFIGURATION;
            renderRules();
            renderPatterns();
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
                const imported = JSON.parse(text) as Configuration;

                // Validate structure
                if (!imported.rules || !Array.isArray(imported.rules)) {
                    throw new Error('Invalid configuration format: missing rules array');
                }
                if (!imported.ignoredUrlPatterns || !Array.isArray(imported.ignoredUrlPatterns)) {
                    throw new Error('Invalid configuration format: missing ignoredUrlPatterns array');
                }

                currentConfig = imported;
                renderRules();
                renderPatterns();
                showStatus('Configuration imported successfully! Click "Save" to apply.', 'success');
            } catch (error) {
                showStatus('Error importing configuration: ' + (error as Error).message, 'error');
            }
        };
        input.click();
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

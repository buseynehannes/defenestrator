import type { WindowSpecInfo } from './application/ports/in/GetCurrentWindowSpecUseCase';

declare const browser: typeof import('webextension-polyfill');

type PopupRequest =
    | { type: 'GET_CURRENT_WINDOW_SPEC'; windowId: number }
    | { type: 'TOGGLE_STICKY'; windowId: number };

async function sendMessage<T>(msg: PopupRequest): Promise<T> {
    return browser.runtime.sendMessage(msg) as Promise<T>;
}

function render(content: HTMLElement, spec: WindowSpecInfo | null): void {
    content.innerHTML = '';

    if (!spec) {
        const status = document.createElement('div');
        status.className = 'status';
        status.textContent = 'This window is not tracked by Defenestrator.';
        content.appendChild(status);
        return;
    }

    // Header: name + badge
    const header = document.createElement('div');
    header.className = 'header';

    const name = document.createElement('div');
    name.className = 'spec-name';
    name.textContent = spec.name;
    header.appendChild(name);

    const badge = document.createElement('span');
    if (spec.isDefault) {
        badge.className = 'badge badge-default';
        badge.textContent = 'default';
    } else if (spec.sticky) {
        badge.className = 'badge badge-sticky';
        badge.textContent = 'sticky';
    }
    if (badge.textContent) header.appendChild(badge);
    content.appendChild(header);

    // URL patterns
    if (spec.matchUrls.length > 0) {
        const urls = document.createElement('div');
        urls.className = 'urls';
        for (const url of spec.matchUrls) {
            const item = document.createElement('div');
            item.className = 'url-item';
            item.textContent = url;
            urls.appendChild(item);
        }
        content.appendChild(urls);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'actions';

    if (!spec.isDefault) {
        const stickyBtn = document.createElement('button');
        stickyBtn.className = `btn btn-sticky${spec.sticky ? ' is-sticky' : ''}`;
        stickyBtn.textContent = spec.sticky ? 'Remove sticky' : 'Make sticky';
        stickyBtn.addEventListener('click', async () => {
            stickyBtn.disabled = true;
            const updated = await sendMessage<WindowSpecInfo | null>({ type: 'TOGGLE_STICKY', windowId: currentWindowId });
            render(content, updated);
        });
        actions.appendChild(stickyBtn);
    }

    const optionsBtn = document.createElement('button');
    optionsBtn.className = 'btn btn-options';
    optionsBtn.textContent = '⚙';
    optionsBtn.title = 'Open settings';
    optionsBtn.addEventListener('click', () => browser.runtime.openOptionsPage());
    actions.appendChild(optionsBtn);

    content.appendChild(actions);

    if (!spec.isDefault) {
        const hint = document.createElement('div');
        hint.className = 'shortcut-hint';
        hint.textContent = 'Tip: use ⌥⌘T to toggle sticky from anywhere';
        content.appendChild(hint);
    }
}

let currentWindowId = 0;

async function init(): Promise<void> {
    const content = document.getElementById('content') as HTMLElement;
    const win = await browser.windows.getCurrent();
    currentWindowId = win.id as number;

    const spec = await sendMessage<WindowSpecInfo | null>({ type: 'GET_CURRENT_WINDOW_SPEC', windowId: currentWindowId });
    render(content, spec);
}

init().catch(console.error);



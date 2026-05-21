import axios from 'axios';

export const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Race an axios call against AbortController + hard timeout.
 * Ensures the promise always settles within `timeoutMs`.
 */
export async function safeGet(client, url, options = {}) {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        signal: externalSignal,
        params,
        label = url,
    } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);

    const onExternalAbort = () => controller.abort(new Error('Aborted'));
    if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(timeoutId);
            throw new Error('Aborted');
        }
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
        return await client.get(url, {
            params,
            timeout: timeoutMs,
            signal: controller.signal,
        });
    } catch (err) {
        const aborted =
            controller.signal.aborted ||
            err.code === 'ERR_CANCELED' ||
            err.name === 'AbortError' ||
            err.name === 'CanceledError';
        if (aborted) {
            const reason = controller.signal.reason;
            throw reason instanceof Error ? reason : new Error('Request timeout');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
        if (externalSignal) {
            externalSignal.removeEventListener('abort', onExternalAbort);
        }
    }
}

/**
 * Run async work with mount guard + guaranteed loading=false callback.
 */
export function createLoadingGuard() {
    let mounted = true;
    let abortController = null;

    return {
        isMounted: () => mounted,
        getSignal: () => {
            abortController?.abort();
            abortController = new AbortController();
            return abortController.signal;
        },
        abort: () => abortController?.abort(),
        dispose: () => {
            mounted = false;
            abortController?.abort();
        },
    };
}

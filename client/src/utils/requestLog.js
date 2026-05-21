const PREFIX = '[ChainXchange]';

export function logRequestStart(label, meta = {}) {
    console.info(`${PREFIX} ${label} — request started`, meta);
}

export function logRequestSuccess(label, meta = {}) {
    console.info(`${PREFIX} ${label} — request success`, meta);
}

export function logRequestFailed(label, error, meta = {}) {
    console.warn(`${PREFIX} ${label} — request failed`, {
        message: error?.message || String(error),
        ...meta,
    });
}

export function logLoadingFinished(label, meta = {}) {
    console.info(`${PREFIX} ${label} — loading finished`, meta);
}

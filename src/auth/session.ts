const storageKey = 'elometrics.accessToken';

function readToken() {
    try {
        return sessionStorage.getItem(storageKey);
    } catch {
        return null;
    }
}

let session = { token: readToken(), version: 0 };
const listeners = new Set<() => void>();

export function getSession() {
    return session;
}

export function subscribeToSession(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function setAccessToken(token: string | null) {
    try {
        if (token === null) {
            sessionStorage.removeItem(storageKey);
        } else {
            sessionStorage.setItem(storageKey, token);
        }
    } catch {
        // The current tab can still use the in-memory session.
    }

    session = { token, version: session.version + 1 };
    listeners.forEach((listener) => listener());
}

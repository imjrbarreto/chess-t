import { createContext, useContext } from 'react';
import type { User } from '../api/generated/models';

interface AuthContextValue {
    user: User | undefined;
    isCheckingSession: boolean;
    sessionCheckFailed: boolean;
    retrySessionCheck: () => void;
    startSession: (token: string) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const auth = useContext(AuthContext);

    if (!auth) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return auth;
}

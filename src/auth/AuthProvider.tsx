import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import {
    getGetCurrentUserQueryKey,
    useGetCurrentUser,
} from '../api/generated/authentication/authentication';
import { getSession, setAccessToken, subscribeToSession } from './session';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const { token, version } = useSyncExternalStore(subscribeToSession, getSession);
    const currentUser = useGetCurrentUser({
        query: {
            enabled: Boolean(token),
            queryKey: [...getGetCurrentUserQueryKey(), version],
            retry: false,
            gcTime: 0,
        },
    });

    return (
        <AuthContext.Provider value={{
            user: token ? currentUser.data?.data : undefined,
            isCheckingSession: Boolean(token) && !currentUser.data
                && (currentUser.isPending || currentUser.isFetching),
            sessionCheckFailed: Boolean(token) && currentUser.isLoadingError && !currentUser.isFetching,
            retrySessionCheck: () => { void currentUser.refetch(); },
            startSession: setAccessToken,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

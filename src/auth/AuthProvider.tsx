import { matchQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import {
    getGetCurrentUserQueryKey,
    useGetCurrentUser,
    useLogout,
} from '../api/generated/authentication/authentication';
import { getHealthCheckQueryKey } from '../api/generated/health/health';
import { getSession, setAccessToken, subscribeToSession } from './session';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const { token, version } = useSyncExternalStore(subscribeToSession, getSession);
    const logout = useLogout({
        request: { timeout: 10_000 },
        mutation: {
            networkMode: 'always',
            retry: false,
            onMutate: () => getSession().version,
            onSuccess: (_data, _variables, requestVersion) => {
                if (requestVersion === getSession().version) {
                    setAccessToken(null);
                }
            },
        },
    });

    useEffect(() => {
        let previousSession = getSession();

        return subscribeToSession(() => {
            const hadToken = Boolean(previousSession.token);
            previousSession = getSession();
            if (!hadToken) return;

            // Health is the only public query in the OpenAPI contract.
            const publicQuery = { queryKey: getHealthCheckQueryKey(), exact: true };
            const privateQueries = { predicate: (query: Parameters<typeof matchQuery>[1]) => !matchQuery(publicQuery, query) };

            void queryClient.cancelQueries(privateQueries);
            queryClient.removeQueries(privateQueries);
        });
    }, [queryClient]);

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
            logout: () => logout.mutate(),
            isLoggingOut: logout.isPending && (logout.context === undefined || logout.context === version),
            logoutFailed: logout.isError && logout.context === version,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

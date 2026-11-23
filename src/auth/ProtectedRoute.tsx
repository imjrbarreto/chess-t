import { Navigate, Outlet, useLocation } from 'react-router';
import { SessionStatus } from './SessionStatus';
import { useAuth } from './useAuth';

export function ProtectedRoute() {
    const { user, isCheckingSession, sessionCheckFailed } = useAuth();
    const { pathname, search, hash } = useLocation();

    if (isCheckingSession || sessionCheckFailed) {
        return (
            <main className="mx-auto max-w-md p-6">
                <SessionStatus />
            </main>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ returnTo: { pathname, search, hash } }} />;
    }

    return <Outlet />;
}

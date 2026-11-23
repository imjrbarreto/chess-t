import { useAuth } from '../auth/useAuth';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function DashboardPage() {
    const { user, logout, isLoggingOut, logoutFailed } = useAuth();

    return (
        <main className="mx-auto max-w-3xl p-6">
            <Card>
                <h1 className="text-3xl font-bold text-primary">EloMetrics</h1>
                <h2 className="mt-6 text-xl font-semibold">Dashboard</h2>
                <p className="mt-2 text-sm text-muted">Has iniciado sesión como {user?.name}.</p>
                {logoutFailed && (
                    <Alert className="mt-4" variant="destructive">
                        No se pudo cerrar la sesión. Inténtalo de nuevo.
                    </Alert>
                )}
                <Button className="mt-6" variant="secondary" onClick={logout} disabled={isLoggingOut}>
                    {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </Button>
            </Card>
        </main>
    );
}

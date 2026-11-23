import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { useAuth } from './useAuth';

export function SessionStatus() {
    const { sessionCheckFailed, retrySessionCheck } = useAuth();

    if (sessionCheckFailed) {
        return (
            <Alert variant="destructive">
                <p>No se pudo verificar la sesión.</p>
                <Button className="mt-3" variant="secondary" onClick={retrySessionCheck}>
                    Reintentar
                </Button>
            </Alert>
        );
    }

    return <Alert>Comprobando la sesión…</Alert>;
}

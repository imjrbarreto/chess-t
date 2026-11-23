import { isAxiosError } from 'axios';
import { Link, Navigate, useLocation } from 'react-router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { SubmitEvent } from 'react';
import { useLogin } from '../api/generated/authentication/authentication';
import { Alert } from '../components/ui/Alert';
import { SessionStatus } from '../auth/SessionStatus';
import { useAuth } from '../auth/useAuth';


export function LoginPage() {
    const { user, isCheckingSession, sessionCheckFailed, startSession } = useAuth();
    const { state } = useLocation();
    const login = useLogin<unknown>({ mutation: { gcTime: 0 } });

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        login.mutate({
            data: {
                email: String(formData.get('email')),
                password: String(formData.get('password')),
            },
        }, {
            onSuccess: ({ token }) => {
                startSession(token.access_token);
                login.reset();
            },
        });
    }

    if (user) {
        return <Navigate to={state?.returnTo ?? '/dashboard'} replace />;
    }

    if (isCheckingSession || sessionCheckFailed) {
        return <SessionStatus />;
    }

    const errorStatus = isAxiosError(login.error) ? login.error.response?.status : undefined;

	console.log('Error status:', errorStatus);
	console.log('Axios error:', isAxiosError(login.error));
    
	return (
        <Card>
            <h2 className="text-xl font-semibold">
                Iniciar sesión
            </h2>

            <p className="mt-2 text-sm text-muted">
                Accede a tu cuenta de EloMetrics.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                {login.isError && (
                    <Alert variant="destructive">
                        {errorStatus === 401
                            ? 'El correo electrónico o la contraseña son incorrectos.'
                            : errorStatus === 422
                                ? 'Revisa el correo electrónico y la contraseña.'
                                : 'No se pudo iniciar sesión. Inténtalo de nuevo.'}
                    </Alert>
                )}
                <Input
                    id="email"
                    name="email"
                    label="Correo electrónico"
                    type="email"
                    autoComplete="email"
                    required
                />

                <Input
                    id="password"
                    name="password"
                    label="Contraseña"
                    type="password"
                    autoComplete="current-password"
                    required
                />

                <Button type="submit" className="w-full" disabled={login.isPending}>
                    {login.isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
                ¿Todavía no tienes cuenta?{' '}
                <Link
                    to="/register"
                    className="font-medium text-primary hover:underline"
                >
                    Regístrate
                </Link>
            </p>
        </Card>
    );
}

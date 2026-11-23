import { Link } from 'react-router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { SubmitEvent } from 'react';
import { useLogin } from '../api/generated/authentication/authentication';
import { Alert } from '../components/ui/Alert';

export function LoginPage() {
    const login = useLogin();

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    login.mutate({
        data: {
            email: String(formData.get('email')),
            password: String(formData.get('password')),
        },
    });
}
    return (
        <Card>
            <h2 className="text-xl font-semibold">
                Iniciar sesión
            </h2>

            <p className="mt-2 text-sm text-muted">
                Accede a tu cuenta de EloMetrics.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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

                <Button type="submit" className="w-full">
                    Iniciar sesión
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
import { Link } from 'react-router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { useRegister } from '../api/generated/authentication/authentication';
import { useAuth } from '../auth/useAuth';
import { Alert } from '../components/ui/Alert';

export function RegisterPage() {
    const register = useRegister();
    const { startSession } = useAuth();
    const navigate = useNavigate();

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        register.mutate(
            {
                data: {
                    name: String(formData.get('name')),
                    email: String(formData.get('email')),
                    password: String(formData.get('password')),
                    password_confirmation: String(
                        formData.get('password_confirmation')
                    ),
                },
            },
            {
                onSuccess: (response) => {
                    startSession(response.token.access_token);
                    navigate('/dashboard', { replace: true });
                },
            },
        );
    }
    return (
        <Card>
            <h2 className="text-xl font-semibold">
                Crear cuenta
            </h2>

            <p className="mt-2 text-sm text-muted">
                Comienza a gestionar tus entrenamientos.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">

                <Input
                    id="name"
                    name="name"
                    label="Nombre"
                    autoComplete="name"
                    required
                />

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
                    autoComplete="new-password"
                    minLength={8}
                    required
                />

                <Input
                    id="password_confirmation"
                    name="password_confirmation"
                    label="Confirmar contraseña"
                    type="password"
                    autoComplete="new-password"
                    required
                />


                {register.isError && (
                    <Alert variant="destructive">
                        No se ha podido crear la cuenta.
                    </Alert>
                )}
                <Button
                    type="submit"
                    className="w-full"
                    disabled={register.isPending}
                >
                    {register.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
                ¿Ya tienes una cuenta?{' '}
                <Link
                    to="/login"
                    className="font-medium text-primary hover:underline"
                >
                    Iniciar sesión
                </Link>
            </p>
        </Card>
    );
}
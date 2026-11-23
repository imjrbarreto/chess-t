import { Link } from 'react-router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export function RegisterPage() {
    return (
        <Card>
            <h2 className="text-xl font-semibold">
                Crear cuenta
            </h2>

            <p className="mt-2 text-sm text-muted">
                Comienza a gestionar tus entrenamientos.
            </p>

            <form className="mt-6 flex flex-col gap-4">
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

                <Button type="submit" className="w-full">
                    Crear cuenta
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
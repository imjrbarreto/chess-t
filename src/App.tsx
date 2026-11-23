import { useHealthCheck } from './api/generated/health/health';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';

function App() {
    const { isPending, isError, isSuccess } = useHealthCheck({
        request: {
            baseURL: 'http://127.0.0.1:8000',
        },
    });

    return (
        <div>
            <h1 className="text-3xl font-bold text-primary">
                EloMetrics
            </h1>

            {isPending && <p>Conectando con la API...</p>}
            {isError && <p>Error de conexión.</p>}
            {isSuccess && <p>API conectada correctamente ✅</p>}
        

            <div className="mx-auto flex max-w-sm flex-col gap-4 p-8">
                <Input
                    id="email"
                    label="Correo electrónico"
                    type="email"
                    placeholder="nombre@email.com"
                />

                <Input
                    id="password"
                    label="Contraseña"
                    type="password"
                    error="La contraseña es obligatoria."
                />

                <Button>Iniciar sesión</Button>
            </div>
            <div className="flex gap-4 p-8">
                <Button>Crear workspace</Button>

                <Button variant="secondary">Cancelar</Button>

                <Button variant="destructive">Eliminar</Button>

                <Button disabled>Guardando...</Button>
            </div>
        
        </div>
    );
}

export default App;
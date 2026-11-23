import { useHealthCheck } from './api/generated/health/health';
import { Button } from './components/ui/Button';

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
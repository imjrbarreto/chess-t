import { useHealthCheck } from './api/generated/health/health';

function App() {
    const { isPending, isError, isSuccess } = useHealthCheck({
        request: {
            baseURL: 'http://127.0.0.1:8000',
        },
    });

    return (
        <div>
            <h1>EloMetrics</h1>

            {isPending && <p>Conectando con la API...</p>}
            {isError && <p>Error de conexión.</p>}
            {isSuccess && <p>API conectada correctamente ✅</p>}
        </div>
    );
}

export default App;
import { useHealthCheck } from './api/generated/health/health';

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
        
          <button className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover">
              Crear workspace
          </button>
        
        </div>
    );
}

export default App;
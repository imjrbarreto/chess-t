import { Navigate, Route, Routes } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AuthLayout } from './layouts/AuthLayout';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
            </Route>
        </Routes>
    );
}

export default App;

// import { useHealthCheck } from './api/generated/health/health';
// import { Alert } from './components/ui/Alert';
// import { Badge } from './components/ui/Badge';
// import { Button } from './components/ui/Button';
// import { Card } from './components/ui/Card';
// import { Input } from './components/ui/Input';

// function App() {
//     const { isPending, isError, isSuccess } = useHealthCheck({
//         request: {
//             baseURL: 'http://127.0.0.1:8000',
//         },
//     });

//     return (
//         <div>
//             <h1 className="text-3xl font-bold text-primary">
//                 EloMetrics
//             </h1>

//             {isPending && <p>Conectando con la API...</p>}
//             {isError && <p>Error de conexión.</p>}
//             {isSuccess && <p>API conectada correctamente ✅</p>}
        

//             <div className="mx-auto flex max-w-lg flex-col gap-4 p-8">
//                 <Alert>Completa los datos de tu perfil.</Alert>

//                 <Alert variant="success">Workspace creado correctamente.</Alert>

//                 <Alert variant="warning">Tienes cambios sin guardar.</Alert>

//                 <Alert variant="destructive">Las credenciales son incorrectas.</Alert>
//             </div>

//             <div className="flex flex-wrap gap-3 p-8">
//                 <Badge variant="primary">Owner</Badge>
//                 <Badge variant="default">Viewer</Badge>
//                 <Badge variant="success">Active</Badge>
//                 <Badge variant="warning">Paused</Badge>
//                 <Badge variant="destructive">Cancelled</Badge>
//             </div>

//             <Card className="mx-auto max-w-sm">
//                 <h2 className="mb-4 text-xl font-semibold">
//                     Iniciar sesión
//                 </h2>

//                 <div className="flex flex-col gap-4">
//                     <Input id="email" label="Correo electrónico" type="email" />

//                     <Input id="password" label="Contraseña" type="password" />

//                     <Button>Iniciar sesión</Button>
//                 </div>
//             </Card>
//             <div className="mx-auto flex max-w-sm flex-col gap-4 p-8">
//                 <Input
//                     id="email"
//                     label="Correo electrónico"
//                     type="email"
//                     placeholder="nombre@email.com"
//                 />

//                 <Input
//                     id="password"
//                     label="Contraseña"
//                     type="password"
//                     error="La contraseña es obligatoria."
//                 />

//                 <Button>Iniciar sesión</Button>
//             </div>
//             <div className="flex gap-4 p-8">
//                 <Button>Crear workspace</Button>

//                 <Button variant="secondary">Cancelar</Button>

//                 <Button variant="destructive">Eliminar</Button>

//                 <Button disabled>Guardando...</Button>
//             </div>
        
//         </div>
//     );
// }

// export default App;
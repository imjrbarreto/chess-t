import { Navigate, Route, Routes } from 'react-router';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { WorkspaceDetailPage } from './pages/WorkspaceDetailPage';
import { TrainingSessionsPage } from './pages/TrainingSessionsPage';
import { TrainingSessionDetailPage } from './pages/TrainingSessionDetailPage';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/workspaces" element={<WorkspacesPage />} />
                    <Route path="/workspaces/:id" element={<WorkspaceDetailPage />} />
                    <Route path="/training-sessions" element={<TrainingSessionsPage />} />
                    <Route path="/training-sessions/:id" element={<TrainingSessionDetailPage />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;

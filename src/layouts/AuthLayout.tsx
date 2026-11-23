import { Outlet } from 'react-router';

export function AuthLayout() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-primary">
                        EloMetrics
                    </h1>

                    <p className="mt-2 text-sm text-muted">
                        Chess training management
                    </p>
                </div>

                <Outlet />
            </div>
        </main>
    );
}
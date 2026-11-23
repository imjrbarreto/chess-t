import { useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Menu, UserCircle } from 'lucide-react';

export function AppLayout() {
    const { user, logout, isLoggingOut, logoutFailed } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuButton = useRef<HTMLButtonElement>(null);
    const main = useRef<HTMLElement>(null);

    return (
        <div
            className="flex min-h-screen flex-col"
            onKeyDown={(event) => {
                if (event.key !== 'Escape') return;

                if (menuOpen) {
                    setMenuOpen(false);
                    menuButton.current?.focus();
                }

                if (userMenuOpen) {
                    setUserMenuOpen(false);
                    userMenuButton.current?.focus();
                }
            }}
        >
            <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                    <Button
                        ref={menuButton}
                        variant="secondary"
                        className="md:hidden"
                        aria-label="Menú"
                        aria-controls="app-sidebar"
                        aria-expanded={menuOpen}
                        onClick={() => {
                            setMenuOpen(!menuOpen);
                            setUserMenuOpen(false);
                        }}
                    >
                        <Menu size={20} />
                    </Button>

                    <span className="text-xl font-bold text-primary">
                        EloMetrics
                    </span>
                </div>

                <div className="hidden items-center gap-3 text-sm md:flex">
                    <span className="font-medium">{user?.name}</span>

                    <Button
                        variant="secondary"
                        onClick={logout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                    </Button>
                </div>

                <div className="relative md:hidden">
                    <Button
                        ref={userMenuButton}
                        variant="secondary"
                        aria-label="Menú de usuario"
                        aria-controls="user-menu"
                        aria-expanded={userMenuOpen}
                        onClick={() => {
                            setUserMenuOpen(!userMenuOpen);
                            setMenuOpen(false);
                        }}
                    >
                        <UserCircle size={22} />
                    </Button>

                    {userMenuOpen && (
                        <div
                            id="user-menu"
                            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-surface p-3 shadow-lg"
                        >
                            <p className="mb-3 break-words border-b border-border pb-3 text-sm font-semibold">
                                {user?.name}
                            </p>

                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={logout}
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex flex-1 flex-col md:flex-row">
                <aside id="app-sidebar" className={`${menuOpen ? 'block' : 'hidden'} border-b border-border bg-surface p-4 md:block md:w-56 md:shrink-0 md:border-r md:border-b-0`}>
                    <nav aria-label="Navegación principal">
                        <NavLink
                            to="/dashboard"
                            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-background aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
                            onClick={() => {
                                setMenuOpen(false);
                                main.current?.focus();
                            }}
                        >
                            Dashboard
                        </NavLink>
                        <NavLink
                            to="/workspaces"
                            className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-background aria-[current=page]:bg-primary/10 aria-[current=page]:text-primary"
                            onClick={() => {
                                setMenuOpen(false);
                                main.current?.focus();
                            }}
                        >
                            Workspaces
                        </NavLink>
                    </nav>
                </aside>

                <main ref={main} tabIndex={-1} className="min-w-0 flex-1 p-4 sm:p-6">
                    {logoutFailed && (
                        <Alert className="mb-4" variant="destructive">
                            No se pudo cerrar la sesión. Inténtalo de nuevo.
                        </Alert>
                    )}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

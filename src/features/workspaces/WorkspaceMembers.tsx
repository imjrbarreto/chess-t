import { useEffect, useId, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { MemberInputRole } from '../../api/generated/models';
import type { Member, Workspace } from '../../api/generated/models';
import {
    getListWorkspaceMembersQueryKey,
    useAddWorkspaceMember,
    useListWorkspaceMembers,
    useRemoveWorkspaceMember,
} from '../../api/generated/workspace-members/workspace-members';
import {
    getGetWorkspaceQueryKey,
    getListWorkspacesQueryKey,
} from '../../api/generated/workspaces/workspaces';
import { getListWorkspaceTrainingSessionsQueryKey } from '../../api/generated/workspace-training-sessions/workspace-training-sessions';
import { useAuth } from '../../auth/useAuth';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { workspaceRoles, workspaceRoleVariants } from './workspaceLabels';
import { Trash2 } from 'lucide-react';

function hasStatus(error: unknown, status: number) {
    return isAxiosError(error) && error.response?.status === status;
}

interface WorkspaceMembersProps {
    workspace: Workspace;
    active: boolean;
}

export function WorkspaceMembers({ workspace, active }: WorkspaceMembersProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const formId = useId();
    const leftWorkspace = useRef(false);
    const [target, setTarget] = useState<Pick<Member, 'id' | 'name'> | null>(null);
    const isOwner = workspace.role === 'owner';
    const leaving = target !== null && target.id === user?.id;
    const membersKey = getListWorkspaceMembersQueryKey(workspace.id);
    const detailKey = getGetWorkspaceQueryKey(workspace.id);
    const linkedSessionsKey = getListWorkspaceTrainingSessionsQueryKey(workspace.id);
    const membersQuery = useListWorkspaceMembers(workspace.id, {
        query: { enabled: active, retry: false },
    });
    const addMember = useAddWorkspaceMember({
        mutation: {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey }),
        },
    });
    const removeMember = useRemoveWorkspaceMember({
        mutation: {
            onSuccess: async (_, variables) => {
                if (variables.user !== user?.id) {
                    await queryClient.invalidateQueries({ queryKey: membersKey });
                    return;
                }

                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() }),
                    queryClient.invalidateQueries({ queryKey: detailKey, refetchType: 'none' }),
                    queryClient.invalidateQueries({ queryKey: membersKey, refetchType: 'none' }),
                    queryClient.invalidateQueries({ queryKey: linkedSessionsKey, refetchType: 'none' }),
                ]);
                queryClient.removeQueries({ queryKey: detailKey, exact: true, type: 'inactive' });
                queryClient.removeQueries({ queryKey: membersKey, exact: true, type: 'inactive' });
                queryClient.removeQueries({ queryKey: linkedSessionsKey, exact: true, type: 'inactive' });
            },
        },
    });

    useEffect(() => {
        const workspaceId = workspace.id;

        return () => {
            if (!leftWorkspace.current) return;

            queryClient.removeQueries({ queryKey: getGetWorkspaceQueryKey(workspaceId), exact: true });
            queryClient.removeQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId), exact: true });
            queryClient.removeQueries({ queryKey: getListWorkspaceTrainingSessionsQueryKey(workspaceId), exact: true });
        };
    }, [queryClient, workspace.id]);

    function handleAdd(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        addMember.mutate({
            workspace: workspace.id,
            data: {
                email: String(data.get('email')).trim(),
                role: data.get('role') as MemberInputRole,
            },
        }, {
            onSuccess: () => form.reset(),
        });
    }

    function handleRemove() {
        if (!target) return;

        removeMember.mutate({ workspace: workspace.id, user: target.id }, {
            onSuccess: () => {
                if (leaving) {
                    leftWorkspace.current = true;
                    navigate('/workspaces', { replace: true });
                } else {
                    setTarget(null);
                }
            },
        });
    }

    if (membersQuery.isPending) {
        return <p role="status" className="text-sm text-muted">Cargando miembros...</p>;
    }

    if (membersQuery.isError) {
        return (
            <Alert variant="destructive">
                {hasStatus(membersQuery.error, 403)
                    ? 'No tienes permiso para ver los miembros.'
                    : 'No se pudieron cargar los miembros.'}
            </Alert>
        );
    }

    const members = membersQuery.data.data;
    const addError = addMember.isError
        ? hasStatus(addMember.error, 403)
            ? 'No tienes permiso para añadir miembros.'
            : hasStatus(addMember.error, 422)
                ? 'Comprueba que el correo corresponde a un usuario registrado que aún no pertenece al workspace.'
                : 'No se pudo añadir el miembro.'
        : undefined;
    const removeError = removeMember.isError
        ? hasStatus(removeMember.error, 403)
            ? (leaving ? 'No tienes permiso para abandonar este workspace.' : 'No tienes permiso para eliminar este miembro.')
            : (leaving ? 'No se pudo abandonar el workspace.' : 'No se pudo eliminar el miembro.')
        : undefined;

    return (
        <div className="space-y-4">
            {isOwner && (
                <Card>
                    <h2 className="text-lg font-semibold">Añadir miembro</h2>
                    <form onSubmit={handleAdd} className="mt-4 grid gap-4">
                        <div className="grid gap-4 @min-[32rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                            <Input id={`${formId}-email`} name="email" label="Correo electrónico" type="email" required disabled={addMember.isPending} />
                            <Select id={`${formId}-role`} name="role" label="Rol" defaultValue="" required disabled={addMember.isPending}>
                                <option value="" disabled>Selecciona un rol</option>
                                {Object.values(MemberInputRole).map((role) => (
                                    <option key={role} value={role}>{workspaceRoles[role]}</option>
                                ))}
                            </Select>
                        </div>
                        {addError && <Alert variant="destructive">{addError}</Alert>}
                        <Button type="submit" className="@min-[24rem]:justify-self-end" disabled={addMember.isPending}>
                            {addMember.isPending ? 'Añadiendo...' : 'Añadir miembro'}
                        </Button>
                    </form>
                </Card>
            )}

            <Card>
                <h2 className="text-lg font-semibold">Miembros del workspace</h2>
                {members.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">No hay miembros en este workspace.</p>
                ) : (
                    <ul role="list" className="mt-3 divide-y divide-border border-t border-border">
                        {members.map((member) => (
                            <li key={member.id} className="grid gap-2 py-3 last:pb-0 @min-[30rem]:flex @min-[30rem]:items-center @min-[30rem]:justify-between">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="min-w-0 wrap-anywhere text-sm font-medium">{member.name}</span>
                                    <Badge variant={workspaceRoleVariants[member.role]}>
                                        {workspaceRoles[member.role]}
                                    </Badge>
                                </div>
                                {isOwner && member.role !== 'owner' && (
                                    <Button
                                        variant="secondary"
                                        className="flex items-center gap-2 hover:text-destructive"
                                        aria-label={`Eliminar a ${member.name}`}
                                        onClick={() => setTarget(member)}
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                        Eliminar
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {!isOwner && user && (
                    <div className="mt-5 grid @min-[24rem]:justify-items-start">
                        <Button variant="secondary" onClick={() => setTarget(user)}>
                            Abandonar workspace
                        </Button>
                    </div>
                )}
            </Card>

            {target && (
                <ConfirmDialog
                    title={leaving ? 'Abandonar workspace' : `Eliminar a ${target.name}`}
                    description={leaving
                        ? 'Perderás el acceso a este workspace.'
                        : 'Este miembro perderá el acceso al workspace.'}
                    confirmLabel={leaving ? 'Confirmar abandono' : undefined}
                    pendingLabel={leaving ? 'Abandonando...' : undefined}
                    onConfirm={handleRemove}
                    onCancel={() => {
                        removeMember.reset();
                        setTarget(null);
                    }}
                    isPending={removeMember.isPending}
                    error={removeError}
                />
            )}
        </div>
    );
}

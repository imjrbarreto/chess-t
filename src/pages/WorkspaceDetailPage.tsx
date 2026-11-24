import { Link, useParams, useNavigate, useSearchParams } from 'react-router';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { workspaceStatuses, workspaceRoles } from '../features/workspaces/workspaceLabels';
import { Button } from '../components/ui/Button';
import { Pencil, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { WorkspaceMembers } from '../features/workspaces/WorkspaceMembers';
import { WorkspaceTrainingSessions } from '../features/workspaces/WorkspaceTrainingSessions';
import { getListWorkspaceTrainingSessionsQueryKey } from '../api/generated/workspace-training-sessions/workspace-training-sessions';
import { getListWorkspaceMembersQueryKey } from '../api/generated/workspace-members/workspace-members';
import { EditWorkspaceForm } from '../features/workspaces/EditWorkspaceForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useQueryClient } from '@tanstack/react-query';
import {
    useGetWorkspace,
    useDeleteWorkspace,
    getListWorkspacesQueryKey,
    getGetWorkspaceQueryKey,
} from '../api/generated/workspaces/workspaces';

const tabs = ['General', 'Miembros', 'Sesiones'] as const;
const tabParams = ['general', 'members', 'sessions'] as const;

export function WorkspaceDetailPage() {
    const tabsId = useId();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedTab = tabs[tabParams.findIndex((tab) => tab === searchParams.get('tab'))] ?? 'General';
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const deleteWorkspace = useDeleteWorkspace();
    const [showEditForm, setShowEditForm] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { id } = useParams();
    const workspaceId = Number(id);
    const validId = Number.isSafeInteger(workspaceId) && workspaceId > 0;

    const workspaceQuery = useGetWorkspace(workspaceId, {
        query: {
            enabled: validId,
        },
    });

    if (!validId) {
        return <Alert variant="destructive">Workspace inválido.</Alert>;
    }

    if (workspaceQuery.isPending) {
        return <p>Cargando workspace...</p>;
    }

    if (workspaceQuery.isError || !workspaceQuery.data) {
        return (
            <Alert variant="destructive">
                No se pudo cargar el workspace.
            </Alert>
        );
    }

    const workspace = workspaceQuery.data.data;
    const status = workspaceStatuses[workspace.status];

    function handleDelete() {
        deleteWorkspace.mutate(
            {
                workspace: workspace.id,
            },
            {
                onSuccess: async () => {
                    await queryClient.invalidateQueries({
                        queryKey: getListWorkspacesQueryKey(),
                    });

                    navigate('/workspaces', { replace: true });

                    queryClient.removeQueries({
                        queryKey: getGetWorkspaceQueryKey(workspace.id),
                        exact: true,
                    });
                    queryClient.removeQueries({
                        queryKey: getListWorkspaceMembersQueryKey(workspace.id),
                        exact: true,
                    });
                    queryClient.removeQueries({
                        queryKey: getListWorkspaceTrainingSessionsQueryKey(workspace.id),
                        exact: true,
                    });
                },
            },
        );
    }

    return (
        <div className="@container mx-auto max-w-6xl space-y-6">
            <Link to="/workspaces" className="inline-flex min-h-10 items-center rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                Volver a workspaces
            </Link>

            <h1 className="text-3xl font-bold tracking-tight wrap-anywhere text-primary sm:text-4xl">
                {workspace.title}
            </h1>

            <div
                role="tablist"
                aria-label="Workspace"
                className="flex flex-wrap gap-2 border-b border-border pb-2"
            >
                {tabs.map((tab, index) => (
                    <Button
                        key={tab}
                        variant="secondary"
                        role="tab"
                        id={`${tabsId}-tab-${tab}`}
                        aria-controls={`${tabsId}-panel-${tab}`}
                        aria-selected={selectedTab === tab}
                        tabIndex={selectedTab === tab ? 0 : -1}
                        className="aria-selected:border-primary aria-selected:bg-primary/10 aria-selected:text-primary"
                        onClick={() => setSearchParams((params) => {
                            const next = new URLSearchParams(params);
                            if (index === 0) next.delete('tab');
                            else next.set('tab', tabParams[index]);
                            return next;
                        }, { replace: true })}
                        onKeyDown={(event) => {
                            const last = tabs.length - 1;
                            const destinations: Record<string, number> = {
                                Home: 0,
                                End: last,
                                ArrowLeft: index === 0 ? last : index - 1,
                                ArrowRight: index === last ? 0 : index + 1,
                            };
                            if (!Object.hasOwn(destinations, event.key)) return;

                            event.preventDefault();
                            const nextTab = tabs[destinations[event.key]];
                            document.getElementById(`${tabsId}-tab-${nextTab}`)?.focus();
                        }}
                    >
                        {tab}
                    </Button>
                ))}
            </div>

            <div
                role="tabpanel"
                id={`${tabsId}-panel-General`}
                aria-labelledby={`${tabsId}-tab-General`}
                hidden={selectedTab !== 'General'}
                tabIndex={0}
                className="space-y-4"
            >
                <Card>
                    <div className="grid gap-5 @min-[48rem]:grid-cols-[minmax(0,1fr)_auto] @min-[48rem]:items-start">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={status.variant}>
                                {status.label}
                            </Badge>

                            <Badge>
                                {workspaceRoles[workspace.role]}
                            </Badge>
                        </div>

                        {workspace.role === 'owner' && (
                            <div className="grid gap-2 @min-[29rem]:flex @min-[29rem]:flex-wrap">
                                <Button
                                    variant="secondary"
                                    className="flex items-center justify-center gap-2"
                                    onClick={() => setShowEditForm(true)}
                                >
                                    <Pencil size={18} aria-hidden="true" />
                                    Editar workspace
                                </Button>

                                <Button
                                    variant="destructive"
                                    className="flex items-center justify-center gap-2"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    <Trash2 size={18} aria-hidden="true" />
                                    Eliminar workspace
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
                {showEditForm && (
                    <EditWorkspaceForm
                        workspace={workspace}
                        onCancel={() => setShowEditForm(false)}
                    />
                )}
            </div>

            <div
                role="tabpanel"
                id={`${tabsId}-panel-Miembros`}
                aria-labelledby={`${tabsId}-tab-Miembros`}
                hidden={selectedTab !== 'Miembros'}
                tabIndex={0}
            >
                <WorkspaceMembers key={workspace.id} workspace={workspace} active={selectedTab === 'Miembros'} />
            </div>

            <div
                role="tabpanel"
                id={`${tabsId}-panel-Sesiones`}
                aria-labelledby={`${tabsId}-tab-Sesiones`}
                hidden={selectedTab !== 'Sesiones'}
                tabIndex={0}
            >
                {selectedTab === 'Sesiones' && <WorkspaceTrainingSessions key={workspace.id} workspace={workspace} />}
            </div>

            {showDeleteDialog && (
                <ConfirmDialog
                    title="Eliminar workspace"
                    description="Esta acción no se puede deshacer."
                    onConfirm={handleDelete}
                    onCancel={() => {
                        deleteWorkspace.reset();
                        setShowDeleteDialog(false);
                    }}
                    isPending={deleteWorkspace.isPending}
                    error={
                        deleteWorkspace.isError
                            ? 'No se pudo eliminar el workspace.'
                            : undefined
                    }
                />
            )}
        </div>
    );
}

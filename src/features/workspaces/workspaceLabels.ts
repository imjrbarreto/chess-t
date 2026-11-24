import type { WorkspaceRole, WorkspaceStatus } from '../../api/generated/models';

export const workspaceStatuses = {
    active: { label: 'Activo', variant: 'success' },
    paused: { label: 'Pausado', variant: 'warning' },
    archived: { label: 'Archivado', variant: 'default' },
} as const satisfies Record<WorkspaceStatus, {
    label: string;
    variant: string;
}>;

export const workspaceRoles: Record<WorkspaceRole, string> = {
    owner: 'Propietario',
    coach: 'Entrenador',
    student: 'Estudiante',
    viewer: 'Observador',
};

export const workspaceRoleVariants = {
    owner: 'primary',
    coach: 'success',
    student: 'warning',
    viewer: 'default',
} as const satisfies Record<WorkspaceRole, string>;
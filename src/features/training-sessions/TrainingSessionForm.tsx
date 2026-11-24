import { useId, useState } from 'react';
import type { SubmitEvent } from 'react';
import { isAxiosError } from 'axios';
import { TrainingCategory } from '../../api/generated/models';
import type { TrainingSession, TrainingSessionInput, ValidationError } from '../../api/generated/models';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { trainingCategoryLabels } from './trainingSessionLabels';

interface TrainingSessionFormProps {
    session?: TrainingSession;
    onSave: (data: TrainingSessionInput) => void;
    onCancel: () => void;
    isPending: boolean;
    error: unknown;
}

const categories = Object.values(TrainingCategory);

export function TrainingSessionForm({ session, onSave, onCancel, isPending, error }: TrainingSessionFormProps) {
    const id = useId();
    const [titleRequired, setTitleRequired] = useState(false);
    const response = isAxiosError<ValidationError>(error) ? error.response : undefined;
    const fields = response?.status === 422 ? response.data?.errors : undefined;
    const titleError = titleRequired ? 'Introduce un título.' : fields?.title?.[0];
    const categoryError = fields?.category?.[0];
    const descriptionError = fields?.description?.[0];

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const title = String(data.get('title')).trim();
        const category = data.get('category');
        const selectedCategory = categories.find((value) => value === category);

        setTitleRequired(!title);
        if (!title || !selectedCategory) return;

        onSave({
            title,
            category: selectedCategory,
            description: String(data.get('description')).trim() || null,
            resource: String(data.get('resource')).trim() || null,
        });
    }

    return (
        <Card className="@container">
            <h2 className="text-xl font-semibold tracking-tight">
                {session ? 'Editar sesión' : 'Nueva sesión'}
            </h2>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
                <div className="grid gap-4 @min-[34rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <Input
                        id={`${id}-title`}
                        name="title"
                        label="Título"
                        defaultValue={session?.title}
                        maxLength={255}
                        required
                        disabled={isPending}
                        error={titleError}
                        onChange={() => setTitleRequired(false)}
                    />
                    <div>
                        <Select
                            id={`${id}-category`}
                            name="category"
                            label="Categoría"
                            defaultValue={session?.category ?? ''}
                            required
                            disabled={isPending}
                            aria-invalid={Boolean(categoryError)}
                            aria-describedby={categoryError ? `${id}-category-error` : undefined}
                        >
                            <option value="" disabled>Selecciona una categoría</option>
                            {categories.map((value) => (
                                <option key={value} value={value}>{trainingCategoryLabels[value]}</option>
                            ))}
                        </Select>
                        {categoryError && (
                            <p id={`${id}-category-error`} className="mt-1.5 text-sm text-destructive">{categoryError}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${id}-description`} className="text-sm font-medium">Descripción</label>
                    <textarea
                        id={`${id}-description`}
                        name="description"
                        defaultValue={session?.description ?? ''}
                        maxLength={255}
                        rows={3}
                        disabled={isPending}
                        aria-invalid={Boolean(descriptionError)}
                        aria-describedby={descriptionError ? `${id}-description-error` : undefined}
                        className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-destructive"
                    />
                    {descriptionError && (
                        <p id={`${id}-description-error`} className="text-sm text-destructive">{descriptionError}</p>
                    )}
                </div>

                <Input
                    id={`${id}-resource`}
                    name="resource"
                    label="Recurso"
                    type="url"
                    maxLength={255}
                    defaultValue={session?.resource ?? ''}
                    disabled={isPending}
                    error={fields?.resource?.[0]}
                />

                {Boolean(error) && (
                    <Alert variant="destructive">
                        {response?.status === 422
                            ? 'Revisa los campos de la sesión.'
                            : response?.status === 403
                                ? 'No tienes permiso para modificar esta sesión.'
                                : 'No se pudo guardar la sesión.'}
                    </Alert>
                )}

                <div className="grid gap-3 @min-[22rem]:flex @min-[22rem]:justify-end">
                    <Button variant="secondary" onClick={onCancel} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

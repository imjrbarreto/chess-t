import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export function Input({
    label,
    error,
    id,
    className = '',
    ...props
}: InputProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>

            <input
                id={id}
                className={`w-full rounded-lg border bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 ${
                    error ? 'border-destructive' : 'border-border focus:border-primary'
                } ${className}`}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                {...props}
            />

            {error && (
                <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
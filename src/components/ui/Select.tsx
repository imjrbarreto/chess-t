import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    id: string;
    label: string;
}

export function Select({
    id,
    label,
    children,
    className = '',
    ...props
}: SelectProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium">
                {label}
            </label>

            <select
                id={id}
                className={`w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
                {...props}
            >
                {children}
            </select>
        </div>
    );
}
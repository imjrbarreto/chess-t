import type { HTMLAttributes } from 'react';

export function Card({
    children,
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`rounded-xl border border-border bg-surface p-6 shadow-sm ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
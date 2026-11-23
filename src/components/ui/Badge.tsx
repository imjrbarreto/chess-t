import type { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

const variants = {
    default: 'bg-gray-100 text-muted',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-amber-100 text-amber-800',
    destructive: 'bg-destructive/10 text-destructive',
};

export function Badge({
    variant = 'default',
    children,
    className = '',
    ...props
}: BadgeProps) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
}
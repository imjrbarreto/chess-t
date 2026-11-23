import type { HTMLAttributes } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'destructive';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    variant?: AlertVariant;
}

const variants = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-success/20 bg-success/10 text-success',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export function Alert({
    variant = 'info',
    children,
    className = '',
    ...props
}: AlertProps) {
    return (
        <div
            role={variant === 'destructive' ? 'alert' : 'status'}
            className={`rounded-lg border p-4 text-sm ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
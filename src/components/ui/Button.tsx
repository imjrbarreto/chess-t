import type { ComponentPropsWithRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps extends ComponentPropsWithRef<'button'> {
    variant?: ButtonVariant;
}

const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'bg-surface text-foreground border border-border hover:bg-gray-100',
    destructive: 'bg-destructive text-white hover:bg-red-700',
};

export function Button({
    variant = 'primary',
    children,
    className = '',
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={`rounded-lg px-4 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

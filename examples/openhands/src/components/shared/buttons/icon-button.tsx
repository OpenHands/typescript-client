import React from 'react';
import { cn } from '#/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const variantClasses = {
    default: 'bg-tertiary hover:bg-tertiary/80 border border-neutral-600',
    primary: 'bg-primary hover:bg-primary/80 text-base',
    ghost: 'hover:bg-white/10',
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <button
      type="button"
      className={cn(
        'rounded-lg transition-colors flex items-center justify-center',
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
}

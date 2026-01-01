import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, fullWidth = true, ...props }, ref) => {
        return (
            <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
                {label && (
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5 ml-1">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`input-field ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                        } ${className}`}
                    {...props}
                />
                {error && <p className="error-message">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;

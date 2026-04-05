import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, fullWidth = true, type, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';

        return (
            <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
                {label && (
                    <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: '#9ca3af' }}>
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        type={isPassword && showPassword ? 'text' : type}
                        className={`input-field ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
                            } ${isPassword ? 'pr-10' : ''} ${className}`}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                            style={{ color: '#6b7280' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#10b981')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                            tabIndex={-1}
                        >
                            {showPassword
                                ? <EyeOff className="w-4 h-4" />
                                : <Eye className="w-4 h-4" />
                            }
                        </button>
                    )}
                </div>
                {error && <p className="error-message">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;

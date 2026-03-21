import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline';
    fullWidth?: boolean;
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    className = '',
    variant = 'primary',
    fullWidth = false,
    isLoading = false,
    disabled,
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'text-[#022c22] focus:ring-emerald-500 shadow-lg shadow-emerald-500/20',
        secondary: 'bg-[#0c1510] hover:bg-[#112018] text-white border border-[rgba(16,185,129,0.12)] focus:ring-emerald-800',
        outline: 'border border-[rgba(255,255,255,0.08)] hover:border-[rgba(16,185,129,0.2)] text-[#9ca3af] hover:text-white bg-transparent focus:ring-emerald-800',
    };

    const sizes = 'py-3 px-6 text-sm';

    return (
        <button
            className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes}
        ${fullWidth ? 'w-full' : ''}
        ${variant === 'primary' ? 'bg-[#10b981] hover:bg-[#34d399]' : ''}
        ${className}
      `}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                </>
            ) : (
                children
            )}
        </button>
    );
};

export default Button;

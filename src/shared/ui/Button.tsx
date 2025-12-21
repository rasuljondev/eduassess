import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonColor = 'indigo' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'gray';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  label?: string;
  children?: ReactNode;
  customClassName?: string;
}

const colorStyles = {
  indigo: {
    solid: 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:ring-indigo-500',
    outline: 'border-2 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 focus:ring-indigo-500',
  },
  blue: {
    solid: 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500',
    outline: 'border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-blue-500',
  },
  green: {
    solid: 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 focus:ring-green-500',
    outline: 'border-2 border-green-600 dark:border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 focus:ring-green-500',
  },
  red: {
    solid: 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500',
    outline: 'border-2 border-red-600 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-500',
  },
  yellow: {
    solid: 'bg-yellow-600 dark:bg-yellow-500 text-white hover:bg-yellow-700 dark:hover:bg-yellow-600 focus:ring-yellow-500',
    outline: 'border-2 border-yellow-600 dark:border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:ring-yellow-500',
  },
  purple: {
    solid: 'bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600 focus:ring-purple-500',
    outline: 'border-2 border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 focus:ring-purple-500',
  },
  pink: {
    solid: 'bg-pink-600 dark:bg-pink-500 text-white hover:bg-pink-700 dark:hover:bg-pink-600 focus:ring-pink-500',
    outline: 'border-2 border-pink-600 dark:border-pink-400 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 focus:ring-pink-500',
  },
  gray: {
    solid: 'bg-gray-600 dark:bg-gray-500 text-white hover:bg-gray-700 dark:hover:bg-gray-600 focus:ring-gray-500',
    outline: 'border-2 border-gray-600 dark:border-gray-400 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 focus:ring-gray-500',
  },
};

const variantStyles = {
  primary: (color: ButtonColor) => colorStyles[color].solid,
  secondary: (color: ButtonColor) => colorStyles[color].solid,
  danger: () => colorStyles.red.solid,
  success: () => colorStyles.green.solid,
  outline: (color: ButtonColor) => colorStyles[color].outline,
  ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  color = 'indigo',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  customClassName,
  label,
  children,
  ...props
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const getVariantClass = () => {
    const style = variantStyles[variant];
    if (typeof style === 'function') {
      return style(color);
    }
    return style;
  };
  
  const variantClass = getVariantClass();
  const sizeClass = sizeStyles[size];
  const widthClass = fullWidth ? 'w-full' : '';
  
  const finalClassName = customClassName 
    ? `${baseStyles} ${sizeClass} ${widthClass} ${customClassName}`.trim()
    : `${baseStyles} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim();

  const buttonContent = label || children;

  return (
    <button
      className={finalClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {buttonContent}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};


import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import { Button } from './Button';
import type { ButtonProps } from './Button';

export interface ButtonLinkProps {
  to: string;
  children?: React.ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  color?: ButtonProps['color'];
  fullWidth?: boolean;
  className?: string;
  customClassName?: string;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  label?: string;
  // Link-specific props (excluding conflicting ones)
  replace?: LinkProps['replace'];
  state?: LinkProps['state'];
  reloadDocument?: LinkProps['reloadDocument'];
  preventScrollReset?: LinkProps['preventScrollReset'];
  relative?: LinkProps['relative'];
}

export const ButtonLink = ({ 
  to, 
  children, 
  variant = 'primary', 
  size = 'md',
  color,
  fullWidth, 
  className,
  customClassName,
  isLoading,
  leftIcon,
  rightIcon,
  label,
  replace,
  state,
  reloadDocument,
  preventScrollReset,
  relative,
}: ButtonLinkProps) => {
  return (
    <Link 
      to={to}
      replace={replace}
      state={state}
      reloadDocument={reloadDocument}
      preventScrollReset={preventScrollReset}
      relative={relative}
      className={fullWidth ? 'block w-full' : 'inline-block'}
      style={{ textDecoration: 'none' }}
    >
      <Button 
        variant={variant} 
        size={size}
        color={color}
        fullWidth={fullWidth} 
        className={className}
        customClassName={customClassName}
        isLoading={isLoading}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        label={label}
      >
        {children}
      </Button>
    </Link>
  );
};

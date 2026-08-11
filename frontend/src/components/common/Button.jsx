import React from 'react';
import Spinner from './Spinner';
import './Button.css';

export default function Button({
  children,
  variant = 'primary', // primary, secondary, outline, ghost, danger, success
  size = 'md',        // sm, md, lg
  fullWidth = false,
  loading = false,
  disabled = false,
  icon: Icon = null,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} color={variant === 'primary' || variant === 'danger' ? 'white' : 'primary'} />
      ) : (
        <>
          {Icon && <Icon className="btn-icon" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

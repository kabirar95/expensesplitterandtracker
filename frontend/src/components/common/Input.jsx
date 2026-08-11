import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(({
  label,
  error,
  helperText,
  icon: Icon = null,
  type = 'text',
  placeholder = '',
  className = '',
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`input-group ${error ? 'input-has-error' : ''} ${className}`}>
      {label && (
        <label className="input-label">
          {label} {required && <span className="input-required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {Icon && <Icon className="input-icon" />}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={`input-field ${Icon ? 'input-with-icon' : ''}`}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <span className={`input-message ${error ? 'error-text' : 'helper-text'}`}>
          {error || helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;

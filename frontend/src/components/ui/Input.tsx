import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, fullWidth = true, className = '', ...props }, ref) => {
    return (
      <div className={`flex flex-col space-y-1.5 ${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
        
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 dark:text-slate-500 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`w-full bg-white dark:bg-slate-900 border text-sm text-slate-900 dark:text-white rounded-xl placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm ${
              error 
                ? 'border-red-300 focus:border-red-500 dark:border-red-500/50 dark:focus:border-red-500' 
                : 'border-slate-200 dark:border-slate-700 focus:border-primary'
            } ${leftIcon ? 'pl-10' : 'pl-3'} ${rightIcon ? 'pr-10' : 'pr-3'} py-2.5`}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 text-slate-400 dark:text-slate-500 flex items-center pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

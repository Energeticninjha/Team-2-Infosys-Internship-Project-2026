import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    let bg = '';
    let color = '';
    let border = 'none';

    if (variant === 'primary') {
        bg = 'var(--primary)';
        color = 'var(--primary-fg)';
    } else if (variant === 'outline') {
        bg = 'transparent';
        color = 'var(--primary)';
        border = '2px solid var(--primary)';
    } else if (variant === 'ghost') {
        bg = 'transparent';
        color = 'var(--text-secondary)';
    } else if (variant === 'danger') {
        bg = 'hsl(var(--status-error))';
        color = '#fff';
    }

    return (
        <button
            className={`btn-transition ${className}`}
            style={{
                background: bg,
                color: color,
                border: border,
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
            }}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;

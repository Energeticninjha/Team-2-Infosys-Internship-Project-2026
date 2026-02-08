import React from 'react';

const Card = ({ children, className = '', noPadding = false, style = {}, ...props }) => {
    return (
        <div
            className={`nfx-card ${className}`}
            style={{
                backgroundColor: 'var(--bg-panel)',
                color: 'var(--text-main)',
                borderRadius: '1rem',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
                padding: noPadding ? '0' : '1.5rem',
                border: '1px solid var(--border-subtle)',
                ...style
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;

import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    // Map custom variants to Bootstrap classes or custom styles
    let btnClass = 'btn';

    switch (variant) {
        case 'primary':
            btnClass += ' btn-primary text-white';
            break;
        case 'secondary':
            btnClass += ' btn-secondary';
            break;
        case 'success':
            btnClass += ' btn-success text-white';
            break;
        case 'danger':
            btnClass += ' btn-danger text-white';
            break;
        case 'outline':
            btnClass += ' btn-outline-primary';
            break;
        case 'ghost':
            btnClass += ' btn-link text-decoration-none'; // Close to ghost
            break;
        case 'light':
            btnClass += ' btn-light';
            break;
        default:
            btnClass += ' btn-primary text-white';
    }

    return (
        <button className={`${btnClass} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;

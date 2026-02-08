import React from 'react';

const Card = ({ children, className = '', noPadding = false, ...props }) => {
    return (
        <div className={`card ${className}`} {...props}>
            <div className={noPadding ? '' : 'card-body'}>
                {children}
            </div>
        </div>
    );
};

export default Card;

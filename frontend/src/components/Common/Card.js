import React from 'react';

const Card = ({ children, className = '', noPadding = false, ...props }) => {
    return (
        <div className={`card ${className}`} {...props}>
            {noPadding ? children : (
                <div className="card-body">
                    {children}
                </div>
            )}
        </div>
    );
};

export default Card;

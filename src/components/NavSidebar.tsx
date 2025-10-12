import React, { useState } from 'react';

const NavSidebar = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div>
            {/* Hamburger menu button */}
            <button
                className="hamburger-btn"
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    zIndex: 1000,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 24,
                }}
                aria-label="Toggle sidebar"
            >
                &#9776;
            </button>
            {/* Sidebar */}
            <nav
                className={`sidebar${collapsed ? ' collapsed' : ''}`}
                style={{
                    width: collapsed ? 0 : 240,
                    transition: 'width 0.3s',
                    overflow: 'hidden',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    height: '100%',
                    background: '#222',
                    color: '#fff',
                    zIndex: 999,
                }}
            >
                {/* ...existing sidebar content... */}
            </nav>
        </div>
    );
};

export default NavSidebar;
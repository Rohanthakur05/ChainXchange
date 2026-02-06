import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SidebarContext = createContext(null);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
};

export const SidebarProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    const openSidebar = useCallback(() => {
        setIsOpen(true);
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = 'hidden';
    }, []);

    const closeSidebar = useCallback(() => {
        setIsOpen(false);
        document.body.style.overflow = '';
    }, []);

    const toggleSidebar = useCallback(() => {
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }, [isOpen, openSidebar, closeSidebar]);

    // ESC key to close sidebar
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeSidebar();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeSidebar]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const value = {
        isOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar
    };

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
};

export default SidebarContext;

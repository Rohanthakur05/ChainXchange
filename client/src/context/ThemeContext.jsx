import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const THEME_KEY = 'chainxchange-theme';

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Get initial theme from DOM (set by inline script in index.html)
const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    }
    return 'dark';
};

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(getInitialTheme);

    // Apply theme to DOM and persist
    const applyTheme = useCallback((newTheme) => {
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        setThemeState(newTheme);
    }, []);

    const setTheme = useCallback((newTheme) => {
        if (newTheme === 'dark' || newTheme === 'light') {
            applyTheme(newTheme);
        }
    }, [applyTheme]);

    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }, [theme, applyTheme]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            // Only update if user hasn't explicitly set a preference
            const storedTheme = localStorage.getItem(THEME_KEY);
            if (!storedTheme) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [applyTheme]);

    const value = {
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light'
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;

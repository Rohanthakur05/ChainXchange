import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import styles from './ThemeToggle.module.css';

const ThemeToggle = () => {
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <button
            className={styles.toggle}
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            type="button"
        >
            <span className={`${styles.icon} ${isDark ? styles.active : ''}`}>
                <Moon size={18} />
            </span>
            <span className={`${styles.icon} ${!isDark ? styles.active : ''}`}>
                <Sun size={18} />
            </span>
        </button>
    );
};

export default ThemeToggle;

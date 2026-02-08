import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar/Sidebar';
import Overlay from '../components/layout/Sidebar/Overlay';
import Topbar from '../components/layout/Topbar/Topbar';
import { GlobalSearchProvider } from '../context/GlobalSearchContext';
import { SidebarProvider } from '../context/SidebarContext';
import { ToastProvider } from '../components/ui/Toast';
import { KeyboardShortcutProvider, useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import GlobalSearchModal from '../components/layout/GlobalSearch/GlobalSearchModal';
import ShortcutHintModal from '../components/ui/ShortcutHintModal';
import styles from './DashboardLayout.module.css';

// Inner component to access keyboard shortcut context
const DashboardLayoutInner = () => {
    const { showShortcutHints, setShowShortcutHints } = useKeyboardShortcuts();

    return (
        <SidebarProvider>
            <div className={styles.layout}>
                {/* Sidebar (hidden by default, slides in) */}
                <Sidebar />

                {/* Overlay (visible when sidebar is open) */}
                <Overlay />

                {/* Main content area */}
                <div className={styles.main}>
                    <Topbar />
                    <main className={styles.content}>
                        <Outlet />
                    </main>
                </div>

                <GlobalSearchModal />

                {/* Keyboard Shortcut Hints Modal */}
                <ShortcutHintModal
                    isOpen={showShortcutHints}
                    onClose={() => setShowShortcutHints(false)}
                />
            </div>
        </SidebarProvider>
    );
};

const DashboardLayout = () => {
    return (
        <ToastProvider>
            <GlobalSearchProvider>
                <KeyboardShortcutProvider>
                    <DashboardLayoutInner />
                </KeyboardShortcutProvider>
            </GlobalSearchProvider>
        </ToastProvider>
    );
};

export default DashboardLayout;


import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar/Sidebar';
import Overlay from '../components/layout/Sidebar/Overlay';
import Topbar from '../components/layout/Topbar/Topbar';
import { GlobalSearchProvider } from '../context/GlobalSearchContext';
import { SidebarProvider } from '../context/SidebarContext';
import GlobalSearchModal from '../components/layout/GlobalSearch/GlobalSearchModal';
import styles from './DashboardLayout.module.css';

const DashboardLayout = () => {
    return (
        <GlobalSearchProvider>
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
                </div>
            </SidebarProvider>
        </GlobalSearchProvider>
    );
};

export default DashboardLayout;

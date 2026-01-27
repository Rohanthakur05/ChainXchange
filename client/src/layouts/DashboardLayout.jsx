import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar/Sidebar';
import Topbar from '../components/layout/Topbar/Topbar';
import { GlobalSearchProvider } from '../context/GlobalSearchContext';
import GlobalSearchModal from '../components/layout/GlobalSearch/GlobalSearchModal';
import styles from './DashboardLayout.module.css';

const DashboardLayout = () => {
    return (
        <GlobalSearchProvider>
            <div className={styles.layout}>
                <Sidebar />
                <div className={styles.main}>
                    <Topbar />
                    <main className={styles.content}>
                        <Outlet />
                    </main>
                </div>
                <GlobalSearchModal />
            </div>
        </GlobalSearchProvider>
    );
};

export default DashboardLayout;


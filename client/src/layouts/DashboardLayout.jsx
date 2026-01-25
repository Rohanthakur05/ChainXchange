import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar/Sidebar';
import Topbar from '../components/layout/Topbar/Topbar';
import styles from './DashboardLayout.module.css';

const DashboardLayout = () => {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <div className={styles.main}>
                <Topbar />
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;

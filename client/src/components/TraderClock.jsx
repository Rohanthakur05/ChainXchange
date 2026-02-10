import React, { useState, useEffect } from 'react';
import styles from './TraderClock.module.css';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const pad = (n) => String(n).padStart(2, '0');

const TraderClock = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const day = DAYS[now.getDay()];
    const month = MONTHS[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();

    return (
        <div className={styles.clockContainer}>
            <div className={styles.time}>
                {hours}
                <span className={styles.colonSeparator}>:</span>
                {minutes}
            </div>
            <div className={styles.dateText}>
                {day} &middot; {month} {date}, {year}
            </div>
        </div>
    );
};

export default TraderClock;

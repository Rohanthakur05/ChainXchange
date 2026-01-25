import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, Activity } from 'lucide-react';
import Button from '../components/ui/Button/Button';
import styles from './Home.module.css';

const Home = () => {
    return (
        <div className={styles.container}>
            <section className={styles.hero}>
                <h1 className={styles.title}>Trade Smarter. Not Harder.</h1>
                <p className={styles.subtitle}>
                    Execute trades with precision. Real-time prices, advanced charts, and secure wallet management all in one place.
                </p>
                <div className={styles.ctaGroup}>
                    <Link to="/markets">
                        <Button size="lg" variant="primary">Start Trading</Button>
                    </Link>
                    <Link to="/demo">
                        <Button size="lg" variant="secondary">View Demo</Button>
                    </Link>
                </div>
            </section>

            <div className={styles.tickerWrap}>
                <div className={styles.ticker}>
                    <span className={styles.tickerItem}>BTC +1.2%</span>
                    <span className={styles.tickerItem}>ETH -0.8%</span>
                    <span className={styles.tickerItem}>SOL +3.4%</span>
                    <span className={styles.tickerItem}>BNB +0.5%</span>
                    <span className={styles.tickerItem}>ADA -1.1%</span>
                    <span className={styles.tickerItem}>DOT +2.3%</span>
                    <span className={styles.tickerItem}>XRP +0.1%</span>
                    {/* Duplicate for infinite scroll illusion */}
                    <span className={styles.tickerItem}>BTC +1.2%</span>
                    <span className={styles.tickerItem}>ETH -0.8%</span>
                    <span className={styles.tickerItem}>SOL +3.4%</span>
                    <span className={styles.tickerItem}>BNB +0.5%</span>
                    <span className={styles.tickerItem}>ADA -1.1%</span>
                    <span className={styles.tickerItem}>DOT +2.3%</span>
                    <span className={styles.tickerItem}>XRP +0.1%</span>
                </div>
            </div>

            <section className={styles.features}>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}><Activity size={32} /></div>
                    <h3 className={styles.featureTitle}>Real-time Trading</h3>
                    <p className={styles.featureText}>Lightning fast execution with zero latency. Don't miss the market moves.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}><TrendingUp size={32} /></div>
                    <h3 className={styles.featureTitle}>Advanced Charts</h3>
                    <p className={styles.featureText}>Professional grade charting tools and indicators for technical analysis.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}><Shield size={32} /></div>
                    <h3 className={styles.featureTitle}>Secure Wallet</h3>
                    <p className={styles.featureText}>Industry leading security protocols to keep your assets safe at all times.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIcon}><Zap size={32} /></div>
                    <h3 className={styles.featureTitle}>Fast Execution</h3>
                    <p className={styles.featureText}>Optimized order matching engine capable of handling millions of transactions.</p>
                </div>
            </section>
        </div>
    );
};

export default Home;

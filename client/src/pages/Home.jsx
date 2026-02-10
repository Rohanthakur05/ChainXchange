import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, Activity } from 'lucide-react';
import Button from '../components/ui/Button/Button';
import TraderClock from '../components/TraderClock';
import styles from './Home.module.css';

/* Ticker data — each item has a label and direction */
const TICKER_DATA = [
    { label: 'BTC +1.2%', up: true },
    { label: 'ETH -0.8%', up: false },
    { label: 'SOL +3.4%', up: true },
    { label: 'BNB +0.5%', up: true },
    { label: 'ADA -1.1%', up: false },
    { label: 'DOT +2.3%', up: true },
    { label: 'XRP +0.1%', up: true },
];

/* Feature card config — icon animation class per card */
const ICON_ANIM = [styles.iconDraw, styles.iconPulse, styles.iconPulse, styles.iconFlash];

const Home = () => {
    const [unlocked, setUnlocked] = useState(false);
    const [cardsVisible, setCardsVisible] = useState(false);
    const featuresRef = useRef(null);
    const unlockFired = useRef(false);

    /* §6 — Focus lock: reveal on first interaction or after 800ms */
    const unlock = useCallback(() => {
        if (unlockFired.current) return;
        unlockFired.current = true;
        setUnlocked(true);
    }, []);

    useEffect(() => {
        const timer = setTimeout(unlock, 800);
        const events = ['scroll', 'click', 'touchstart', 'mousemove'];
        events.forEach((e) => window.addEventListener(e, unlock, { once: true, passive: true }));
        return () => {
            clearTimeout(timer);
            events.forEach((e) => window.removeEventListener(e, unlock));
        };
    }, [unlock]);

    /* §5 — IntersectionObserver for feature card entrance */
    useEffect(() => {
        const el = featuresRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setCardsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const containerCls = `${styles.container}${unlocked ? ` ${styles.unlocked}` : ''}`;

    return (
        <div className={containerCls}>
            <section className={styles.hero}>
                <TraderClock />
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

            {/* §4 — Color-coded ticker */}
            <div className={styles.tickerWrap}>
                <div className={styles.ticker}>
                    {[...TICKER_DATA, ...TICKER_DATA].map((item, i) => (
                        <span
                            key={i}
                            className={`${styles.tickerItem} ${item.up ? styles.tickerUp : styles.tickerDown}`}
                        >
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* §5 — Floating feature cards with entrance animation */}
            <section className={styles.features} ref={featuresRef}>
                {[
                    { Icon: Activity, title: 'Real-time Trading', text: "Lightning fast execution with zero latency. Don't miss the market moves.", animIdx: 0 },
                    { Icon: TrendingUp, title: 'Advanced Charts', text: 'Professional grade charting tools and indicators for technical analysis.', animIdx: 1 },
                    { Icon: Shield, title: 'Secure Wallet', text: 'Industry leading security protocols to keep your assets safe at all times.', animIdx: 2 },
                    { Icon: Zap, title: 'Fast Execution', text: 'Optimized order matching engine capable of handling millions of transactions.', animIdx: 3 },
                ].map((card, i) => (
                    <div
                        key={i}
                        className={`${styles.featureCard}${cardsVisible ? ` ${styles.cardVisible}` : ''}`}
                        style={cardsVisible ? { transitionDelay: `${i * 0.1}s` } : undefined}
                    >
                        <div className={`${styles.featureIcon}${cardsVisible ? ` ${ICON_ANIM[card.animIdx]}` : ''}`}
                            style={cardsVisible ? { animationDelay: `${i * 0.1 + 0.2}s` } : undefined}
                        >
                            <card.Icon size={32} />
                        </div>
                        <h3 className={styles.featureTitle}>{card.title}</h3>
                        <p className={styles.featureText}>{card.text}</p>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default Home;

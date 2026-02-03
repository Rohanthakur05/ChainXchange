import React, { useEffect, useRef, memo } from 'react';
import styles from './TradingViewChart.module.css';

/**
 * TradingView Advanced Chart Widget
 * Provides professional trading tools including:
 * - Candlestick charts
 * - Fibonacci tools (retracement, time zones)
 * - Technical indicators (RSI, MACD, MA)
 * - Drawing tools (trendlines, horizontal/vertical lines)
 * - Crosshair, zoom, pan
 * 
 * IMPORTANT: studies prop controls which indicators appear.
 * Default is empty array - NO indicators load automatically.
 * User must explicitly add indicators via the IndicatorsPanel.
 */
const TradingViewChart = memo(({
    symbol,
    interval = 'D',
    theme = 'dark',
    studies = []  // CRITICAL: Empty by default, no auto-apply
}) => {
    const containerRef = useRef(null);
    const widgetRef = useRef(null);

    useEffect(() => {
        // Clean up previous widget
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        // Create widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.id = `tradingview_${symbol}_${Date.now()}`;
        widgetContainer.style.height = '100%';
        widgetContainer.style.width = '100%';
        containerRef.current.appendChild(widgetContainer);

        // Load TradingView script
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => {
            if (window.TradingView && containerRef.current) {
                widgetRef.current = new window.TradingView.widget({
                    container_id: widgetContainer.id,
                    symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
                    interval: interval,
                    timezone: 'Etc/UTC',
                    theme: theme,
                    style: '1', // Candlesticks
                    locale: 'en',
                    toolbar_bg: '#0D1117',
                    enable_publishing: false,
                    allow_symbol_change: false,
                    save_image: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    withdateranges: true,
                    hide_side_toolbar: false,
                    details: true,
                    hotlist: false,
                    calendar: false,
                    studies: studies,  // Use prop - controlled by parent component
                    disabled_features: [
                        'header_symbol_search',
                        'header_compare'
                    ],
                    enabled_features: [
                        'study_templates',
                        'side_toolbar_in_fullscreen_mode'
                    ],
                    overrides: {
                        'paneProperties.background': '#0D1117',
                        'paneProperties.vertGridProperties.color': '#21262D',
                        'paneProperties.horzGridProperties.color': '#21262D',
                        'scalesProperties.textColor': '#8B949E',
                        'mainSeriesProperties.candleStyle.upColor': '#16C784',
                        'mainSeriesProperties.candleStyle.downColor': '#EA3943',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#16C784',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#EA3943',
                    },
                    autosize: true,
                });
            }
        };
        document.head.appendChild(script);

        return () => {
            // Cleanup
            if (widgetRef.current) {
                widgetRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, interval, theme, JSON.stringify(studies)]);

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.loading}>Loading TradingView Chart...</div>
        </div>
    );
});

TradingViewChart.displayName = 'TradingViewChart';

export default TradingViewChart;

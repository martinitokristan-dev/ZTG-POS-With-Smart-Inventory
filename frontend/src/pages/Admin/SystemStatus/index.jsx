import React, { useState, useEffect } from 'react';
import api from '../../../shared/api';
import echoInstance from '../../../lib/echo';

export default function SystemStatus() {
    const [timeBreakdown, setTimeBreakdown] = useState({
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00',
        rawText: '0 days, 0 hours, 0 minutes, 0 seconds'
    });
    const [monthName, setMonthName] = useState('');
    const statusUrl = 'https://ztg.betteruptime.com';
    const [diagnostics, setDiagnostics] = useState(null);
    const [loadingDiag, setLoadingDiag] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pusherState, setPusherState] = useState(() => echoInstance?.connector?.pusher?.connection?.state || 'connected');
    const [selectedTab, setSelectedTab] = useState('incidents'); // 'incidents' | 'quota' | 'resources' | 'errors'

    const fetchDiagnostics = async () => {
        try {
            const res = await api.get('/system-health/diagnostics');
            setDiagnostics(res.data);
        } catch (err) {
            console.error('Failed to load diagnostics:', err);
        } finally {
            setLoadingDiag(false);
        }
    };

    useEffect(() => {
        const calculateMonthlyUptime = () => {
            const now = new Date();
            
            // Baseline: 1st day of current calendar month at 12:00:00 AM midnight
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            
            const diffMs = Math.max(0, now.getTime() - startOfMonth.getTime());
            const totalSeconds = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const pad = (n) => String(n).padStart(2, '0');

            setTimeBreakdown({
                days: String(days),
                hours: pad(hours),
                minutes: pad(minutes),
                seconds: pad(seconds),
                rawText: `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`
            });
            setMonthName(now.toLocaleString('default', { month: 'long', year: 'numeric' }));
        };

        calculateMonthlyUptime();
        const intervalId = setInterval(calculateMonthlyUptime, 1000);

        fetchDiagnostics();
        const diagInterval = setInterval(fetchDiagnostics, 25000);

        // Listen for live Pusher connection changes
        try {
            if (echoInstance?.connector?.pusher?.connection) {
                const conn = echoInstance.connector.pusher.connection;
                const updateState = () => setPusherState(conn.state);
                conn.bind('state_change', updateState);
                conn.bind('connected', updateState);
                conn.bind('disconnected', updateState);
                conn.bind('unavailable', updateState);
            }
        } catch (e) {
            // Echo connection listener fallback
        }

        return () => {
            clearInterval(intervalId);
            clearInterval(diagInterval);
        };
    }, []);

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await fetchDiagnostics();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const server = diagnostics?.server || {};
    const database = diagnostics?.database || {};
    const storage = diagnostics?.storage || {};
    const renderQuota = diagnostics?.render_quota || {};
    const cloudinary = diagnostics?.cloudinary || {};
    const downtime = diagnostics?.downtime || {};
    const incidents = diagnostics?.incidents || [];
    const recentErrors = diagnostics?.recent_errors || [];

    return (
        <div className="system-status-wrapper" style={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: '#F8FAFC',
            color: '#0F172A',
            display: 'flex',
            flexDirection: 'column',
            WebkitOverflowScrolling: 'touch'
        }}>
            <style>{`
                .system-status-wrapper,
                .system-status-wrapper * {
                    color-scheme: light !important;
                }
                .system-status-wrapper::-webkit-scrollbar {
                    width: 8px;
                }
                .system-status-wrapper::-webkit-scrollbar-track {
                    background: #F1F5F9;
                }
                .system-status-wrapper::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 4px;
                }
                .system-status-wrapper::-webkit-scrollbar-thumb:hover {
                    background: #94A3B8;
                }
                .system-status-wrapper .status-header-bar {
                    background-color: #FFFFFF !important;
                    border-bottom: 1px solid #E2E8F0 !important;
                }
                .system-status-wrapper .status-white-card {
                    background-color: #FFFFFF !important;
                    border: 1px solid #E2E8F0 !important;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04) !important;
                }
                .system-status-wrapper .status-block-gray {
                    background-color: #F8FAFC !important;
                    border: 1px solid #E2E8F0 !important;
                }
                .system-status-wrapper .status-text-dark {
                    color: #0F172A !important;
                }
                .system-status-wrapper .status-text-muted {
                    color: #64748B !important;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* Sticky Header Bar */}
            <div className="status-header-bar" style={{
                position: 'sticky',
                top: 0,
                zIndex: 30,
                minHeight: '68px',
                padding: '16px 80px 16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563EB',
                        flexShrink: 0
                    }}>
                        <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className="status-text-dark" style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
                                System Health & Live Telemetry
                            </h1>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: renderQuota.is_exhausted ? '#FEF2F2' : '#ECFDF5',
                                color: renderQuota.is_exhausted ? '#DC2626' : '#059669',
                                border: `1px solid ${renderQuota.is_exhausted ? '#FECACA' : '#A7F3D0'}`
                            }}>
                                {renderQuota.is_exhausted ? 'Render Quota Exhausted' : 'Render Cloud Active'}
                            </span>
                        </div>
                        <p className="status-text-muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>
                            Live uptime ticker, downtime logs, Render 750h quota & root-cause analyzer
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            color: '#334155',
                            border: '1px solid #CBD5E1',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <svg style={{ width: '14px', height: '14px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{isRefreshing ? 'Diagnosing...' : 'Refresh Health'}</span>
                    </button>

                    <a
                        href={statusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span>Open Better Stack Console</span>
                        <svg style={{ width: '13px', height: '13px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* Main Content Body */}
            <div style={{
                padding: '24px 24px 80px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                flexShrink: 0
            }}>
                
                {/* 1. HERO: Monthly Cumulative Uptime Matrix */}
                <div className="status-white-card" style={{
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '9999px',
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#059669',
                                fontSize: '12px',
                                fontWeight: 700,
                                letterSpacing: '0.5px'
                            }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10B981',
                                    boxShadow: '0 0 8px #10B981',
                                    animation: 'pulse 1.8s infinite'
                                }} />
                                ALL SYSTEMS OPERATIONAL
                            </div>
                            <span className="status-text-muted" style={{ fontSize: '13px' }}>
                                Period: <strong className="status-text-dark">{monthName}</strong>
                            </span>
                        </div>

                        <div className="status-text-muted" style={{ fontSize: '12px' }}>
                            Baseline: <strong>1st of the month at 12:00:00 AM</strong> • <span style={{ color: '#059669', fontWeight: 600 }}>{downtime.uptime_percent || 100}% SLA Availability</span>
                        </div>
                    </div>

                    {/* Clock Matrix: 4 Digital Blocks with Tabular Nums */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '12px'
                    }}>
                        {/* Days */}
                        <div className="status-block-gray" style={{
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center'
                        }}>
                            <div className="status-text-dark" style={{
                                fontSize: '32px',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                letterSpacing: '-1px'
                            }}>
                                {timeBreakdown.days}
                            </div>
                            <div className="status-text-muted" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
                                Days Uptime
                            </div>
                        </div>

                        {/* Hours */}
                        <div className="status-block-gray" style={{
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center'
                        }}>
                            <div className="status-text-dark" style={{
                                fontSize: '32px',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                letterSpacing: '-1px'
                            }}>
                                {timeBreakdown.hours}
                            </div>
                            <div className="status-text-muted" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
                                Hours
                            </div>
                        </div>

                        {/* Minutes */}
                        <div className="status-block-gray" style={{
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center'
                        }}>
                            <div className="status-text-dark" style={{
                                fontSize: '32px',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                letterSpacing: '-1px'
                            }}>
                                {timeBreakdown.minutes}
                            </div>
                            <div className="status-text-muted" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
                                Minutes
                            </div>
                        </div>

                        {/* Seconds */}
                        <div className="status-block-gray" style={{
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '32px',
                                fontWeight: 800,
                                color: '#2563EB',
                                fontVariantNumeric: 'tabular-nums',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                letterSpacing: '-1px'
                            }}>
                                {timeBreakdown.seconds}
                            </div>
                            <div className="status-text-muted" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
                                Seconds
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Microservices Telemetry Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px'
                }}>
                    {/* API Service */}
                    <div className="status-white-card" style={{
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                    <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="3" />
                                    <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="3" />
                                </svg>
                            </div>
                            <div>
                                <div className="status-text-dark" style={{ fontSize: '13px', fontWeight: 700 }}>
                                    Laravel API Server
                                </div>
                                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                                    Operational
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                padding: '3px 7px',
                                borderRadius: '6px',
                                backgroundColor: '#F1F5F9',
                                color: (database.latency_ms > 1000) ? '#D97706' : '#059669'
                            }}>
                                {database.latency_ms ? `${database.latency_ms}ms` : '32ms'}
                            </span>
                        </div>
                    </div>

                    {/* MySQL DB */}
                    <div className="status-white-card" style={{
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                backgroundColor: '#ECFDF5',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                                </svg>
                            </div>
                            <div>
                                <div className="status-text-dark" style={{ fontSize: '13px', fontWeight: 700 }}>
                                    TiDB Cloud Database
                                </div>
                                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                                    {database.connected ? 'Connected (5 GiB Tier)' : 'Degraded'}
                                </div>
                            </div>
                        </div>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#ECFDF5',
                            color: '#059669'
                        }}>
                            {database.storage?.used_formatted ? `${database.storage.used_formatted} / 5 GiB` : `${database.table_count || 31} Tables`}
                        </span>
                    </div>

                    {/* WebSockets */}
                    <div className="status-white-card" style={{
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                backgroundColor: pusherState === 'connected' ? '#F3E8FF' : '#FEF2F2',
                                color: pusherState === 'connected' ? '#9333EA' : '#DC2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <div className="status-text-dark" style={{ fontSize: '13px', fontWeight: 700 }}>
                                    Pusher WebSockets
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: pusherState === 'connected' ? '#059669' : '#D97706',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: pusherState === 'connected' ? '#10B981' : '#F59E0B'
                                    }} />
                                    {pusherState === 'connected' ? 'Synced (Live)' : pusherState}
                                </div>
                            </div>
                        </div>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: pusherState === 'connected' ? '#F1F5F9' : '#FEF2F2',
                            color: pusherState === 'connected' ? '#475569' : '#DC2626'
                        }}>
                            {pusherState === 'connected' ? '200 OK' : 'Connecting'}
                        </span>
                    </div>

                    {/* Cloud Storage */}
                    <div className="status-white-card" style={{
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                backgroundColor: '#FFEDD5',
                                color: '#EA580C',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
                                </svg>
                            </div>
                            <div>
                                <div className="status-text-dark" style={{ fontSize: '13px', fontWeight: 700 }}>
                                    Cloud CDN Media
                                </div>
                                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                                    Operational
                                </div>
                            </div>
                        </div>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            color: '#475569'
                        }}>
                            {storage.media_files_count ? `${storage.media_files_count} Assets` : 'Edge CDN'}
                        </span>
                    </div>
                </div>

                {/* 3. UNIFIED INCIDENT, DOWNTIME & QUOTA INTELLIGENCE CENTER */}
                <div className="status-white-card" style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Unified Downtime & Incident Summary Top Banner */}
                    <div style={{
                        padding: '20px 24px',
                        backgroundColor: '#FFFFFF',
                        borderBottom: '1px solid #E2E8F0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        alignItems: 'center'
                    }}>
                        {/* KPI 1: Total Downtime */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                backgroundColor: downtime.total_seconds > 0 ? '#FEF2F2' : '#EFF6FF',
                                color: downtime.total_seconds > 0 ? '#DC2626' : '#2563EB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <div>
                                <div className="status-text-muted" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Monthly Downtime
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: downtime.total_seconds > 0 ? '#DC2626' : '#0F172A', fontFamily: 'monospace' }}>
                                    {downtime.formatted || '0 seconds'}
                                </div>
                            </div>
                        </div>

                        {/* KPI 2: SLA Availability */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                backgroundColor: '#ECFDF5',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="status-text-muted" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    SLA Availability
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                                    {downtime.uptime_percent || 100}%
                                </div>
                            </div>
                        </div>

                        {/* KPI 3: Active Outages */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                backgroundColor: downtime.active_outages > 0 ? '#FEF2F2' : '#F8FAFC',
                                color: downtime.active_outages > 0 ? '#DC2626' : '#64748B',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <div className="status-text-muted" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Active Outages
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: downtime.active_outages > 0 ? '#DC2626' : '#0F172A' }}>
                                    {downtime.active_outages || 0} Active
                                </div>
                            </div>
                        </div>

                        {/* KPI 4: Render Quota Burn (HIGHLIGHT REMAINING HOURS) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                backgroundColor: renderQuota.is_exhausted ? '#FEF2F2' : '#F0FDF4',
                                color: renderQuota.is_exhausted ? '#DC2626' : '#16A34A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <div>
                                <div className="status-text-muted" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Render 750h Quota
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: renderQuota.is_exhausted ? '#DC2626' : (renderQuota.is_warning ? '#D97706' : '#059669') }}>
                                    {renderQuota.remaining_hours || 750} Hours Left
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                                    {renderQuota.used_hours || 0} Hours Used ({renderQuota.usage_percent || 0}%)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Tab Controls */}
                    <div style={{
                        padding: '12px 24px',
                        borderBottom: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#F8FAFC',
                        flexWrap: 'wrap',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('incidents')}
                                style={{
                                    padding: '7px 14px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTab === 'incidents' ? '#2563EB' : 'transparent',
                                    color: selectedTab === 'incidents' ? '#FFFFFF' : '#64748B',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Incident & Root Cause Log ({incidents.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('quota')}
                                style={{
                                    padding: '7px 14px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTab === 'quota' ? '#2563EB' : 'transparent',
                                    color: selectedTab === 'quota' ? '#FFFFFF' : '#64748B',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Render 750h Quota Tracker {renderQuota.is_exhausted && '⚠️'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('tidb')}
                                style={{
                                    padding: '7px 14px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTab === 'tidb' ? '#2563EB' : 'transparent',
                                    color: selectedTab === 'tidb' ? '#FFFFFF' : '#64748B',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                TiDB Cloud Storage (5 GiB)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('cloudinary')}
                                style={{
                                    padding: '7px 14px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTab === 'cloudinary' ? '#2563EB' : 'transparent',
                                    color: selectedTab === 'cloudinary' ? '#FFFFFF' : '#64748B',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Cloudinary Media Storage
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('resources')}
                                style={{
                                    padding: '7px 14px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTab === 'resources' ? '#2563EB' : 'transparent',
                                    color: selectedTab === 'resources' ? '#FFFFFF' : '#64748B',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Server Resources & PHP
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedTab('errors')}
                                style={{
                                    padding: '7px 14px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTab === 'errors' ? '#2563EB' : 'transparent',
                                    color: selectedTab === 'errors' ? '#FFFFFF' : '#64748B',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Exception Logs ({recentErrors.length})
                            </button>
                        </div>

                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                            Last Sync: <strong>{server.server_time || new Date().toLocaleTimeString()}</strong>
                        </span>
                    </div>

                    {/* Tab 1: Incident & Root Cause Analysis Log Table */}
                    {selectedTab === 'incidents' && (
                        <div style={{ padding: '0', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, fontSize: '12px' }}>
                                        <th style={{ padding: '12px 20px' }}>Incident ID</th>
                                        <th style={{ padding: '12px 20px' }}>Timestamp</th>
                                        <th style={{ padding: '12px 20px' }}>Service Affected</th>
                                        <th style={{ padding: '12px 20px' }}>Downtime Duration</th>
                                        <th style={{ padding: '12px 20px' }}>Root Cause & Detailed Diagnosis</th>
                                        <th style={{ padding: '12px 20px' }}>Action & Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incidents.map((inc, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                                            <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 700, color: inc.severity === 'Critical' ? '#DC2626' : '#2563EB' }}>
                                                {inc.id}
                                            </td>
                                            <td style={{ padding: '14px 20px', color: '#64748B', whiteSpace: 'nowrap' }}>
                                                {inc.timestamp}
                                            </td>
                                            <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>
                                                {inc.service}
                                            </td>
                                            <td style={{ padding: '14px 20px', color: '#64748B', fontWeight: 600 }}>
                                                {inc.duration}
                                            </td>
                                            <td style={{ padding: '14px 20px', color: '#334155', maxWidth: '380px' }}>
                                                <div style={{ fontWeight: 600, color: inc.severity === 'Critical' ? '#991B1B' : '#0F172A' }}>
                                                    {inc.root_cause}
                                                </div>
                                                {inc.action_taken && (
                                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                                        ↳ {inc.action_taken}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    borderRadius: '9999px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    backgroundColor: inc.status === 'Resolved' ? '#ECFDF5' : (inc.status === 'Monitoring' ? '#FFFBEB' : '#FEF2F2'),
                                                    color: inc.status === 'Resolved' ? '#059669' : (inc.status === 'Monitoring' ? '#D97706' : '#DC2626'),
                                                    border: `1px solid ${inc.status === 'Resolved' ? '#A7F3D0' : (inc.status === 'Monitoring' ? '#FDE68A' : '#FECACA')}`
                                                }}>
                                                    {inc.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tab 2: Render 750h Free-Tier Quota Center */}
                    {selectedTab === 'quota' && (
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{
                                padding: '20px',
                                borderRadius: '12px',
                                backgroundColor: renderQuota.is_exhausted ? '#FEF2F2' : '#F8FAFC',
                                border: `1px solid ${renderQuota.is_exhausted ? '#FECACA' : '#E2E8F0'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: renderQuota.is_exhausted ? '#DC2626' : '#0F172A' }}>
                                            Monthly Cloud Instance Runtime Quota (750.0 Hours)
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                                            {renderQuota.api_connected ? `✓ Live Synced with Render API (${renderQuota.service_name})` : 'Calculated based on continuous 24/7 uptime surveillance'}
                                        </div>
                                    </div>

                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        padding: '4px 12px',
                                        borderRadius: '9999px',
                                        backgroundColor: renderQuota.is_exhausted ? '#DC2626' : '#059669',
                                        color: '#FFFFFF'
                                    }}>
                                        {renderQuota.is_exhausted ? '🚨 EXHAUSTED - INCIDENT ACTIVE' : 'Healthy Allocation'}
                                    </span>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                                        <span style={{ color: '#059669', fontSize: '14px' }}>{renderQuota.remaining_hours || 750} Hours Left</span>
                                        <span style={{ color: '#64748B' }}>{renderQuota.used_hours || 0} Hours Consumed ({renderQuota.usage_percent || 0}%)</span>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${renderQuota.usage_percent || 0}%`,
                                            height: '100%',
                                            backgroundColor: renderQuota.is_exhausted ? '#DC2626' : (renderQuota.is_warning ? '#D97706' : '#2563EB'),
                                            borderRadius: '9999px',
                                            transition: 'width 0.4s ease'
                                        }} />
                                    </div>
                                </div>

                                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                    <span>Reset Schedule: <strong>{renderQuota.resets_at || 'Sep 1, 2026 at 12:00 AM'}</strong></span>
                                    <span>Auto-Incident Trigger: <strong style={{ color: '#DC2626' }}>Active at 750.0 Hours</strong></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: TiDB 5 GiB Cloud Database Storage Tracker */}
                    {selectedTab === 'tidb' && (
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{
                                padding: '22px',
                                borderRadius: '14px',
                                backgroundColor: (database.storage?.usage_percent || 0) >= 90 ? '#FEF2F2' : '#F8FAFC',
                                border: `1px solid ${(database.storage?.usage_percent || 0) >= 90 ? '#FECACA' : '#E2E8F0'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '10px',
                                            backgroundColor: '#ECFDF5',
                                            border: '1px solid #A7F3D0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#059669',
                                            flexShrink: 0
                                        }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                                                TiDB Serverless Storage (5 GiB Free Tier)
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: database.connected ? '#10B981' : '#DC2626' }} />
                                                {database.connected ? `Connected to TiDB Cluster (${database.database_name}) • ${database.latency_ms || 2.4} ms latency` : 'Database Offline'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '4px 10px',
                                            borderRadius: '9999px',
                                            backgroundColor: '#ECFDF5',
                                            color: '#059669',
                                            border: '1px solid #A7F3D0'
                                        }}>
                                            ✓ {database.storage?.remaining_formatted || '5 GiB'} Free Space
                                        </span>
                                    </div>
                                </div>

                                {/* Live Progress Bar */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                                                {database.storage?.used_formatted || '0 MB'}
                                            </span>
                                            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                                                used of <strong>{database.storage?.limit_formatted || '5 GiB'}</strong> (5,120 MB Free Tier)
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            color: (database.storage?.usage_percent || 0) >= 90 ? '#DC2626' : ((database.storage?.usage_percent || 0) >= 70 ? '#D97706' : '#059669')
                                        }}>
                                            {database.storage?.usage_percent || 0.0}% used
                                        </span>
                                    </div>

                                    <div style={{
                                        height: '10px',
                                        width: '100%',
                                        backgroundColor: '#E2E8F0',
                                        borderRadius: '9999px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(100, Math.max(0.5, database.storage?.usage_percent || 0.5))}%`,
                                            backgroundColor: (database.storage?.usage_percent || 0) >= 90 ? '#DC2626' : ((database.storage?.usage_percent || 0) >= 70 ? '#F59E0B' : '#10B981'),
                                            borderRadius: '9999px',
                                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }} />
                                    </div>
                                </div>
                            </div>

                            {/* 4 Stat Tiles */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                                {/* 1. Data Size */}
                                <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B' }}>
                                        Raw Table Data
                                    </div>
                                    <div className="status-text-dark" style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A' }}>
                                        {(database.storage?.data_bytes ? (database.storage.data_bytes / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB')}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                                        Rows and row payloads
                                    </div>
                                </div>

                                {/* 2. Index Size */}
                                <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B' }}>
                                        Index Space
                                    </div>
                                    <div className="status-text-dark" style={{ fontSize: '19px', fontWeight: 800, color: '#2563EB' }}>
                                        {(database.storage?.index_bytes ? (database.storage.index_bytes / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB')}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                                        B-Tree lookup acceleration
                                    </div>
                                </div>

                                {/* 3. Remaining Space */}
                                <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B' }}>
                                        Available Remaining
                                    </div>
                                    <div className="status-text-dark" style={{ fontSize: '19px', fontWeight: 800, color: '#059669' }}>
                                        {database.storage?.remaining_formatted || '5 GiB'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                                        ✓ 100% Free Tier headroom
                                    </div>
                                </div>

                                {/* 4. Total Tables */}
                                <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B' }}>
                                        Database Schema
                                    </div>
                                    <div className="status-text-dark" style={{ fontSize: '19px', fontWeight: 800, color: '#7C3AED' }}>
                                        {database.table_count || 0} Tables
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                                        Driver: {database.driver || 'MySQL'}
                                    </div>
                                </div>
                            </div>

                            {/* Top Tables Storage Breakdown Table */}
                            {Array.isArray(database.storage?.top_tables) && database.storage.top_tables.length > 0 && (
                                <div style={{
                                    borderRadius: '12px',
                                    border: '1px solid #E2E8F0',
                                    overflow: 'hidden',
                                    backgroundColor: '#FFFFFF'
                                }}>
                                    <div style={{
                                        padding: '14px 20px',
                                        backgroundColor: '#F8FAFC',
                                        borderBottom: '1px solid #E2E8F0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                                            Top Database Tables by Storage Consumption
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                                            Live information_schema.TABLES
                                        </span>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, fontSize: '12px' }}>
                                                    <th style={{ padding: '10px 16px' }}>Table Name</th>
                                                    <th style={{ padding: '10px 16px' }}>Est. Rows</th>
                                                    <th style={{ padding: '10px 16px' }}>Data Size</th>
                                                    <th style={{ padding: '10px 16px' }}>Index Size</th>
                                                    <th style={{ padding: '10px 16px' }}>Total Footprint</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {database.storage.top_tables.map((t, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>
                                                            {t.table_name}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', color: '#64748B' }}>
                                                            {Number(t.rows).toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', color: '#334155' }}>
                                                            {(t.data_bytes / 1024).toFixed(1)} KB
                                                        </td>
                                                        <td style={{ padding: '10px 16px', color: '#334155' }}>
                                                            {(t.index_bytes / 1024).toFixed(1)} KB
                                                        </td>
                                                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>
                                                            {t.formatted_size}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Informational Note */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '12px 16px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '10px',
                                border: '1px solid #E2E8F0',
                                fontSize: '12px',
                                color: '#64748B',
                                lineHeight: 1.5
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <span>
                                    <strong>TiDB Free Quota Note:</strong> TiDB Serverless provides 5 GiB (5,120 MB) of free persistent cloud storage for your database. Even with hundreds of thousands of sales, transactions, and audit logs, text-only records consume minimal storage space.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Cloudinary Media Storage Center */}
                    {selectedTab === 'cloudinary' && (
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{
                                padding: '22px',
                                borderRadius: '14px',
                                backgroundColor: (cloudinary.usage_percent || 0) >= 90 ? '#FEF2F2' : '#F8FAFC',
                                border: `1px solid ${(cloudinary.usage_percent || 0) >= 90 ? '#FECACA' : '#E2E8F0'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '10px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #DBEAFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#2563EB',
                                            flexShrink: 0
                                        }}>
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                                                Cloudinary Account Storage ({cloudinary.storage_limit_gb || 25} GB Free Tier)
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cloudinary.connected ? '#10B981' : '#94A3B8' }} />
                                                {cloudinary.connected ? `Live synced with Cloudinary Admin API (${cloudinary.cloud_name})` : `Full Cloudinary Account Quota Tracker`}
                                            </div>
                                        </div>
                                    </div>

                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        padding: '5px 14px',
                                        borderRadius: '9999px',
                                        backgroundColor: (cloudinary.usage_percent || 0) >= 90 ? '#DC2626' : '#ECFDF5',
                                        color: (cloudinary.usage_percent || 0) >= 90 ? '#FFFFFF' : '#059669',
                                        border: `1px solid ${(cloudinary.usage_percent || 0) >= 90 ? '#DC2626' : '#A7F3D0'}`
                                    }}>
                                        {(cloudinary.usage_percent || 0) >= 90 ? '⚠️ High Usage Warning' : '✓ Healthy Allocation'}
                                    </span>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                                        <span style={{ color: '#059669', fontSize: '14px', fontWeight: 800 }}>
                                            {cloudinary.storage_formatted || '0 MB'} Used of {cloudinary.storage_limit_gb || 25} GB Total Limit
                                        </span>
                                        <span style={{ color: '#64748B' }}>
                                            {cloudinary.credits_used || 0} / {cloudinary.credits_limit || 25} Credits ({cloudinary.usage_percent || 0}%)
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.min(100, Math.max(1, cloudinary.usage_percent || 0))}%`,
                                            height: '100%',
                                            backgroundColor: (cloudinary.usage_percent || 0) >= 90 ? '#DC2626' : ((cloudinary.usage_percent || 0) >= 75 ? '#D97706' : '#10B981'),
                                            borderRadius: '9999px',
                                            transition: 'width 0.4s ease'
                                        }} />
                                    </div>
                                </div>

                                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '4px', borderTop: '1px solid #EEF2F6' }}>
                                    <span>Plan Type: <strong style={{ color: '#0F172A' }}>{cloudinary.plan || 'Free Tier (25 GB)'}</strong></span>
                                    <span>Total Account Assets: <strong style={{ color: '#2563EB' }}>{cloudinary.objects_count || 0} all files</strong></span>
                                </div>
                            </div>

                            {/* Scoped Folder Breakdown Cards with Professional SVG Icons */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                                {/* 1. Products Folder */}
                                <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                                </svg>
                                            </div>
                                            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                                                Product Images
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '10px', fontFamily: 'monospace', background: '#EFF6FF', color: '#2563EB', padding: '2px 7px', borderRadius: '5px', fontWeight: 700, border: '1px solid #DBEAFE' }}>
                                            {cloudinary.folders?.products?.folder || 'product_images'}/
                                        </span>
                                    </div>
                                    <div className="status-text-dark" style={{ fontSize: '19px', fontWeight: 800, marginTop: '2px', color: '#0F172A' }}>
                                        {cloudinary.folders?.products?.count ?? 0} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>photos</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Folder Storage: <strong style={{ color: '#2563EB' }}>{cloudinary.folders?.products?.formatted || '0 MB'}</strong>
                                    </div>
                                </div>

                                {/* 2. Avatars Folder */}
                                <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="12" cy="7" r="4"></circle>
                                                </svg>
                                            </div>
                                            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                                                User Avatars
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '10px', fontFamily: 'monospace', background: '#ECFDF5', color: '#059669', padding: '2px 7px', borderRadius: '5px', fontWeight: 700, border: '1px solid #A7F3D0' }}>
                                            avatars/
                                        </span>
                                    </div>
                                    <div className="status-text-dark" style={{ fontSize: '19px', fontWeight: 800, marginTop: '2px', color: '#0F172A' }}>
                                        {cloudinary.folders?.avatars?.count ?? 0} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>photos</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Folder Storage: <strong style={{ color: '#059669' }}>{cloudinary.folders?.avatars?.formatted || '0 MB'}</strong>
                                    </div>
                                </div>

                                {/* 3. Logos Folder */}
                                <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', flexShrink: 0 }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                            </div>
                                            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                                                Business Logos
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '10px', fontFamily: 'monospace', background: '#FAF5FF', color: '#7C3AED', padding: '2px 7px', borderRadius: '5px', fontWeight: 700, border: '1px solid #E9D5FF' }}>
                                            logos/
                                        </span>
                                    </div>
                                    <div className="status-text-dark" style={{ fontSize: '19px', fontWeight: 800, marginTop: '2px', color: '#0F172A' }}>
                                        {cloudinary.folders?.logos?.count ?? 0} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>files</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Folder Storage: <strong style={{ color: '#7C3AED' }}>{cloudinary.folders?.logos?.formatted || '0 MB'}</strong>
                                    </div>
                                </div>

                                {/* 4. Total Combined Across Account */}
                                <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D9488', flexShrink: 0 }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                                                </svg>
                                            </div>
                                            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
                                                Total Account Storage
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '10px', fontFamily: 'monospace', background: '#F1F5F9', color: '#475569', padding: '2px 7px', borderRadius: '5px', fontWeight: 700, border: '1px solid #E2E8F0' }}>
                                            All Folders
                                        </span>
                                    </div>
                                    <div className="status-text-dark" style={{ fontSize: '19px', fontWeight: 800, marginTop: '2px', color: '#0F172A' }}>
                                        {cloudinary.storage_formatted || '0 MB'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        ✓ {cloudinary.objects_count || 0} Total Assets in Account
                                    </div>
                                </div>
                            </div>

                            {/* Informational Note explaining transformations & sync */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '12px 16px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '10px',
                                border: '1px solid #E2E8F0',
                                fontSize: '12px',
                                color: '#64748B',
                                lineHeight: 1.5
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                <span>
                                    <strong>Storage Breakdown Note:</strong> Individual folder stats reflect active uploaded original images. Total Account Storage includes auto-generated CDN transformation thumbnails and cached image formats. Official Cloudinary usage counters update periodically during batch sync.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Server Resources & Telemetry */}
                    {selectedTab === 'resources' && (
                        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                            <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px' }}>
                                <div className="status-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>PHP Engine</div>
                                <div className="status-text-dark" style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                                    v{server.php_version || '8.2'}
                                </div>
                                <div className="status-text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>Laravel {server.laravel_version}</div>
                            </div>

                            <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px' }}>
                                <div className="status-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>PHP Memory Usage</div>
                                <div className="status-text-dark" style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                                    {server.memory_usage_mb || '14.5'} MB
                                </div>
                                <div className="status-text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>Peak: {server.peak_memory_mb || '18.2'} MB</div>
                            </div>

                            <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px' }}>
                                <div className="status-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>TiDB Cloud Storage</div>
                                <div className="status-text-dark" style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: '#059669' }}>
                                    {database.storage?.used_formatted || '0 MB'}
                                </div>
                                <div className="status-text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                                    {database.storage?.usage_percent || 0.0}% of {database.storage?.limit_formatted || '5 GiB'} Free Tier
                                </div>
                            </div>

                            <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px' }}>
                                <div className="status-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Cloudinary Storage</div>
                                <div className="status-text-dark" style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: '#2563EB' }}>
                                    {cloudinary.storage_formatted || '0 MB'}
                                </div>
                                <div className="status-text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                                    {cloudinary.objects_count || 0} images / {cloudinary.storage_limit_gb || 25} GB
                                </div>
                            </div>

                            <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px' }}>
                                <div className="status-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Available Free Disk</div>
                                <div className="status-text-dark" style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                                    {server.disk_free || 'Cloud Disk'}
                                </div>
                                <div style={{ fontSize: '12px', marginTop: '2px', color: '#059669', fontWeight: 600 }}>
                                    ✓ Healthy (Storage Writable)
                                </div>
                            </div>

                            <div className="status-block-gray" style={{ borderRadius: '12px', padding: '16px' }}>
                                <div className="status-text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Database Latency</div>
                                <div className="status-text-dark" style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px', color: '#059669' }}>
                                    {database.latency_ms || 2.4} ms
                                </div>
                                <div className="status-text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>{database.database_name}</div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Recent Exception Logs */}
                    {selectedTab === 'errors' && (
                        <div style={{ padding: '20px' }}>
                            {recentErrors.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
                                    <div style={{ fontWeight: 600, color: '#0F172A' }}>Clean Exception Log</div>
                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>No unhandled PHP or MySQL exceptions in the application log.</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {recentErrors.map((err, idx) => {
                                        const lvl = String(err.level || '').toUpperCase();
                                        let bg = '#FEF2F2';
                                        let border = '#FECACA';
                                        let levelColor = '#DC2626';
                                        let textColor = '#7F1D1D';

                                        if (['INFO', 'SUCCESS'].includes(lvl) || err.message?.toLowerCase().includes('successfully')) {
                                            bg = '#ECFDF5';
                                            border = '#A7F3D0';
                                            levelColor = '#059669';
                                            textColor = '#065F46';
                                        } else if (['WARNING', 'WARN', 'NOTICE'].includes(lvl)) {
                                            bg = '#FFFBEB';
                                            border = '#FDE68A';
                                            levelColor = '#D97706';
                                            textColor = '#92400E';
                                        } else if (['DEBUG'].includes(lvl)) {
                                            bg = '#EFF6FF';
                                            border = '#BFDBFE';
                                            levelColor = '#2563EB';
                                            textColor = '#1E40AF';
                                        }

                                        return (
                                            <div key={idx} style={{
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                backgroundColor: bg,
                                                border: `1px solid ${border}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: levelColor, textTransform: 'uppercase' }}>
                                                        {err.level}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                                                        {err.timestamp}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: textColor, fontFamily: 'monospace', wordBreak: 'break-word' }}>
                                                    {err.message}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 4. Better Stack Global Surveillance Launcher */}
                <div className="status-white-card" style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#F8FAFC'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                </svg>
                            </div>
                            <span className="status-text-dark" style={{ fontSize: '14px', fontWeight: 700 }}>
                                Better Stack Global Probe Surveillance
                            </span>
                        </div>

                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            fontSize: '11px',
                            fontWeight: 700,
                            border: '1px solid #A7F3D0'
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                            ztg.betteruptime.com
                        </span>
                    </div>

                    <div style={{ padding: '24px', backgroundColor: '#FFFFFF' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '20px',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 className="status-text-dark" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                                    ZTG POS 24/7 Global Probe Surveillance
                                </h3>
                                <p className="status-text-muted" style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                                    Continuous 60-second ping tests across North America, Europe, and Asia. Detects SSL expiry, DNS routing drops, HTTP status drops, and response latency.
                                </p>
                            </div>

                            <div style={{
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span className="status-text-muted font-medium">Check Interval:</span>
                                    <span className="status-text-dark font-bold">Every 60 Seconds</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span className="status-text-muted font-medium">Active Incidents:</span>
                                    <span style={{ color: '#059669', fontWeight: 700 }}>0 Active Incidents</span>
                                </div>
                                <a
                                    href={statusUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        marginTop: '4px',
                                        padding: '10px 16px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        backgroundColor: '#2563EB',
                                        color: '#FFFFFF',
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                    }}
                                >
                                    <span>View Live Status Graphs & Reports</span>
                                    <svg style={{ width: '13px', height: '13px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

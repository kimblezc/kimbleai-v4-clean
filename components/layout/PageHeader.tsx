'use client';

import TimeZoneDisplay from '../TimeZoneDisplay';
import versionData from '../../version.json';

interface PageHeaderProps {
  title: string;
  showTimeZones?: boolean;
  showVersion?: boolean;
}

export default function PageHeader({
  title,
  showTimeZones = true,
  showVersion = true
}: PageHeaderProps) {
  const versionInfo = {
    version: versionData.version,
    commit: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || versionData.commit || 'dev',
    lastUpdated: versionData.lastUpdated
  };

  return (
    <div style={{
      padding: '16px 24px',
      borderBottom: '1px solid #333',
      backgroundColor: '#171717',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      {/* Left: Time Zones */}
      <div style={{ flex: 1 }}>
        {showTimeZones && <TimeZoneDisplay />}
      </div>

      {/* Center: Page Title */}
      <h1 style={{
        fontSize: '24px',
        fontWeight: '700',
        fontFamily: '"Cinzel", serif',
        letterSpacing: '2px',
        background: 'linear-gradient(135deg, #4a9eff 0%, #00d4aa 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textAlign: 'center',
        flex: 1
      }}>
        {title}
      </h1>

      {/* Right: Version */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        {showVersion && (
          <div
            style={{
              padding: '4px 8px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #10b981',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#10b981',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            title={`Version ${versionInfo.version} - Commit ${versionInfo.commit}\nUpdated: ${new Date(versionInfo.lastUpdated).toLocaleString()}`}
          >
            <span>v{versionInfo.version}</span>
            <span style={{ color: '#666', fontWeight: '400' }}>@</span>
            <span style={{ fontSize: '11px', color: '#10b981', opacity: 0.8 }}>{versionInfo.commit}</span>
          </div>
        )}
      </div>
    </div>
  );
}

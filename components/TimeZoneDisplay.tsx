'use client';

import { useEffect, useState } from 'react';

export default function TimeZoneDisplay() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  const formatTime24 = (date: Date, timeZone: string) => {
    return date.toLocaleTimeString('en-US', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const timeZones = [
    { name: 'Germany', zone: 'Europe/Paris', color: 'text-blue-400' },
    { name: 'NC', zone: 'America/New_York', color: 'text-green-400' },
    { name: 'Nevada', zone: 'America/Los_Angeles', color: 'text-purple-400' }
  ];

  return (
    <div className="flex items-center gap-4 text-sm bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
      {timeZones.map((tz) => (
        <div key={tz.zone} className="flex items-center gap-2">
          <span className="text-gray-400 font-medium">{tz.name}:</span>
          <span className={`font-mono ${tz.color}`}>
            {formatTime24(time, tz.zone)}
          </span>
        </div>
      ))}
    </div>
  );
}

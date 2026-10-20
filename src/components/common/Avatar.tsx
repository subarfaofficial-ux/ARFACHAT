import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  username?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'away';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl font-semibold',
  '2xl': 'w-28 h-28 text-3xl font-bold',
};

const statusSizeClasses = {
  xs: 'w-2 h-2 bottom-0 right-0 border',
  sm: 'w-2.5 h-2.5 bottom-0 right-0 border-2',
  md: 'w-3 h-3 bottom-0.5 right-0.5 border-2',
  lg: 'w-3.5 h-3.5 bottom-0.5 right-0.5 border-2',
  xl: 'w-4 h-4 bottom-1 right-1 border-2',
  '2xl': 'w-5 h-5 bottom-1.5 right-1.5 border-4',
};

// Procedural background colors based on name
const colors = [
  'bg-blue-600 text-white',
  'bg-sky-600 text-white',
  'bg-indigo-600 text-white',
  'bg-cyan-700 text-white',
  'bg-teal-600 text-white',
  'bg-blue-500 text-white',
];

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  status,
  showStatus = false,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (str: string) => {
    if (!str) return 'U';
    const clean = str.replace('@', '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const getColorIndex = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % colors.length;
  };

  const bgColorClass = colors[getColorIndex(name)];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-slate-200/50 shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${bgColorClass} rounded-full flex items-center justify-center font-medium tracking-tight shadow-sm select-none`}
        >
          {getInitials(name)}
        </div>
      )}

      {showStatus && status && (
        <span
          className={`absolute rounded-full border-white ${statusSizeClasses[size]} ${
            status === 'online'
              ? 'bg-emerald-500'
              : status === 'away'
              ? 'bg-amber-400'
              : 'bg-slate-300'
          }`}
          title={status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline'}
        />
      )}
    </div>
  );
};

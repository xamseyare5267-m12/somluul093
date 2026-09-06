import React from 'react';
import { SomLuulIcon } from './SomLuulIcon';

export interface SomLuulLogoProps {
  variant?: 'horizontal' | 'stacked' | 'symbol' | 'text';
  mode?: 'auto' | 'light' | 'dark' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  showTagline?: boolean;
  taglineText?: string;
  className?: string;
  onClick?: () => void;
}

export const SomLuulLogo: React.FC<SomLuulLogoProps> = ({
  variant = 'horizontal',
  mode = 'auto',
  size = 'md',
  showTagline = false,
  taglineText = 'Digital Social Platform',
  className = '',
  onClick,
}) => {
  // Sizing mapping
  let iconSize = 36;
  let textSize = 'text-xl';
  let tagSize = 'text-[9px]';

  if (typeof size === 'number') {
    iconSize = size;
    textSize = size < 28 ? 'text-base' : size < 40 ? 'text-xl' : size < 56 ? 'text-2xl' : 'text-3xl';
  } else {
    switch (size) {
      case 'sm':
        iconSize = 28;
        textSize = 'text-base';
        tagSize = 'text-[8px]';
        break;
      case 'md':
        iconSize = 38;
        textSize = 'text-xl';
        tagSize = 'text-[10px]';
        break;
      case 'lg':
        iconSize = 48;
        textSize = 'text-2xl';
        tagSize = 'text-xs';
        break;
      case 'xl':
        iconSize = 64;
        textSize = 'text-4xl';
        tagSize = 'text-sm';
        break;
    }
  }

  // Color mode classes for "Som" text
  const somTextColor =
    mode === 'light'
      ? 'text-slate-900'
      : mode === 'dark'
      ? 'text-white'
      : mode === 'monochrome'
      ? 'text-slate-800 dark:text-slate-100'
      : 'text-slate-900 dark:text-white';

  if (variant === 'symbol') {
    return (
      <div
        className={`inline-flex items-center justify-center cursor-pointer select-none ${className}`}
        onClick={onClick}
      >
        <SomLuulIcon size={iconSize} variant={mode === 'monochrome' ? 'monochrome' : 'gradient'} />
      </div>
    );
  }

  const rendersSymbol = variant !== 'text';
  const isStacked = variant === 'stacked';

  return (
    <div
      className={`inline-flex ${
        isStacked ? 'flex-col items-center text-center gap-1.5' : 'items-center gap-2.5'
      } cursor-pointer select-none transition-opacity hover:opacity-95 ${className}`}
      onClick={onClick}
    >
      {rendersSymbol && (
        <SomLuulIcon
          size={iconSize}
          variant={mode === 'monochrome' ? 'monochrome' : 'gradient'}
          showGlow={size !== 'sm'}
        />
      )}

      <div className={`flex flex-col ${isStacked ? 'items-center' : 'items-start'} leading-none`}>
        <div className={`font-black tracking-tight ${textSize} font-sans flex items-center`}>
          {/* Som (Clean Neutral) */}
          <span className={`${somTextColor} transition-colors duration-200`}>
            Som
          </span>
          {/* Luul (Official Brand Gradient) */}
          <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent font-extrabold ml-0.5">
            Luul
          </span>
        </div>

        {showTagline && (
          <span
            className={`${tagSize} font-medium tracking-wider uppercase text-slate-400 dark:text-slate-500 mt-1`}
          >
            {taglineText}
          </span>
        )}
      </div>
    </div>
  );
};

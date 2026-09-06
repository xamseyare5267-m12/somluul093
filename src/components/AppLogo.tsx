import React, { useState } from 'react';
import { DEFAULT_SOMLUUL_LOGO } from './defaultLogo';
import { SomLuulIcon } from './brand/SomLuulIcon';

interface AppLogoProps {
  src?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  src,
  alt = 'SomLuul',
  className = 'w-10 h-10',
  containerClassName = '',
  size = 40,
}) => {
  const [hasError, setHasError] = useState(false);

  const isDefaultPath = !src || src.trim() === '' || src.includes('somluul_logo');

  if (isDefaultPath || hasError) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${containerClassName}`}>
        <SomLuulIcon size={size} className={className} />
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${containerClassName}`}>
      <img
        src={src || DEFAULT_SOMLUUL_LOGO}
        alt={alt}
        className={`${className} object-contain transition-transform duration-200`}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

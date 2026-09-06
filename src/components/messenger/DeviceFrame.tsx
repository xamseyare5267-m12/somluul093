import React from 'react';

interface DeviceFrameProps {
  children: React.ReactNode;
  language?: string;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  );
};


import React from 'react';

interface PixelPanelProps {
  title: string;
  color: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  children: React.ReactNode;
  className?: string;
  headerIcon?: React.ReactNode;
}

const colorMap = {
  blue: 'bg-pixel-blue border-pixel-border',
  green: 'bg-pixel-green border-pixel-border',
  orange: 'bg-pixel-orange border-pixel-border',
  red: 'bg-pixel-red border-pixel-border',
  gray: 'bg-pixel-gray border-pixel-border',
};

const PixelPanel: React.FC<PixelPanelProps> = ({ title, color, children, className = '', headerIcon }) => {
  return (
    <div className={`relative rounded-none border-pixel border-4 shadow-pixel ${colorMap[color]} ${className}`}
      style={{ fontFamily: "'Press Start 2P', monospace" }}>
      <div className={`flex items-center px-4 py-2 border-b-4 border-pixel-border text-white text-lg uppercase tracking-widest`}>
        {headerIcon && <span className="mr-2">{headerIcon}</span>}
        {title}
      </div>
      <div className="p-4 bg-pixel-gray text-white text-xs" style={{ minHeight: 80 }}>
        {children}
      </div>
    </div>
  );
};

export default PixelPanel; 
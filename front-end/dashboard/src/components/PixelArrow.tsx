import type { FC } from 'react';

// Props kept for backward compatibility but no longer used.
interface PixelArrowProps {
  direction?: 'right' | 'left' | 'up' | 'down';
  active?: boolean;
  className?: string;
}

// The component now renders nothing, effectively removing arrows from the UI.
const PixelArrow: FC<PixelArrowProps> = () => null;

export default PixelArrow;

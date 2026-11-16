import { useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  contentMaxWidth: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 768;
  const isWide = width >= 1200;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    contentMaxWidth: isDesktop ? 1400 : 520,
  };
}

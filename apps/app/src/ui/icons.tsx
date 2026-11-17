import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Line, G } from 'react-native-svg';
import { BrandLogo } from './BrandLogo';

export type IconName =
  | 'cart'
  | 'document'
  | 'box'
  | 'medical'
  | 'star'
  | 'car'
  | 'book'
  | 'home'
  | 'phone'
  | 'glasses'
  | 'toast'
  | 'heart'
  | 'dots'
  | 'people'
  | 'bus'
  | 'plugs'
  | 'scissors'
  | 'banknotes'
  | 'question'
  | 'settings'
  | 'menu'
  | 'sync'
  | 'chevron-left'
  | 'chevron-right'
  | 'calendar'
  | 'note'
  | 'trash'
  | 'plus'
  | 'pencil'
  | 'tab-home'
  | 'tab-calendar'
  | 'tab-statistic'
  | 'pie-chart'
  | 'backspace'
  | 'sun'
  | 'moon'
  | 'app-logo'
  | 'check'
  | 'close';

export { BrandLogo } from './BrandLogo';

export function AppIcon({
  name,
  size = 20,
  color = '#F5F5F5',
  strokeWidth = 1.75,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  switch (name) {
    case 'cart':
    case 'utensils':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.47 1.2h8.86a1.5 1.5 0 0 0 1.45-1.12L21 7H6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="9.5" cy="19.5" r="1.4" fill={color} />
          <Circle cx="17" cy="19.5" r="1.4" fill={color} />
        </Svg>
      );

    case 'document':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Path
            d="M14 3v5h5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'box':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="4"
            y="4"
            width="16"
            height="4"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Line
            x1="10"
            y1="12"
            x2="14"
            y2="12"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'medical':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'star':
    case 'film':
    case 'sparkles':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3.5l2.7 5.47 6.04.88-4.37 4.26 1.03 6.02L12 17.28l-5.4 2.85 1.03-6.02-4.37-4.26 6.04-.88L12 3.5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'car':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 11l1.8-5a2 2 0 0 1 1.88-1.3h6.64A2 2 0 0 1 17.2 6L19 11"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Rect
            x="3.5"
            y="11"
            width="17"
            height="6.5"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M5.5 17.5v2M18.5 17.5v2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Circle cx="7.5" cy="14.2" r="1" fill={color} />
          <Circle cx="16.5" cy="14.2" r="1" fill={color} />
        </Svg>
      );

    case 'book':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 6c-2.2-1.4-5.2-1.5-8-.5v13c2.8-1 5.8-.9 8 .5 2.2-1.4 5.2-1.5 8-.5v-13c-2.8-1-5.8-.9-8 .5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Line x1="12" y1="6" x2="12" y2="19" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );

    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Path
            d="M9.5 20.5v-6h5v6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'phone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="7"
            y="3"
            width="10"
            height="18"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Circle cx="12" cy="17.5" r="1" fill={color} />
        </Svg>
      );

    case 'glasses':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="7" cy="15" r="3.5" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx="17" cy="15" r="3.5" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M10.5 15h3M3.5 15L5 8.5M20.5 15L19 8.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'toast':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 10.5C4.5 9.8 4 7.8 5 6.3 6 4.8 8.8 4 12 4s6 .8 7 2.3c1 1.5.5 3.5-1 4.2V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7.5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Rect
            x="9"
            y="10"
            width="6"
            height="6"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth * 0.85}
          />
        </Svg>
      );

    case 'heart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 20s-7.5-4.6-7.5-10.2C4.5 6.8 6.8 4.5 9.6 4.5c1.6 0 3.1.8 2.4 2.2.7-1.4 2.2-2.2 3.8-2.2 2.8 0 5.1 2.3 5.1 5.3C20.9 15.4 12 20 12 20Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'dots':
    case 'tag':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx="8.5" cy="12" r="1.2" fill={color} />
          <Circle cx="12" cy="12" r="1.2" fill={color} />
          <Circle cx="15.5" cy="12" r="1.2" fill={color} />
        </Svg>
      );

    case 'people':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="9" cy="8.5" r="2.8" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M4 18.5c0-2.6 2.2-4.5 5-4.5s5 1.9 5 4.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Circle cx="16.5" cy="9.5" r="2.2" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M15 18.5c.3-1.9 1.8-3.4 4-3.4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'bus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="5"
            y="4"
            width="14"
            height="13.5"
            rx="2.5"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Line x1="5" y1="11" x2="19" y2="11" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M7.5 17.5v2.2M16.5 17.5v2.2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Circle cx="8.5" cy="14.5" r="1" fill={color} />
          <Circle cx="15.5" cy="14.5" r="1" fill={color} />
        </Svg>
      );

    case 'plugs':
    case 'bolt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M7 5v3M10 5v3M6 8h5v3a2.5 2.5 0 0 1-5 0V8ZM8.5 13.5V19M14 5v3M17 5v3M13 8h5v3a2.5 2.5 0 0 1-5 0V8ZM15.5 13.5V19"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'scissors':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="7" cy="17.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx="17" cy="17.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M8.8 15.5L17 5M15.2 15.5L7 5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'banknotes':
    case 'briefcase':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3.5"
            y="6"
            width="15"
            height="10"
            rx="1.8"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Circle cx="11" cy="11" r="2" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M6.5 18.5h12a2 2 0 0 0 2-2V9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'question':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9.2 9a3 3 0 0 1 5.6 1.5c0 2-2.8 2.5-2.8 4.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Circle cx="12" cy="18.2" r="1.2" fill={color} />
        </Svg>
      );

    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            stroke={color}
            strokeWidth={strokeWidth * 0.9}
          />
        </Svg>
      );

    case 'menu':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="4" y1="6.5" x2="20" y2="6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="4" y1="17.5" x2="20" y2="17.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );

    case 'sync':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 12a8 8 0 0 1 13.66-5.66L20 8.5M20 4v4.5h-4.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M20 12a8 8 0 0 1-13.66 5.66L4 15.5M4 20v-4.5h4.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'chevron-left':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M15 5l-7 7 7 7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'chevron-right':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 5l7 7-7 7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'calendar':
    case 'tab-calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3.5"
            y="5"
            width="17"
            height="15.5"
            rx="2.5"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke={color} strokeWidth={strokeWidth} />
          <Line x1="8" y1="3" x2="8" y2="6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="16" y1="3" x2="16" y2="6.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="8.5" cy="13.5" r="1" fill={color} />
          <Circle cx="12" cy="13.5" r="1" fill={color} />
          <Circle cx="15.5" cy="13.5" r="1" fill={color} />
          <Circle cx="8.5" cy="17" r="1" fill={color} />
          <Circle cx="12" cy="17" r="1" fill={color} />
        </Svg>
      );

    case 'note':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="5"
            y="3.5"
            width="14"
            height="17"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Line x1="8.5" y1="8.5" x2="15.5" y2="8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="8.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="8.5" y1="15.5" x2="13" y2="15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );

    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7M6.5 6.5l1 13a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8l1-13"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="10" y1="10.5" x2="10" y2="16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Line x1="14" y1="10.5" x2="14" y2="16.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );

    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
          <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      );

    case 'pencil':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'tab-home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 10.5L12 4l8 6.5V19.5a1 1 0 0 1-1 1h-4.5v-5.5h-5v5.5H5a1 1 0 0 1-1-1v-9Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'tab-statistic':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="12" width="4" height="8" rx="1" stroke={color} strokeWidth={strokeWidth} />
          <Rect x="10" y="5" width="4" height="15" rx="1" stroke={color} strokeWidth={strokeWidth} />
          <Rect x="16" y="9" width="4" height="11" rx="1" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );

    case 'pie-chart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21.21 15.89A10 10 0 1 1 8 2.83"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M22 12A10 10 0 0 0 12 2v10z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'backspace':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 6H9l-6 6 6 6h12a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 21 6Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Path
            d="M12.5 9.5l5 5M17.5 9.5l-5 5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'app-logo':
      return <BrandLogo size={size} variant="symbol-only" accentColor={color} />;

    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 13l4 4L19 7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 6l12 12M18 6L6 18"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );

    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
  }
}

export function CategoryBadge({
  icon,
  color,
  size = 40,
  variant = 'pastel',
}: {
  icon: string;
  color: string;
  size?: number;
  /**
   * 'pastel': pastel colored circle with dark outline icon (used in transaction lists & statistic rows)
   * 'grid-idle': neutral dark/light gray circle with light/dark outline icon (used in the category picker grid)
   */
  variant?: 'pastel' | 'grid-idle';
}) {
  const bg = variant === 'pastel' ? color : '#3A3A3C';
  const iconColor = variant === 'pastel' ? '#1C1C1E' : '#F5F5F5';

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      <AppIcon name={icon} size={Math.round(size * 0.52)} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

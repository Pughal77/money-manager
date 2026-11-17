import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

export interface BrandLogoProps {
  size?: number;
  /**
   * 'standard': Full minted medallion with sovereign emerald background and crisp white rim/symbol
   * 'symbol-only': Vector dual-pillar dollar glyph only (transparent background, uses accentColor or sovereign emerald)
   */
  variant?: 'standard' | 'symbol-only';
  accentColor?: string;
}

export const DOLLAR_SERIF_PATH = "M 175.42 299.93 L 190.46 299.93 L 198.15 336.66 C 202.93 342.25, 210.17 346.92, 219.86 350.68 C 229.54 354.44, 239.57 356.32, 249.93 356.32 C 282.63 356.32, 298.98 342.88, 298.98 315.99 C 298.98 307.55, 295.88 300.43, 289.67 294.63 C 283.46 288.82, 273.69 283.63, 260.36 279.07 C 240.76 272.58, 226.66 267.31, 218.06 263.27 C 209.45 259.22, 202.19 254.46, 196.26 248.99 C 190.34 243.52, 185.62 236.89, 182.09 229.08 C 178.56 221.28, 176.79 211.68, 176.79 200.29 C 176.79 180.12, 183.66 164.77, 197.39 154.24 C 211.11 143.70, 231.19 138.43, 257.62 138.43 C 276.77 138.43, 297.96 140.88, 321.20 145.77 L 321.20 200.29 L 305.98 200.29 L 298.29 168.85 C 286.68 160.41, 273.12 156.19, 257.62 156.19 C 243.61 156.19, 232.84 158.79, 225.32 163.97 C 217.80 169.16, 214.04 177.11, 214.04 187.82 C 214.04 195.44, 217.17 201.96, 223.43 207.38 C 229.70 212.80, 239.50 217.61, 252.84 221.82 C 278.93 230.37, 296.85 237.81, 306.59 244.13 C 316.33 250.45, 323.76 258.29, 328.89 267.63 C 334.01 276.96, 336.57 287.95, 336.57 300.60 C 336.57 349.25, 307.92 373.58, 250.62 373.58 C 237.52 373.58, 224.16 372.46, 210.54 370.24 C 196.93 368.02, 185.22 365.09, 175.42 361.44 Z";
export const DOLLAR_FULL_PATH = "M 246.86 372.81 C 234.67 372.58, 221.99 371.22, 208.83 368.72 C 195.67 366.21, 185.96 363.53, 179.69 360.67 L 179.69 305.98 L 195.59 305.98 L 201.73 337.78 C 205.16 342.45, 211.69 346.61, 221.31 350.25 C 230.94 353.90, 239.45 355.84, 246.86 356.06 L 246.86 272.66 C 227.71 265.14, 214.32 258.33, 206.69 252.23 C 199.06 246.14, 193.11 238.65, 188.83 229.77 C 184.55 220.88, 182.42 209.66, 182.42 196.09 C 182.42 179.69, 188.29 166.30, 200.03 155.94 C 211.77 145.57, 227.38 139.59, 246.86 138.00 L 246.86 115.95 L 264.30 115.95 L 264.30 137.66 C 281.49 138.34, 298.92 140.78, 316.58 145.00 L 316.58 192.69 L 301.03 192.69 L 295.56 168.25 C 292.26 164.94, 287.76 162.00, 282.06 159.44 C 276.36 156.88, 270.44 155.31, 264.30 154.73 L 264.30 225.67 C 278.54 231.36, 288.55 235.77, 294.36 238.91 C 300.17 242.04, 305.35 245.52, 309.91 249.34 C 314.47 253.16, 318.40 257.57, 321.70 262.58 C 325.02 267.59, 327.61 273.46, 329.48 280.19 C 331.37 286.91, 332.31 294.59, 332.31 303.25 C 332.31 323.19, 326.19 339.28, 313.94 351.53 C 301.69 363.78, 285.14 370.64, 264.30 372.12 L 264.30 396.05 L 246.86 396.05 Z  M 295.73 313.00 C 295.73 307.42, 294.71 302.63, 292.66 298.64 C 290.60 294.65, 287.61 291.23, 283.69 288.39 C 279.76 285.54, 273.30 282.46, 264.30 279.16 L 264.30 356.23 C 274.43 354.41, 282.20 349.89, 287.61 342.66 C 293.02 335.42, 295.73 325.53, 295.73 313.00 Z  M 219.00 187.05 C 219.00 192.29, 219.85 196.76, 221.56 200.47 C 223.27 204.17, 225.83 207.36, 229.25 210.03 C 232.66 212.71, 238.54 215.76, 246.86 219.17 L 246.86 155.08 C 237.86 156.45, 230.96 159.96, 226.17 165.59 C 221.39 171.23, 219.00 178.38, 219.00 187.05 Z";

export function BrandLogo({
  size = 32,
  variant = 'standard',
  accentColor,
}: BrandLogoProps) {
  // In symbol-only mode, default to sovereign emerald #0D734D or caller-specified accentColor
  const glyphColor = accentColor ?? '#0D734D';

  if (variant === 'symbol-only') {
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
        <G>
          {/* Left Pillar */}
          <Rect x="231" y="80" width="10" height="352" rx="1" fill={glyphColor} />
          <Rect x="226" y="80" width="20" height="6" rx="1" fill={glyphColor} />
          <Rect x="226" y="426" width="20" height="6" rx="1" fill={glyphColor} />

          {/* Right Pillar */}
          <Rect x="271" y="80" width="10" height="352" rx="1" fill={glyphColor} />
          <Rect x="266" y="80" width="20" height="6" rx="1" fill={glyphColor} />
          <Rect x="266" y="426" width="20" height="6" rx="1" fill={glyphColor} />

          {/* Serif S Body */}
          <Path d={DOLLAR_SERIF_PATH} fill={glyphColor} />
        </G>
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Defs>
        {/* Sovereign Emerald Green Gradient */}
        <LinearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#0D734D" />
          <Stop offset="50%" stopColor="#085437" />
          <Stop offset="100%" stopColor="#043622" />
        </LinearGradient>

        {/* Crisp White Pearl Gradient */}
        <LinearGradient id="logoWhite" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="40%" stopColor="#FFFFFF" />
          <Stop offset="80%" stopColor="#F0FDF4" />
          <Stop offset="100%" stopColor="#E2F4EB" />
        </LinearGradient>

        {/* Translucent Mint/White Rim */}
        <LinearGradient id="logoRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="50%" stopColor="#A7F3D0" stopOpacity="0.30" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.45" />
        </LinearGradient>
      </Defs>

      {/* Squircle Base */}
      <Rect width="512" height="512" rx="116" fill="url(#logoBg)" />

      {/* Minted Coin Borders */}
      <Rect
        x="36"
        y="36"
        width="440"
        height="440"
        rx="92"
        stroke="url(#logoRim)"
        strokeWidth="2.5"
      />
      <Rect
        x="50"
        y="50"
        width="412"
        height="412"
        rx="80"
        stroke="url(#logoRim)"
        strokeWidth="1.5"
        strokeDasharray="6 5"
        strokeOpacity="0.4"
      />

      {/* Corner Mint Accents */}
      <Circle cx="66" cy="66" r="3.5" fill="#FFFFFF" fillOpacity="0.65" />
      <Circle cx="446" cy="66" r="3.5" fill="#FFFFFF" fillOpacity="0.65" />
      <Circle cx="66" cy="446" r="3.5" fill="#FFFFFF" fillOpacity="0.65" />
      <Circle cx="446" cy="446" r="3.5" fill="#FFFFFF" fillOpacity="0.65" />

      {/* Formal Dual-Pillar Dollar Sign */}
      <G>
        {/* Left Pillar */}
        <Rect x="231" y="80" width="10" height="352" rx="1" fill="url(#logoWhite)" />
        <Rect x="226" y="80" width="20" height="6" rx="1" fill="url(#logoWhite)" />
        <Rect x="226" y="426" width="20" height="6" rx="1" fill="url(#logoWhite)" />

        {/* Right Pillar */}
        <Rect x="271" y="80" width="10" height="352" rx="1" fill="url(#logoWhite)" />
        <Rect x="266" y="80" width="20" height="6" rx="1" fill="url(#logoWhite)" />
        <Rect x="266" y="426" width="20" height="6" rx="1" fill="url(#logoWhite)" />

        {/* Serif S Body */}
        <Path d={DOLLAR_SERIF_PATH} fill="url(#logoWhite)" />
      </G>
    </Svg>
  );
}

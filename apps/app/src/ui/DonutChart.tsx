import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { computeDonutSlices, type DonutSliceInput } from '@mm/core';
import { useTheme } from './theme';

export function DonutChart({
  data,
  size = 200,
  centerLabel,
  maxLabelChars = 11,
}: {
  data: DonutSliceInput[];
  size?: number;
  centerLabel?: string;
  maxLabelChars?: number;
}) {
  const { colors } = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = Math.round(size * 0.45);
  const innerRadius = Math.round(size * 0.215);

  const computed = computeDonutSlices(data, cx, cy, outerRadius, innerRadius);

  if (computed.total <= 0 || computed.slices.length === 0) {
    const midR = (outerRadius + innerRadius) / 2;
    const strokeW = outerRadius - innerRadius;
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={midR}
            stroke={colors.borderSubtle}
            strokeWidth={strokeW}
            fill="none"
            opacity={0.45}
          />
        </Svg>
        {centerLabel ? (
          <View style={styles.centerOverlay} pointerEvents="none">
            <Text style={[styles.centerLabel, { color: colors.textMuted }]}>{centerLabel}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {computed.isSingleFullRing ? (
          <G>
            <Path
              d={computed.slices[0].pathData}
              fill={computed.slices[0].color}
            />
            {/* 12-o'clock divider tick as shown in the 100% single-slice reference photo */}
            <Line
              x1={cx}
              y1={cy - outerRadius}
              x2={cx}
              y2={cy - innerRadius}
              stroke={colors.surface}
              strokeWidth={2}
            />
            <SvgText
              x={computed.slices[0].labelX}
              y={computed.slices[0].labelY + 4}
              fill="#2C2C2E"
              fontSize={size < 160 ? 11 : 13}
              fontWeight="600"
              textAnchor="middle"
            >
              {truncateLabel(computed.slices[0].label, maxLabelChars)}
            </SvgText>
          </G>
        ) : (
          computed.slices.map((slice) => (
            <G key={slice.id}>
              <Path
                d={slice.pathData}
                fill={slice.color}
                stroke={colors.surface}
                strokeWidth={1.5}
              />
              {slice.showLabel ? (
                <SvgText
                  x={slice.labelX}
                  y={slice.labelY + 4}
                  fill="#2C2C2E"
                  fontSize={size < 160 ? 11 : 12.5}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {truncateLabel(slice.label, maxLabelChars)}
                </SvgText>
              ) : null}
            </G>
          ))
        )}
      </Svg>

      {centerLabel ? (
        <View style={styles.centerOverlay} pointerEvents="none">
          <Text
            style={[
              styles.centerLabel,
              {
                color: colors.textSecondary,
                fontSize: size < 160 ? 11 : 12,
              },
            ]}
          >
            {centerLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function truncateLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return label.slice(0, maxChars);
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontWeight: '600',
  },
});

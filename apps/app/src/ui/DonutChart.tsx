import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { computeDonutSlices, type DonutSliceInput } from '@mm/core';
import { useTheme } from './theme';

export function DonutChart({
  data,
  size = 200,
  centerLabel,
  centerSubLabel,
  maxLabelChars,
  selectedSliceId,
  onSlicePress,
  onCenterPress,
}: {
  data: DonutSliceInput[];
  size?: number;
  centerLabel?: string;
  centerSubLabel?: string;
  maxLabelChars?: number;
  selectedSliceId?: string | null;
  onSlicePress?: (sliceId: string) => void;
  onCenterPress?: () => void;
}) {
  const { colors } = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = Math.round(size * 0.45);
  const innerRadius = Math.round(size * 0.215);
  const centerHoleDiameter = innerRadius * 2;
  const effectiveMaxChars = maxLabelChars ?? (size < 160 ? 8 : 11);
  const showSubLabel = Boolean(centerSubLabel && size >= 180);

  const computed = computeDonutSlices(data, cx, cy, outerRadius, innerRadius);

  const renderCenterOverlay = (empty: boolean) => {
    if (!centerLabel && !showSubLabel) return null;
    const content = (
      <>
        {centerLabel ? (
          <Text
            style={[
              styles.centerLabel,
              {
                color: empty ? colors.textMuted : colors.textSecondary,
                fontSize: size < 160 ? 10.5 : 12.5,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {centerLabel}
          </Text>
        ) : null}
        {showSubLabel ? (
          <Text
            style={[
              styles.centerSubLabel,
              {
                color: colors.textMuted,
                fontSize: 10,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {centerSubLabel}
          </Text>
        ) : null}
      </>
    );

    if (onCenterPress) {
      return (
        <View style={styles.centerOverlay} pointerEvents="box-none">
          <Pressable
            onPress={onCenterPress}
            style={({ pressed }) => [
              styles.centerHitTarget,
              {
                width: centerHoleDiameter,
                height: centerHoleDiameter,
                borderRadius: innerRadius,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            {content}
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.centerOverlay} pointerEvents="none">
        <View
          style={[
            styles.centerHitTarget,
            {
              width: centerHoleDiameter,
              height: centerHoleDiameter,
              borderRadius: innerRadius,
            },
          ]}
        >
          {content}
        </View>
      </View>
    );
  };

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
        {renderCenterOverlay(true)}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {computed.isSingleFullRing ? (
          <G
            onPress={
              onSlicePress
                ? () => onSlicePress(computed.slices[0].id)
                : undefined
            }
          >
            <Path
              d={computed.slices[0].pathData}
              fill={computed.slices[0].color}
              opacity={
                selectedSliceId && selectedSliceId !== computed.slices[0].id
                  ? 0.5
                  : 1
              }
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
              y={computed.slices[0].labelY + 3.5}
              fill="#2C2C2E"
              fontSize={size < 160 ? 9.5 : 11.5}
              fontWeight="600"
              textAnchor="middle"
            >
              {truncateLabel(computed.slices[0].label, effectiveMaxChars)}
            </SvgText>
          </G>
        ) : (
          computed.slices.map((slice) => {
            const isDimmed =
              Boolean(selectedSliceId) && selectedSliceId !== slice.id;
            const isSelected = selectedSliceId === slice.id;
            return (
              <G
                key={slice.id}
                onPress={onSlicePress ? () => onSlicePress(slice.id) : undefined}
              >
                <Path
                  d={slice.pathData}
                  fill={slice.color}
                  stroke={isSelected ? colors.primary : colors.surface}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={isDimmed ? 0.45 : 1}
                />
                {slice.showLabel ? (
                  <SvgText
                    x={slice.labelX}
                    y={slice.labelY + 3.5}
                    fill="#2C2C2E"
                    fontSize={size < 160 ? 9.5 : 11.5}
                    fontWeight="600"
                    textAnchor="middle"
                    opacity={isDimmed ? 0.55 : 1}
                  >
                    {truncateLabel(slice.label, effectiveMaxChars)}
                  </SvgText>
                ) : null}
              </G>
            );
          })
        )}
      </Svg>

      {renderCenterOverlay(false)}
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
  centerHitTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  centerLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  centerSubLabel: {
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'center',
  },
});

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AppIcon } from './icons';
import { useTheme } from './theme';

export function PeriodHeader({
  monthLabel,
  rangeLabel,
  onPrev,
  onNext,
}: {
  monthLabel: string;
  rangeLabel: string;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[styles.monthText, { color: colors.text }]}>{monthLabel}</Text>
        <Text style={[styles.rangeText, { color: colors.textMuted }]}>{rangeLabel}</Text>
      </View>

      {onPrev && onNext ? (
        <View style={styles.arrows}>
          <Pressable
            onPress={onPrev}
            hitSlop={10}
            style={({ pressed }) => [styles.arrowBtn, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Previous period"
          >
            <AppIcon name="chevron-left" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onNext}
            hitSlop={10}
            style={({ pressed }) => [styles.arrowBtn, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Next period"
          >
            <AppIcon name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  monthText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  arrowBtn: {
    padding: 6,
  },
});

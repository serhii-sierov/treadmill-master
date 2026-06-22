import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Program } from '@/features/programs/types';
import { formatDuration } from '@/utils/format';
import { getProgramTotalDuration } from '@/features/programs';

interface ProgramCardProps {
  program: Program;
  selected?: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onQuickStart?: () => void;
}

export function ProgramCard(props: Readonly<ProgramCardProps>) {
  const { program, selected, onPress, onEdit, onQuickStart } = props;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const totalDuration = getProgramTotalDuration(program);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.tint : colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{program.name}</Text>
          {program.isPreset ? (
            <View style={[styles.badge, { backgroundColor: colors.tintMuted }]}>
              <Text style={[styles.badgeText, { color: colors.tint }]}>Preset</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.actions}>
          {onEdit ? (
            <Pressable onPress={onEdit} hitSlop={8}>
              <Text style={[styles.edit, { color: colors.tint }]}>Edit</Text>
            </Pressable>
          ) : null}
          {onQuickStart ? (
            <Pressable
              onPress={onQuickStart}
              hitSlop={8}
              accessibilityLabel={`Start ${program.name}`}
              accessibilityRole="button"
              style={[
                styles.quickStartButton,
                { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={18}
                tintColor="#FFFFFF"
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {program.description ? (
        <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
          {program.description}
        </Text>
      ) : null}

      <Text style={[styles.meta, { color: colors.muted }]}>
        {program.segments.length} segments · {formatDuration(totalDuration)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  edit: {
    fontSize: 15,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickStartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 13,
    fontWeight: '500',
  },
});

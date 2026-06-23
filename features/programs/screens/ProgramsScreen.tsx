import * as DocumentPicker from 'expo-document-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgramCard } from '@/components/ProgramCard';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { TabButton } from '@/components/TabButton';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAppStore } from '@/store/useAppStore';
import {
  filterProgramsByPreset,
  parseProgramsJson,
  resolveProgramsTab,
  type ProgramTab,
} from '@/features/programs';
import { fireAndForget, fireAndForgetAlert } from '@/utils/fire-and-forget';

export function ProgramsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProgramTab>('preset');
  const hydrate = useAppStore((state) => state.hydrate);
  const hydrated = useAppStore((state) => state.hydrated);
  const programs = useAppStore((state) => state.programs);
  const selectedProgramId = useAppStore((state) => state.selectedProgramId);
  const setSelectedProgram = useAppStore((state) => state.setSelectedProgram);
  const addProgram = useAppStore((state) => state.addProgram);
  const importPrograms = useAppStore((state) => state.importPrograms);
  const deleteProgram = useAppStore((state) => state.deleteProgram);
  const startWorkout = useAppStore((state) => state.startWorkout);
  const workout = useAppStore((state) => state.workout);
  const treadmill = useAppStore((state) => state.treadmill);

  const visiblePrograms = useMemo(
    () => filterProgramsByPreset(programs, activeTab === 'preset'),
    [programs, activeTab],
  );

  const selectedProgram = programs.find((item) => item.id === selectedProgramId) ?? null;
  const showDeleteFooter =
    activeTab === 'custom' && selectedProgram !== null && !selectedProgram.isPreset;
  const fabBottom = (showDeleteFooter ? 72 : 20) + insets.bottom;

  useEffect(() => {
    fireAndForgetAlert(hydrate(), 'Load failed');
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated) {
        return;
      }

      setActiveTab(
        resolveProgramsTab(programs, {
          selectedProgramId,
          activeWorkoutProgramId: workout?.isActive ? workout.programId : null,
        }),
      );
    }, [hydrated, programs, selectedProgramId, workout?.isActive, workout?.programId]),
  );

  useEffect(() => {
    if (!selectedProgramId) {
      return;
    }

    const selected = programs.find((item) => item.id === selectedProgramId);
    if (selected && selected.isPreset !== (activeTab === 'preset')) {
      setSelectedProgram(null);
    }
  }, [activeTab, programs, selectedProgramId, setSelectedProgram]);

  const handleCreate = () => {
    const program = addProgram();
    setActiveTab('custom');
    router.push(`/program/${program.id}`);
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const response = await fetch(result.assets[0].uri);
      const raw = await response.text();
      const imported = parseProgramsJson(raw);
      await importPrograms(imported);
      setActiveTab('custom');
      Alert.alert('Import complete', `Added ${imported.length} program(s).`);
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDelete = (programId: string, name: string) => {
    Alert.alert('Delete program', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => fireAndForgetAlert(deleteProgram(programId), 'Delete failed'),
      },
    ]);
  };

  const handleQuickStart = async (programId: string) => {
    setSelectedProgram(programId);

    if (workout?.isActive) {
      Alert.alert('Workout in progress', 'End the current workout before starting another.', [
        { text: 'OK', onPress: () => router.push('/workout') },
      ]);
      return;
    }

    if (!treadmill.connected) {
      Alert.alert(
        'Connect treadmill',
        'Connect your treadmill on the Workout tab before starting.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Workout', onPress: () => router.push('/workout') },
        ],
      );
      return;
    }

    try {
      await startWorkout(programId);
      router.push('/workout');
    } catch (error) {
      Alert.alert(
        'Could not start workout',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  if (!hydrated) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>Loading programs...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.tabRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TabButton
          label="Presets"
          active={activeTab === 'preset'}
          onPress={() => setActiveTab('preset')}
          colors={colors}
        />
        <TabButton
          label="Custom"
          active={activeTab === 'custom'}
          onPress={() => setActiveTab('custom')}
          colors={colors}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: fabBottom + 120 }]}>
        {visiblePrograms.length === 0 ? (
          <Text style={[styles.empty, { color: colors.muted }]}>
            {activeTab === 'preset'
              ? 'No preset programs found.'
              : 'No custom programs yet. Create one or import JSON.'}
          </Text>
        ) : (
          visiblePrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              selected={selectedProgramId === program.id}
              onPress={() => setSelectedProgram(program.id)}
              onEdit={() => {
                if (program.isPreset) {
                  Alert.alert(
                    'Preset program',
                    'Presets are read-only. Create a new program or duplicate by importing a copy.',
                  );
                  return;
                }
                router.push(`/program/${program.id}`);
              }}
              onQuickStart={() => fireAndForget(() => handleQuickStart(program.id))}
            />
          ))
        )}
      </ScrollView>

      {showDeleteFooter ? (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.card,
              paddingBottom: 16 + insets.bottom,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              if (selectedProgram) {
                handleDelete(selectedProgram.id, selectedProgram.name);
              }
            }}
          >
            <Text style={[styles.footerAction, { color: colors.danger }]}>Delete selected</Text>
          </Pressable>
        </View>
      ) : null}

      <View pointerEvents="box-none" style={[styles.fabStack, { bottom: fabBottom }]}>
        <FloatingActionButton
          accessibilityLabel="Import JSON"
          onPress={() => fireAndForget(handleImport())}
          size="small"
          backgroundColor={colors.card}
          borderColor={colors.border}
          icon={{ ios: 'square.and.arrow.down', android: 'download', web: 'download' }}
          iconColor={colors.text}
        />
        <FloatingActionButton
          accessibilityLabel="New program"
          onPress={handleCreate}
          size="large"
          backgroundColor={colors.tint}
          borderColor={colors.tint}
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          iconColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  fabStack: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    gap: 12,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: 24,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  footerAction: {
    fontSize: 15,
    fontWeight: '600',
  },
});

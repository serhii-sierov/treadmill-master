import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { loadSessionById } from '@/features/workout/repository.local';
import { SessionDetailScreen } from '@/features/workout/screens/SessionDetailScreen';
import type { WorkoutSession } from '@/features/workout/types';
import { useAppStore } from '@/store/useAppStore';
import { fireAndForgetAlert } from '@/utils/fire-and-forget';

export default function SessionDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const inclineUnit = useAppStore((state) => state.inclineUnit);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const storeSession = useAppStore((state) => state.sessions.find((item) => item.id === id));
  const [session, setSession] = useState<WorkoutSession | null>(storeSession ?? null);
  const [loading, setLoading] = useState(!storeSession);

  useEffect(() => {
    if (!id || storeSession) {
      return;
    }

    setLoading(true);
    fireAndForgetAlert(
      loadSessionById(id).then((loaded) => {
        setSession(loaded);
        setLoading(false);
      }),
      'Could not load workout',
    );
  }, [id, storeSession]);

  const handleDelete = () => {
    if (!session) {
      return;
    }

    Alert.alert(
      'Delete workout',
      `Remove "${session.programName}" from your history? Your statistics will be updated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            fireAndForgetAlert(
              deleteSession(session.id).then(() => router.back()),
              'Delete failed',
            );
          },
        },
      ],
    );
  };

  if (!id) {
    return null;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.muted }}>Loading workout...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.muted }}>Workout not found.</Text>
      </View>
    );
  }

  return (
    <SessionDetailScreen
      session={session}
      inclineUnit={inclineUnit}
      colors={colors}
      onDelete={handleDelete}
    />
  );
}

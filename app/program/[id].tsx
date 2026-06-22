import { useLocalSearchParams } from 'expo-router';

import { ProgramEditorScreen } from '@/features/programs/screens/ProgramEditorScreen';

export default function ProgramEditorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <ProgramEditorScreen programId={id} />;
}

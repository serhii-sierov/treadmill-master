import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type View as ViewType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentEditor } from '@/components/SegmentEditor';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAppStore } from '@/store/useAppStore';
import type { Program } from '@/features/programs/types';
import { createEmptySegment, getProgramTotalDuration } from '@/features/programs';
import { fireAndForgetAlert } from '@/utils/fire-and-forget';
import { formatDuration } from '@/utils/format';

const KEYBOARD_SCROLL_OFFSET = 120;
const KEYBOARD_SCROLL_DELAY_MS = Platform.OS === 'ios' ? 320 : 120;

interface ProgramEditorScreenProps {
  programId: string;
}

export function ProgramEditorScreen(props: Readonly<ProgramEditorScreenProps>) {
  const { programId: id } = props;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<ViewType>(null);
  const nameFieldRef = useRef<ViewType>(null);
  const descriptionFieldRef = useRef<ViewType>(null);
  const hydrate = useAppStore((state) => state.hydrate);
  const programs = useAppStore((state) => state.programs);
  const updateProgram = useAppStore((state) => state.updateProgram);
  const inclineUnit = useAppStore((state) => state.inclineUnit);
  const [draft, setDraft] = useState<Program | null>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollFieldIntoView = useCallback((field: ViewType) => {
    const doScroll = () => {
      if (!contentRef.current || !scrollRef.current) {
        return;
      }

      field.measureLayout(
        contentRef.current,
        (_x, y) => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - KEYBOARD_SCROLL_OFFSET),
            animated: true,
          });
        },
        () => undefined,
      );
    };

    // Wait for the keyboard inset animation before scrolling.
    setTimeout(doScroll, KEYBOARD_SCROLL_DELAY_MS);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    fireAndForgetAlert(hydrate(), 'Load failed');
  }, [hydrate]);

  useEffect(() => {
    const program = programs.find((item) => item.id === id);
    if (program) {
      setDraft({ ...program });
    }
  }, [programs, id]);

  if (!draft) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>Program not found</Text>
      </View>
    );
  }

  const totalDuration = getProgramTotalDuration(draft);

  const handleSave = async () => {
    if (!draft.name.trim()) {
      Alert.alert('Name required', 'Give your program a name before saving.');
      return;
    }

    if (draft.segments.length === 0) {
      Alert.alert('Segments required', 'Add at least one segment.');
      return;
    }

    await updateProgram({ ...draft, name: draft.name.trim() });
    router.back();
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors.background }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 16 : insets.bottom + 24 },
      ]}
    >
      <View ref={contentRef} collapsable={false} style={styles.form}>
        <Text style={[styles.label, { color: colors.muted }]}>Program name</Text>
        <View ref={nameFieldRef} collapsable={false}>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
            onFocus={() => {
              if (nameFieldRef.current) {
                scrollFieldIntoView(nameFieldRef.current);
              }
            }}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
            ]}
          />
        </View>

        <Text style={[styles.label, { color: colors.muted }]}>Description</Text>
        <View ref={descriptionFieldRef} collapsable={false}>
          <TextInput
            value={draft.description ?? ''}
            onChangeText={(description) => setDraft({ ...draft, description })}
            onFocus={() => {
              if (descriptionFieldRef.current) {
                scrollFieldIntoView(descriptionFieldRef.current);
              }
            }}
            multiline
            style={[
              styles.textArea,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
            ]}
          />
        </View>

        <Text style={[styles.meta, { color: colors.muted }]}>
          {draft.segments.length} segments · {formatDuration(totalDuration)} total
        </Text>

        {draft.segments.map((segment, index) => (
          <SegmentEditor
            key={segment.id}
            segment={segment}
            index={index}
            inclineUnit={inclineUnit}
            canRemove={draft.segments.length > 1}
            onFieldFocus={scrollFieldIntoView}
            onChange={(nextSegment) => {
              const segments = draft.segments.map((item, itemIndex) =>
                itemIndex === index ? nextSegment : item,
              );
              setDraft({ ...draft, segments });
            }}
            onRemove={() => {
              const segments = draft.segments.filter((_, itemIndex) => itemIndex !== index);
              setDraft({ ...draft, segments });
            }}
          />
        ))}

        <Pressable
          onPress={() =>
            setDraft({ ...draft, segments: [...draft.segments, createEmptySegment()] })
          }
          style={[styles.addButton, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[styles.addLabel, { color: colors.tint }]}>+ Add segment</Text>
        </Pressable>

        <Pressable
          onPress={() => fireAndForgetAlert(handleSave(), 'Save failed')}
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
        >
          <Text style={styles.saveLabel}>Save program</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
  },
  form: {
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  meta: {
    fontSize: 14,
    marginBottom: 4,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

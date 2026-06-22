import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import {
  clearFtmsLog,
  getFtmsLogEntries,
  subscribeFtmsLog,
  type FtmsLogEntry,
} from '@/core/treadmill/adapters/ftms/ftms-debug';

interface FtmsDebugPanelProps {
  visible: boolean;
  colors: (typeof Colors)['light'];
}

const LOG_VIEW_HEIGHT = 220;

export function FtmsDebugPanel(props: Readonly<FtmsDebugPanelProps>) {
  const { visible, colors } = props;
  const [expanded, setExpanded] = useState(true);
  const [entries, setEntries] = useState<FtmsLogEntry[]>(getFtmsLogEntries());
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    return subscribeFtmsLog(setEntries);
  }, [visible]);

  useEffect(() => {
    if (!expanded || entries.length === 0) {
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [entries, expanded]);

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>FTMS debug log</Text>
        <Text style={[styles.action, { color: colors.tint }]}>{expanded ? 'Hide' : 'Show'}</Text>
      </Pressable>

      {expanded ? (
        <>
          <Pressable onPress={() => clearFtmsLog()} hitSlop={8}>
            <Text style={[styles.clear, { color: colors.muted }]}>Clear log</Text>
          </Pressable>

          <View
            style={[
              styles.logContainer,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}>
            <ScrollView
              ref={scrollRef}
              style={styles.logScroll}
              contentContainerStyle={styles.logContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator>
              {entries.length === 0 ? (
                <Text style={[styles.empty, { color: colors.muted }]}>
                  Waiting for status, commands, or app events…
                </Text>
              ) : (
                entries.map((entry) => (
                  <View
                    key={entry.id}
                    style={[styles.row, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.time, { color: colors.muted }]}>
                      {entry.at} · {entry.source}
                    </Text>
                    {entry.hex ? (
                      <Text style={[styles.hex, { color: colors.tint }]} selectable>
                        {entry.hex}
                      </Text>
                    ) : null}
                    <Text style={[styles.message, { color: colors.text }]} selectable>
                      {entry.message}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  action: {
    fontSize: 13,
    fontWeight: '600',
  },
  clear: {
    fontSize: 12,
    fontWeight: '600',
  },
  logContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    height: LOG_VIEW_HEIGHT,
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    padding: 8,
    gap: 0,
  },
  empty: {
    fontSize: 12,
    lineHeight: 18,
  },
  row: {
    gap: 2,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
  },
  hex: {
    fontSize: 11,
    fontFamily: 'Menlo',
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
});

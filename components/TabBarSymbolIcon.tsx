import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

interface TabBarSymbolIconProps {
  color: ColorValue;
  name: SymbolViewProps['name'];
  size?: number;
}

export function TabBarSymbolIcon(props: Readonly<TabBarSymbolIconProps>) {
  const { color, name, size = 24 } = props;
  return <SymbolView name={name} tintColor={color} size={size} />;
}

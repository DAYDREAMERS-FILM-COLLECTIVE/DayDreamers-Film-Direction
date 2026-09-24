/**
 * src/screening/components/SeatButton.tsx
 * Touch-safe cinema seat SVG component with Apple HIG & Material Design hitSlop ergonomics.
 */

import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { THEME } from '../constants/theme';

interface SeatButtonProps {
  id: string;
  isOccupied: boolean;
  isSelected: boolean;
  onPress: (id: string) => void;
  style?: ViewStyle;
}

export const SeatButton: React.FC<SeatButtonProps> = ({
  id,
  isOccupied,
  isSelected,
  onPress,
  style
}) => {
  const fillColor = isSelected
    ? THEME.colors.seatSelected
    : isOccupied
    ? THEME.colors.seatOccupied
    : THEME.colors.seatAvailable;

  const borderColor = isSelected
    ? THEME.colors.cream
    : isOccupied
    ? THEME.colors.seatOccupiedBorder
    : THEME.colors.border;

  return (
    <Pressable
      disabled={isOccupied}
      onPress={() => onPress(id)}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`Seat ${id}${isOccupied ? ', Occupied' : isSelected ? ', Selected' : ', Available'}`}
      accessibilityState={{ selected: isSelected, disabled: isOccupied }}
      style={({ pressed }) => [
        styles.seatContainer,
        style,
        pressed && !isOccupied && styles.pressedState
      ]}
    >
      <Svg viewBox="0 0 44 44" width="100%" height="100%">
        <Path
          d="M10 3h24a5 5 0 0 1 5 5v15H5V8a5 5 0 0 1 5-5z"
          fill={fillColor}
          stroke={borderColor}
          strokeWidth="1.5"
        />
        <Path
          d="M6 26h32a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z"
          fill={fillColor}
          stroke={borderColor}
          strokeWidth="1.5"
        />
      </Svg>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  seatContainer: {
    width: 32,
    height: 32,
    marginHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pressedState: {
    opacity: 0.75,
    transform: [{ scale: 0.92 }]
  }
});

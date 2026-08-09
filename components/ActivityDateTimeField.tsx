import DateTimePicker from '@react-native-community/datetimepicker';
import {
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type PickerMode = 'date' | 'time';

type ActivityDateTimeFieldProps = {
  label?: string;
  value: Date;
  onChange: (value: Date) => void;
  scrollViewRef?: RefObject<ScrollView | null>;
};

export default function ActivityDateTimeField({
  label = 'DATE & TIME',
  value,
  onChange,
  scrollViewRef,
}: ActivityDateTimeFieldProps) {
  const [pickerMode, setPickerMode] =
    useState<PickerMode | null>(null);
  const fieldY = useRef(0);
  const scrollTimer = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, []);

  const openPicker = (mode: PickerMode) => {
    Keyboard.dismiss();
    setPickerMode(mode);

    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }

    scrollTimer.current = setTimeout(() => {
      scrollViewRef?.current?.scrollTo({
        animated: true,
        y: Math.max(0, fieldY.current - 18),
      });
    }, 180);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    fieldY.current = event.nativeEvent.layout.y;
  };

  return (
    <View
      onLayout={handleLayout}
      style={styles.container}
    >
      <Text style={styles.sectionLabel}>
        {label}
      </Text>

      <View style={styles.fieldRow}>
        <DateTimeButton
          accessibilityLabel="Change activity date"
          caption="Date"
          icon="▣"
          onPress={() => openPicker('date')}
          selected={pickerMode === 'date'}
          value={value.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        />

        <DateTimeButton
          accessibilityLabel="Change activity time"
          caption="Time"
          icon="◷"
          onPress={() => openPicker('time')}
          selected={pickerMode === 'time'}
          value={value.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        />
      </View>

      {pickerMode && (
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>
              Change {pickerMode}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerMode(null)}
              hitSlop={8}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>

          <DateTimePicker
            display="spinner"
            maximumDate={new Date()}
            mode={pickerMode}
            onChange={(_event, selectedDate) => {
              if (selectedDate) {
                const nextValue = new Date(value);

                if (pickerMode === 'date') {
                  nextValue.setFullYear(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    selectedDate.getDate(),
                  );
                } else {
                  nextValue.setHours(
                    selectedDate.getHours(),
                    selectedDate.getMinutes(),
                    0,
                    0,
                  );
                }

                onChange(nextValue);
              }
            }}
            textColor="#263B2B"
            themeVariant="light"
            value={value}
          />
        </View>
      )}
    </View>
  );
}

type DateTimeButtonProps = {
  accessibilityLabel: string;
  caption: string;
  icon: string;
  onPress: () => void;
  selected: boolean;
  value: string;
};

function DateTimeButton({
  accessibilityLabel,
  caption,
  icon,
  onPress,
  selected,
  value,
}: DateTimeButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.field,
        selected && styles.fieldSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.fieldHeading}>
        <Text style={styles.fieldIcon}>{icon}</Text>
        <Text style={styles.fieldCaption}>{caption}</Text>
      </View>

      <Text numberOfLines={1} style={styles.fieldValue}>
        {value}
      </Text>

      <Text style={styles.changeText}>
        Change ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  sectionLabel: {
    color: '#344A39',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    minHeight: 112,
    flex: 1,
    borderColor: '#DDE3DA',
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  fieldSelected: {
    borderColor: '#AFC2AC',
    backgroundColor: '#F3F7F0',
  },
  fieldHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldIcon: {
    color: '#657A68',
    fontSize: 14,
  },
  fieldCaption: {
    color: '#718075',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldValue: {
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 9,
  },
  changeText: {
    color: '#657A68',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 7,
  },
  pickerContainer: {
    overflow: 'hidden',
    borderColor: '#E0E5DC',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 10,
    paddingBottom: 6,
  },
  pickerHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#EDF0E9',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  pickerTitle: {
    color: '#657569',
    fontSize: 13,
    fontWeight: '700',
  },
  doneText: {
    color: '#48684D',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
});

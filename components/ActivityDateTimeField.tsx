import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type ActivityDateTimeFieldProps = {
  label?: string;
  value: Date;
  onChange: (value: Date) => void;
};

export default function ActivityDateTimeField({
  label = 'DATE & TIME',
  value,
  onChange,
}: ActivityDateTimeFieldProps) {
  const [showPicker, setShowPicker] =
    useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        When did this happen?
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.field,
          pressed && styles.pressed,
        ]}
      >
        <View>
          <Text style={styles.label}>{label}</Text>

          <Text style={styles.fieldValue}>
            {value.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {' · '}
            {value.toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {showPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            display="spinner"
            maximumDate={new Date()}
            mode="datetime"
            onChange={(_event, selectedDate) => {
              if (selectedDate) {
                onChange(selectedDate);
              }
            }}
            textColor="#263B2B"
            themeVariant="light"
            value={value}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPicker(false)}
            style={styles.doneButton}
          >
            <Text style={styles.doneText}>
              Done
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  label: {
    color: '#344A39',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  field: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#DDE3DA',
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 16,
  },
  fieldLabel: {
    color: '#7A867D',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fieldValue: {
    color: '#304435',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  chevron: {
    color: '#718075',
    fontSize: 24,
  },
  pickerContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#FFFEFA',
    marginTop: 10,
    paddingBottom: 8,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  doneText: {
    color: '#48684D',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
});
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BabyActivity,
  loadActivities,
} from '../lib/activities';
import { loadAccessibleBabyProfile } from '../lib/babyAccess';
import { BabyProfile } from '../lib/babyProfile';
import { downloadCloudActivities } from '../lib/cloudActivities';
import { loadCloudBabyForCircle } from '../lib/cloudBaby';
import {
  createVisitReport,
  MAX_REPORT_DAYS,
  VisitReport,
} from '../lib/visitReport';
import { shareVisitReportPdf } from '../lib/visitReportPdf';

type RangeChoice = 7 | 14 | 30 | 'custom';
type DateField = 'start' | 'end';

const rangeChoices: {
  label: string;
  value: RangeChoice;
}[] = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Custom', value: 'custom' },
];

export default function ReportScreen() {
  const router = useRouter();
  const initialRange = useMemo(
    () => createPresetRange(7),
    [],
  );

  const [profile, setProfile] =
    useState<BabyProfile | null>(null);
  const [activities, setActivities] =
    useState<BabyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [rangeChoice, setRangeChoice] =
    useState<RangeChoice>(7);
  const [startDate, setStartDate] =
    useState(initialRange.startDate);
  const [endDate, setEndDate] =
    useState(initialRange.endDate);
  const [activeDateField, setActiveDateField] =
    useState<DateField | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadReportData = async () => {
        setLoading(true);

        try {
          const profileResult =
            await loadAccessibleBabyProfile();

          if (profileResult.status !== 'ready') {
            if (profileResult.status === 'access-ended') {
              if (isActive) {
                setProfile(null);
                setActivities([]);
              }

              router.replace('/');

              Alert.alert(
                'Care Circle access ended',
                'This account no longer has access to the shared Care Circle. Shared baby data has been removed from this device.',
              );
            } else {
              router.replace(
                profileResult.status === 'signed-out'
                  ? '/'
                  : '/settings',
              );
            }

            return;
          }

          const savedProfile = profileResult.profile;

          try {
            if (profileResult.circle) {
              const cloudBaby =
                await loadCloudBabyForCircle(
                  profileResult.circle.id,
                );

              if (cloudBaby) {
                const cloudRangeEnd = new Date();
                const cloudRangeStart = new Date(
                  cloudRangeEnd.getFullYear(),
                  cloudRangeEnd.getMonth(),
                  cloudRangeEnd.getDate() - (MAX_REPORT_DAYS - 1),
                );
                await downloadCloudActivities(
                  cloudBaby.id,
                  savedProfile.id,
                  {
                    startDate: cloudRangeStart,
                    endDate: cloudRangeEnd,
                  },
                );
              }
            }
          } catch (syncError) {
            console.warn(
              'Unable to refresh shared report activities:',
              syncError,
            );
          }

          const savedActivities =
            await loadActivities();

          if (isActive) {
            setProfile(savedProfile);
            setActivities(savedActivities);
          }
        } catch (error) {
          console.error(
            'Unable to load visit report:',
            error,
          );

          Alert.alert(
            'Unable to load report',
            'Please go back and try again.',
          );
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      void loadReportData();

      return () => {
        isActive = false;
      };
    }, [router]),
  );

  const report = useMemo(
    () =>
      profile
        ? createVisitReport(
            activities,
            profile.id,
            { startDate, endDate },
          )
        : null,
    [activities, endDate, profile, startDate],
  );

  const selectRange = (choice: RangeChoice) => {
    setRangeChoice(choice);
    setActiveDateField(null);

    if (choice !== 'custom') {
      const range = createPresetRange(choice);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  const handleDateChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS !== 'ios') {
      setActiveDateField(null);
    }

    if (!selectedDate || !activeDateField) {
      return;
    }

    const proposedStart =
      activeDateField === 'start' ? selectedDate : startDate;
    const proposedEnd =
      activeDateField === 'end' ? selectedDate : endDate;
    const proposedDays = Math.floor(
      (Date.UTC(
        proposedEnd.getFullYear(),
        proposedEnd.getMonth(),
        proposedEnd.getDate(),
      ) - Date.UTC(
        proposedStart.getFullYear(),
        proposedStart.getMonth(),
        proposedStart.getDate(),
      )) / 86400000,
    ) + 1;

    if (proposedDays > MAX_REPORT_DAYS) {
      Alert.alert(
        'Choose a shorter range',
        `Visit reports can include up to ${MAX_REPORT_DAYS} days.`,
      );
      return;
    }

    if (activeDateField === 'start') {
      setStartDate(selectedDate);

      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    } else {
      setEndDate(selectedDate);

      if (selectedDate < startDate) {
        setStartDate(selectedDate);
      }
    }
  };

  const shareReport = async () => {
    if (sharing || !profile || !report) {
      return;
    }

    setSharing(true);

    try {
      await shareVisitReportPdf(
        report,
        profile.name,
      );
    } catch (error) {
      console.error(
        'Unable to share visit report:',
        error,
      );

      Alert.alert(
        'Unable to share report',
        'Sprout could not create or share the PDF. Please try again.',
      );
    } finally {
      setSharing(false);
    }
  };

  if (loading || !profile || !report) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator
          color="#48684D"
          size="large"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>

        <Text style={styles.eyebrow}>VISIT REPORT</Text>
        <Text style={styles.title}>{profile.name}</Text>
        <Text style={styles.rangeText}>
          {formatReportRange(report)}
        </Text>
        <Text style={styles.description}>
          A descriptive summary of recorded care. This report does not provide medical interpretation.
        </Text>

        <View style={styles.rangeSection}>
          <Text style={styles.controlLabel}>Date range</Text>
          <View style={styles.rangeChoices}>
            {rangeChoices.map((choice) => {
              const selected = rangeChoice === choice.value;

              return (
                <Pressable
                  accessibilityLabel={`${choice.label} report range`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={choice.label}
                  onPress={() => selectRange(choice.value)}
                  style={({ pressed }) => [
                    styles.rangeChoice,
                    selected && styles.rangeChoiceSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.rangeChoiceText,
                      selected && styles.rangeChoiceTextSelected,
                    ]}
                  >
                    {choice.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {rangeChoice === 'custom' && (
            <View style={styles.customRange}>
              <View style={styles.dateFields}>
                <DateFieldButton
                  label="Start"
                  date={startDate}
                  onPress={() => setActiveDateField('start')}
                />
                <DateFieldButton
                  label="End"
                  date={endDate}
                  onPress={() => setActiveDateField('end')}
                />
              </View>

              {activeDateField && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    display={
                      Platform.OS === 'ios'
                        ? 'spinner'
                        : 'default'
                    }
                    maximumDate={new Date()}
                    mode="date"
                    onChange={handleDateChange}
                    textColor="#263B2B"
                    themeVariant="light"
                    value={
                      activeDateField === 'start'
                        ? startDate
                        : endDate
                    }
                  />

                  {Platform.OS === 'ios' && (
                    <Pressable
                      onPress={() => setActiveDateField(null)}
                      style={styles.dateDoneButton}
                    >
                      <Text style={styles.dateDoneText}>Done</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={sharing}
          onPress={shareReport}
          style={({ pressed }) => [
            styles.shareButton,
            pressed && !sharing && styles.pressed,
            sharing && styles.shareButtonDisabled,
          ]}
        >
          {sharing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.shareButtonText}>
              Share report
            </Text>
          )}
        </Pressable>

        {report.activityCount === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No activities in this range
            </Text>
            <Text style={styles.emptyText}>
              Choose another date range or add care activities to include them here.
            </Text>
          </View>
        ) : (
          <>
            <ReportSection title="Feeding">
              <MetricRow label="Total feedings" value={String(report.feeding.totalCount)} />
              <MetricRow
                label="Recorded ounces"
                value={`${formatNumber(report.feeding.recordedOunces)} oz`}
              />
              <MetricRow
                label="Average recorded ounces per day"
                value={`${formatNumber(report.feeding.averageRecordedOuncesPerDay)} oz`}
              />
              <MetricRow
                label="Average per feeding with ounces"
                value={`${formatNumber(report.feeding.averageOuncesPerRecordedFeeding)} oz`}
              />
              <Text style={styles.contextText}>
                {report.feeding.recordedOunceCount} with an ounce amount · {report.feeding.withoutOuncesCount} without
              </Text>
              {report.feeding.methods.length > 0 && (
                <Text style={styles.breakdownText}>
                  {report.feeding.methods
                    .map(({ method, count }) => `${count} ${method.toLowerCase()}`)
                    .join(' · ')}
                </Text>
              )}
            </ReportSection>

            <ReportSection title="Diapers">
              <MetricRow label="Total diapers" value={String(report.diaper.totalCount)} />
              <MetricRow
                label="Average per day"
                value={formatNumber(report.diaper.averagePerDay)}
              />
              {report.diaper.types.length > 0 && (
                <Text style={styles.breakdownText}>
                  {report.diaper.types
                    .map(({ type, count }) => `${count} ${type.toLowerCase()}`)
                    .join(' · ')}
                </Text>
              )}
            </ReportSection>

            <ReportSection title="Completed sleep">
              <MetricRow
                label="Total duration"
                value={formatDuration(report.sleep.totalMinutes)}
              />
              <MetricRow
                label="Average per day"
                value={formatDuration(report.sleep.averageMinutesPerDay)}
              />
              <MetricRow
                label="Completed sessions"
                value={String(report.sleep.sessionCount)}
              />
              <MetricRow
                label="Average session length"
                value={formatDuration(report.sleep.averageSessionMinutes)}
              />
            </ReportSection>

            <ReportSection title="Daily breakdown">
              {report.days.map((day) => (
                <View key={day.date.toISOString()} style={styles.dailyRow}>
                  <Text style={styles.dailyDate}>
                    {formatDay(day.date)}
                  </Text>
                  <Text style={styles.dailyDetails}>
                    {formatDailyDetails(day)}
                  </Text>
                </View>
              ))}
            </ReportSection>

            <ReportSection title={`Notes (${report.notes.length})`}>
              {report.notes.length === 0 ? (
                <Text style={styles.contextText}>
                  No notes recorded in this range.
                </Text>
              ) : (
                report.notes.map((note) => (
                  <View key={note.id} style={styles.noteRow}>
                    <Text style={styles.noteDate}>
                      {formatNoteDate(note.occurredAt)}
                    </Text>
                    <Text style={styles.noteText}>{note.text}</Text>
                  </View>
                ))
              )}
            </ReportSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DateFieldButton({
  label,
  date,
  onPress,
}: {
  label: string;
  date: Date;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label} date, ${formatShortDate(date)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.dateField,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.dateFieldLabel}>{label}</Text>
      <Text style={styles.dateFieldValue}>{formatShortDate(date)}</Text>
    </Pressable>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.reportSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function createPresetRange(days: number) {
  const endDate = new Date();
  const startDate = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate() - (days - 1),
  );

  return { startDate, endDate };
}

function formatReportRange(report: VisitReport): string {
  return `${formatShortDate(report.startDate)} – ${formatShortDate(report.endDate)} · ${report.dayCount} ${report.dayCount === 1 ? 'day' : 'days'}`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatNoteDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(1)));
}

function formatDuration(value: number): string {
  const minutes = Math.round(value);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0
    ? `${hours} hr`
    : `${hours} hr ${remainingMinutes} min`;
}

function formatDailyDetails(
  day: VisitReport['days'][number],
): string {
  const details = [`${day.feedingCount} feedings`];

  if (day.recordedOunceCount > 0) {
    details.push(`${formatNumber(day.recordedOunces)} oz recorded`);
  }

  details.push(
    `${day.diaperCount} diapers`,
    `${day.sleepSessionCount} sleep ${day.sleepSessionCount === 1 ? 'session' : 'sessions'}`,
    `${day.noteCount} ${day.noteCount === 1 ? 'note' : 'notes'}`,
  );

  return details.join(' · ');
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F7F2',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#E7ECE3',
    marginBottom: 24,
  },
  backButtonText: {
    color: '#405B45',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -3,
  },
  eyebrow: {
    color: '#657A68',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.7,
  },
  title: {
    color: '#263B2B',
    fontSize: 34,
    fontWeight: '700',
    marginTop: 8,
  },
  rangeText: {
    color: '#48684D',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  description: {
    color: '#6A756D',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  rangeSection: {
    marginTop: 24,
  },
  controlLabel: {
    color: '#344A39',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  rangeChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rangeChoice: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#D8E0D5',
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 14,
  },
  rangeChoiceSelected: {
    borderColor: '#48684D',
    backgroundColor: '#E7EFE3',
  },
  rangeChoiceText: {
    color: '#6F7A72',
    fontSize: 13,
    fontWeight: '600',
  },
  rangeChoiceTextSelected: {
    color: '#36503C',
  },
  customRange: {
    marginTop: 12,
  },
  shareButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#48684D',
    marginTop: 18,
    paddingHorizontal: 20,
  },
  shareButtonDisabled: {
    opacity: 0.65,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dateFields: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
    borderColor: '#DDE3DA',
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dateFieldLabel: {
    color: '#7A847C',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateFieldValue: {
    color: '#304435',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  datePickerContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#FFFEFA',
    marginTop: 10,
    paddingBottom: 8,
  },
  dateDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  dateDoneText: {
    color: '#48684D',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    borderColor: '#E0E5DC',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 24,
    padding: 22,
  },
  emptyTitle: {
    color: '#304435',
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    color: '#758078',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  reportSection: {
    marginTop: 25,
  },
  sectionTitle: {
    color: '#344A39',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionContent: {
    borderColor: '#E0E5DC',
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  metricRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    borderBottomColor: '#EDF0EA',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  metricLabel: {
    flex: 1,
    color: '#68736B',
    fontSize: 13,
    lineHeight: 18,
  },
  metricValue: {
    color: '#304435',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  contextText: {
    color: '#7C867E',
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 10,
  },
  breakdownText: {
    color: '#536858',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    borderTopColor: '#EDF0EA',
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  dailyRow: {
    borderBottomColor: '#EDF0EA',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  dailyDate: {
    color: '#405B45',
    fontSize: 13,
    fontWeight: '700',
  },
  dailyDetails: {
    color: '#727D75',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  noteRow: {
    borderBottomColor: '#EDF0EA',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  noteDate: {
    color: '#718075',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  noteText: {
    color: '#425348',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  pressed: {
    opacity: 0.8,
  },
});

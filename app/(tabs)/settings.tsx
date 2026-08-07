import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    deleteAllSproutData,
    exportSproutData,
} from '../../lib/dataControls';

export default function SettingsScreen() {
  const router = useRouter();

  const [exporting, setExporting] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const handleExport = async () => {
    if (exporting) {
      return;
    }

    setExporting(true);

    try {
      await exportSproutData();
    } catch (error) {
      console.error(
        'Unable to export Sprout data:',
        error,
      );

      Alert.alert(
        'Unable to export data',
        'Your Sprout data could not be exported. Please try again.',
      );
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    if (deleting) {
      return;
    }

    Alert.alert(
      'Delete all Sprout data?',
      'This permanently removes the baby profile, feedings, diapers, sleep history, and notes stored by Sprout on this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: deleteEverything,
        },
      ],
    );
  };

  const deleteEverything = async () => {
    setDeleting(true);

    try {
      await deleteAllSproutData();

      router.replace('/');
    } catch (error) {
      console.error(
        'Unable to delete Sprout data:',
        error,
      );

      Alert.alert(
        'Unable to delete data',
        'Your data could not be deleted. Please try again.',
      );

      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>
          PROJECT SPROUT
        </Text>

        <Text style={styles.title}>
          Settings
        </Text>

        <Text style={styles.description}>
          Your baby’s information belongs to your
          family.
        </Text>

        <Text style={styles.sectionTitle}>
          Your data
        </Text>

        <View style={styles.card}>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>
              Export Sprout data
            </Text>

            <Text style={styles.cardText}>
              Create a JSON copy of the profile and
              activity data currently stored by Sprout.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={exporting}
            onPress={handleExport}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
            ]}
          >
            {exporting ? (
              <ActivityIndicator
                color="#48684D"
                size="small"
              />
            ) : (
              <Text style={styles.actionText}>
                Export
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>
            Stored locally
          </Text>

          <Text style={styles.privacyText}>
            Sprout currently keeps your profile and
            tracking data on this device. No Sprout
            account or cloud service is required.
          </Text>
        </View>

        <Text style={styles.dangerSectionTitle}>
          Delete data
        </Text>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>
            Delete all Sprout data
          </Text>

          <Text style={styles.dangerText}>
            Permanently remove the baby profile and
            all recorded activities from this device.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={deleting}
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
          >
            {deleting ? (
              <ActivityIndicator
                color="#9A403B"
              />
            ) : (
              <Text
                style={styles.deleteButtonText}
              >
                Delete all data
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  eyebrow: {
    color: '#657A68',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.7,
  },
  title: {
    color: '#263B2B',
    fontSize: 38,
    fontWeight: '700',
    marginTop: 10,
  },
  description: {
    color: '#6A756D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  sectionTitle: {
    color: '#344A39',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 32,
    marginBottom: 12,
  },
  card: {
    borderColor: '#E0E5DC',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    padding: 19,
  },
  cardTextContainer: {
    marginBottom: 17,
  },
  cardTitle: {
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
  },
  cardText: {
    color: '#718075',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  actionButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#C9D6C5',
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#EBF0E7',
  },
  actionText: {
    color: '#48684D',
    fontSize: 15,
    fontWeight: '700',
  },
  privacyCard: {
    borderColor: '#DDE5D9',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#EBF0E7',
    marginTop: 14,
    padding: 19,
  },
  privacyTitle: {
    color: '#304435',
    fontSize: 16,
    fontWeight: '700',
  },
  privacyText: {
    color: '#657569',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  dangerSectionTitle: {
    color: '#744C48',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 34,
    marginBottom: 12,
  },
  dangerCard: {
    borderColor: '#E2C8C5',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFF9F8',
    padding: 19,
  },
  dangerTitle: {
    color: '#7E403B',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerText: {
    color: '#806B68',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  deleteButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#D9B8B4',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
  },
  deleteButtonText: {
    color: '#9A403B',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
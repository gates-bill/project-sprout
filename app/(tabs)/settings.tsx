import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { getCurrentSession } from '../../lib/auth';
import { loadBabyProfile } from '../../lib/babyProfile';
import {
  createCareCircle,
  loadMyCareCircle,
} from '../../lib/careCircle';
import {
  downloadCloudActivities,
  syncLocalActivitiesToCloud
} from '../../lib/cloudActivities';
import {
  createCloudBaby,
  loadCloudBabyForCircle,
} from '../../lib/cloudBaby';
import {
  deleteAllSproutData,
  exportSproutData,
} from '../../lib/dataControls';

export default function SettingsScreen() {
  const router = useRouter();

  const [careCircleId, setCareCircleId] =
    useState<string | null>(null);

  const [creatingBaby, setCreatingBaby] =
    useState(false);

  const [cloudBabyId, setCloudBabyId] =
    useState<string | null>(null);

  const [exporting, setExporting] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [syncingActivities, setSyncingActivities] =
    useState(false);

  const [
    downloadingActivities,
    setDownloadingActivities,
    ] = useState(false);

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

  const [signedInEmail, setSignedInEmail] =
    useState<string | null>(null);

  const [creatingCircle, setCreatingCircle] =
    useState(false);

useEffect(() => {
  const loadSharedSetup = async () => {
    try {
      const { data } =
        await getCurrentSession();

      const email =
        data.session?.user.email ?? null;

      setSignedInEmail(email);

      if (!email) {
        return;
      }

      const circle =
        await loadMyCareCircle();

      if (!circle) {
        return;
      }

      setCareCircleId(circle.id);

      const cloudBaby =
        await loadCloudBabyForCircle(
          circle.id,
        );

      setCloudBabyId(
        cloudBaby?.id ?? null,
      );
    } catch (error) {
      console.error(
        'Unable to load shared setup:',
        error,
      );
    }
  };

  loadSharedSetup();
}, []);

    const handleCreateCareCircle = async () => {
    if (creatingCircle) {
        return;
    }

    setCreatingCircle(true);

    try {
        const careCircleId =
        await createCareCircle('Our Family');

        setCareCircleId(careCircleId);

        Alert.alert(
        'Care circle created',
        `Your shared care circle is ready.\n\nID: ${careCircleId}`,
        );
    } catch (error) {
        console.error(
        'Unable to create care circle:',
        error,
        );

        Alert.alert(
        'Unable to create care circle',
        error instanceof Error
            ? error.message
            : 'Please try again.',
        );
    } finally {
        setCreatingCircle(false);
    }
    };

const handleCreateCloudBaby = async () => {
  if (!careCircleId || creatingBaby) {
    return;
  }

  setCreatingBaby(true);

  try {
    const profile = await loadBabyProfile();

    if (!profile) {
      Alert.alert(
        'Baby profile not found',
        'Create a baby profile first.',
      );
      return;
    }

    const babyId = await createCloudBaby(
      careCircleId,
      profile,
    );

    Alert.alert(
      'Baby connected',
      `The baby profile is now stored in the shared care circle.\n\nID: ${babyId}`,
    );
  } catch (error) {
    console.error(
      'Unable to create cloud baby:',
      error,
    );

    Alert.alert(
      'Unable to connect baby',
      error instanceof Error
        ? error.message
        : 'Please try again.',
    );
  } finally {
    setCreatingBaby(false);
  }
};

const handleSyncActivities = async () => {
  if (!cloudBabyId || syncingActivities) {
    return;
  }

  setSyncingActivities(true);

  try {
    const count =
      await syncLocalActivitiesToCloud(
        cloudBabyId,
      );

    Alert.alert(
      'Activities synced',
      count === 0
        ? 'There were no activities to sync.'
        : `${count} ${
            count === 1
              ? 'activity'
              : 'activities'
          } synced to your care circle.`,
    );
  } catch (error) {
    console.error(
      'Unable to sync activities:',
      error,
    );

    Alert.alert(
      'Unable to sync activities',
      error instanceof Error
        ? error.message
        : 'Please try again.',
    );
  } finally {
    setSyncingActivities(false);
  }
};

const handleDownloadActivities = async () => {
  if (!cloudBabyId || downloadingActivities) {
    return;
  }

  setDownloadingActivities(true);

  try {
    const profile = await loadBabyProfile();

    if (!profile) {
      Alert.alert(
        'Baby profile not found',
        'A local baby profile is required before shared activity data can be downloaded.',
      );
      return;
    }

    const count =
      await downloadCloudActivities(
        cloudBabyId,
        profile.id,
      );

    Alert.alert(
      'Shared activities downloaded',
      count === 0
        ? 'There were no shared activities to download.'
        : `${count} ${
            count === 1
              ? 'activity'
              : 'activities'
          } downloaded from your care circle.`,
    );
  } catch (error) {
    console.error(
      'Unable to download activities:',
      error,
    );

    Alert.alert(
      'Unable to download activities',
      error instanceof Error
        ? error.message
        : 'Please try again.',
    );
  } finally {
    setDownloadingActivities(false);
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
        Care circle
        </Text>

        <View style={styles.card}>
        <Text style={styles.cardTitle}>
            Shared caregiving
        </Text>

        <Text style={styles.cardText}>
            {signedInEmail
            ? `Signed in as ${signedInEmail}`
            : 'Sign in to share baby care data with another caregiver.'}
        </Text>

{signedInEmail ? (
  <>
    {careCircleId ? (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>
          Care circle connected
        </Text>

        <Text style={styles.statusText}>
          Your account is connected to a shared care circle.
        </Text>
      </View>
    ) : (
      <Pressable
        accessibilityRole="button"
        disabled={creatingCircle}
        onPress={handleCreateCareCircle}
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.pressed,
        ]}
      >
        {creatingCircle ? (
          <ActivityIndicator
            color="#48684D"
            size="small"
          />
        ) : (
          <Text style={styles.actionText}>
            Create care circle
          </Text>
        )}
      </Pressable>
    )}

    {careCircleId &&
      !cloudBabyId && (
        <Pressable
          accessibilityRole="button"
          disabled={creatingBaby}
          onPress={handleCreateCloudBaby}
          style={({ pressed }) => [
            styles.actionButton,
            styles.secondActionButton,
            pressed && styles.pressed,
          ]}
        >
          {creatingBaby ? (
            <ActivityIndicator
              color="#48684D"
              size="small"
            />
          ) : (
            <Text style={styles.actionText}>
              Connect baby profile
            </Text>
          )}
        </Pressable>
      )}

    {cloudBabyId && (
      <View style={styles.babyStatus}>
        <Text style={styles.statusTitle}>
          Baby profile connected
        </Text>

        <Text style={styles.statusText}>
          This baby is ready for shared activity syncing.
        </Text>
        <Pressable
            accessibilityRole="button"
            disabled={syncingActivities}
            onPress={handleSyncActivities}
            style={({ pressed }) => [
            styles.actionButton,
            styles.secondActionButton,
            pressed && styles.pressed,
            ]}
        >
            {syncingActivities ? (
            <ActivityIndicator
                color="#48684D"
                size="small"
            />
            ) : (
            <Text style={styles.actionText}>
                Sync activity data
            </Text>
            )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={downloadingActivities}
          onPress={handleDownloadActivities}
          style={({ pressed }) => [
            styles.actionButton,
            styles.secondActionButton,
            pressed && styles.pressed,
          ]}
        >
          {downloadingActivities ? (
            <ActivityIndicator
              color="#48684D"
              size="small"
            />
          ) : (
            <Text style={styles.actionText}>
              Download shared activity data
            </Text>
          )}
        </Pressable>
      </View>
    )}
  </>
) : (
  <Pressable
    accessibilityRole="button"
    onPress={() => router.push('/auth')}
    style={({ pressed }) => [
      styles.actionButton,
      pressed && styles.pressed,
    ]}
  >
    <Text style={styles.actionText}>
      Sign in
    </Text>
  </Pressable>
)}
        </View>

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
                Private by default
            </Text>

            <Text style={styles.privacyText}>
                Your family’s data is shared only with caregivers you choose to invite.
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
  secondActionButton: {
    marginTop: 10,
  },
  statusCard: {
  borderColor: '#C9D6C5',
  borderRadius: 14,
  borderWidth: 1,
  backgroundColor: '#EBF0E7',
  padding: 15,
},
babyStatus: {
  borderColor: '#C9D6C5',
  borderRadius: 14,
  borderWidth: 1,
  backgroundColor: '#F2F5EF',
  marginTop: 10,
  padding: 15,
},
statusTitle: {
  color: '#304435',
  fontSize: 15,
  fontWeight: '700',
},
statusText: {
  color: '#657569',
  fontSize: 13,
  lineHeight: 19,
  marginTop: 5,
},
});
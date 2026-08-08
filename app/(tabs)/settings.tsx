import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getCurrentSession,
  signOut
} from '../../lib/auth';
import { loadBabyProfile } from '../../lib/babyProfile';
import {
  createCareCircle,
  loadMyCareCircle,
} from '../../lib/careCircle';
import {
  acceptCareCircleInvite,
  createCareCircleInvite,
} from '../../lib/careCircleInvites';
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

  const [creatingInvite, setCreatingInvite] =
    useState(false);

  const [joiningCircle, setJoiningCircle] =
    useState(false);

  const [inviteCode, setInviteCode] =
    useState('');

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

    setCloudBabyId(babyId);

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

const handleCreateInvite = async () => {
  if (!careCircleId || creatingInvite) {
    return;
  }

  setCreatingInvite(true);

  try {
    const code =
      await createCareCircleInvite(
        careCircleId,
      );

    Alert.alert(
      'Invite created',
      `Share this code with the caregiver you want to invite:\n\n${code}`,
    );
  } catch (error) {
    console.error(
      'Unable to create invite:',
      error,
    );

    Alert.alert(
      'Unable to create invite',
      error instanceof Error
        ? error.message
        : 'Please try again.',
    );
  } finally {
    setCreatingInvite(false);
  }
};

const handleJoinCircle = async () => {
  if (
    !inviteCode.trim() ||
    joiningCircle
  ) {
    return;
  }

  setJoiningCircle(true);

  try {
    const joinedCircleId =
      await acceptCareCircleInvite(
        inviteCode,
      );

    setCareCircleId(joinedCircleId);

    const cloudBaby =
      await loadCloudBabyForCircle(
        joinedCircleId,
      );

    setCloudBabyId(
      cloudBaby?.id ?? null,
    );

    setInviteCode('');

    Alert.alert(
      'Care circle joined',
      'You are now connected to the shared baby care circle.',
    );
  } catch (error) {
    console.error(
      'Unable to join care circle:',
      error,
    );

    Alert.alert(
      'Unable to join care circle',
      error instanceof Error
        ? error.message
        : 'Check the invite code and try again.',
    );
  } finally {
    setJoiningCircle(false);
  }
};

const handleSignOut = async () => {
  try {
    const { error } = await signOut();

    if (error) {
      Alert.alert(
        'Unable to sign out',
        error.message,
      );
      return;
    }

    setSignedInEmail(null);
    setCareCircleId(null);
    setCloudBabyId(null);

    Alert.alert(
      'Signed out',
      'You are now signed out of Sprout.',
    );
  } catch (error) {
    console.error(
      'Unable to sign out:',
      error,
    );

    Alert.alert(
      'Unable to sign out',
      'Please try again.',
    );
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
      Shared activity data syncs automatically with your Care Circle.
    </Text>
  </View>
)}
    {careCircleId && (
  <Pressable
    accessibilityRole="button"
    disabled={creatingInvite}
    onPress={handleCreateInvite}
    style={({ pressed }) => [
      styles.actionButton,
      styles.secondActionButton,
      pressed && styles.pressed,
    ]}
  >
    {creatingInvite ? (
      <ActivityIndicator
        color="#48684D"
        size="small"
      />
    ) : (
      <Text style={styles.actionText}>
        Invite caregiver
      </Text>
    )}
  </Pressable>
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

{signedInEmail && (
  <Pressable
    accessibilityRole="button"
    onPress={handleSignOut}
    style={({ pressed }) => [
      styles.signOutButton,
      pressed && styles.pressed,
    ]}
  >
    <Text style={styles.signOutButtonText}>
      Sign out
    </Text>
  </Pressable>
)}

        </View>

{signedInEmail && !careCircleId && (
  <>
<Text style={styles.sectionTitle}>
  Join a care circle
</Text>

<View style={styles.card}>
  <Text style={styles.cardTitle}>
    Have an invite code?
  </Text>

  <Text style={styles.cardText}>
    Enter the code another caregiver shared with you.
  </Text>

  <TextInput
    autoCapitalize="none"
    autoCorrect={false}
    onChangeText={setInviteCode}
    placeholder="Invite code"
    placeholderTextColor="#9AA29B"
    style={styles.inviteInput}
    value={inviteCode}
  />

  <Pressable
    accessibilityRole="button"
    disabled={
      joiningCircle ||
      !inviteCode.trim()
    }
    onPress={handleJoinCircle}
    style={({ pressed }) => [
      styles.actionButton,
      styles.secondActionButton,
      pressed && styles.pressed,
    ]}
  >
    {joiningCircle ? (
      <ActivityIndicator
        color="#48684D"
        size="small"
      />
    ) : (
      <Text style={styles.actionText}>
        Join care circle
      </Text>
    )}
  </Pressable>
</View>
</>
)}
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
  inviteInput: {
    minHeight: 52,
    color: '#263B2B',
    fontSize: 15,
    borderColor: '#DDE3DA',
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#FFFEFA',
    marginTop: 16,
    paddingHorizontal: 15,
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
signOutButton: {
  minHeight: 48,
  alignItems: 'center',
  justifyContent: 'center',
  borderColor: '#D8DCD5',
  borderRadius: 14,
  borderWidth: 1,
  marginTop: 12,
},
signOutButtonText: {
  color: '#667068',
  fontSize: 15,
  fontWeight: '700',
},
});
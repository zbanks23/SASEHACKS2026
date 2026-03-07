import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.option}>
            <Ionicons name="person-outline" size={24} color="#FFF" />
            <Text style={styles.optionText}>Profile Details</Text>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <TouchableOpacity style={styles.option}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <Text style={styles.optionText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.option}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#FFF" />
            <Text style={styles.optionText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionText: {
    color: '#FFF',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getScriptHistory, deleteScriptFromHistory, updateScriptTitle, SavedScript } from '@/utils/storage';
import { Swipeable } from 'react-native-gesture-handler';

export default function SavedScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<SavedScript[]>([]);

  // Refresh history every time the user navigates to the Saved tab
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    const scripts = await getScriptHistory();
    setHistory(scripts);
  };

  const handleDelete = async (id: string, title: string) => {
    Alert.alert(
      "Delete Script",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const success = await deleteScriptFromHistory(id);
            if (success) {
              setHistory(prev => prev.filter(item => item.id !== id));
            }
          }
        }
      ]
    );
  };

  const handleEditName = (id: string, currentTitle: string) => {
    Alert.prompt(
      "Edit Reel Name",
      "Enter a new name for this saved reel:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Save", 
          onPress: async (newTitle?: string) => {
            if (newTitle && newTitle.trim() !== "") {
              const success = await updateScriptTitle(id, newTitle.trim());
              if (success) {
                // Update local state to reflect UI change immediately
                setHistory(prev => prev.map(item => 
                  item.id === id ? { ...item, title: newTitle.trim() } : item
                ));
              }
            }
          }
        }
      ],
      "plain-text",
      currentTitle
    );
  };

  const handlePlayScript = (item: any) => {
    router.replace({
      pathname: '/(tabs)',
      params: { 
        generatedScript: item.script,
        scriptId: item.id
      }
    });
  };

  const renderRightActions = (item: SavedScript) => {
    return (
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity 
          style={styles.editAction} 
          onPress={() => handleEditName(item.id, item.title)}
        >
          <Ionicons name="pencil-outline" size={28} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.deleteAction} 
          onPress={() => handleDelete(item.id, item.title)}
        >
          <Ionicons name="trash-outline" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Reels</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
           <Ionicons name="bookmark-outline" size={64} color="#333" />
           <Text style={styles.emptyText}>No saved reels yet.</Text>
           <Text style={styles.emptySubtext}>Generated scripts will automatically appear here!</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item)}>
              <TouchableOpacity 
                style={styles.card} 
                onPress={() => handlePlayScript(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="play-circle" size={32} color="#007AFF" />
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardSnippet} numberOfLines={2}>
                  {item.script.substring(0, 100).replace(/\n/g, ' ')}...
                </Text>
              </TouchableOpacity>
            </Swipeable>
          )}
        />
      )}
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
  listContent: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cardDate: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  cardSnippet: {
    color: '#AAA',
    fontSize: 14,
    lineHeight: 20,
  },
  editAction: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12,
    marginRight: 8,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12,
  }
});

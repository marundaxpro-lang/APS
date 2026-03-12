
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/utils/api';

type Tab = 'feed' | 'friends' | 'leaderboard';

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [friendEmail, setFriendEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'feed') {
        const feedData = await authenticatedGet('/api/social/feed');
        if (feedData && Array.isArray(feedData)) {
          setPosts(feedData);
          console.log('[Community] Loaded feed from backend');
        }
      } else if (activeTab === 'friends') {
        const friendsData = await authenticatedGet('/api/friends');
        if (friendsData && Array.isArray(friendsData)) {
          setFriends(friendsData);
          console.log('[Community] Loaded friends from backend');
        }
      } else if (activeTab === 'leaderboard') {
        // Leaderboard endpoint not in API spec, using mock data
        setLeaderboard([
          { id: '1', name: 'Mike Johnson', workouts: 78, streak: 45 },
          { id: '2', name: 'Sarah Williams', workouts: 65, streak: 38 },
          { id: '3', name: 'You', workouts: 52, streak: 30 },
        ]);
      }
    } catch (error) {
      console.error('[Community] Error loading data:', error);
      // Use fallback data on error
      if (activeTab === 'feed') {
        setPosts([
          {
            id: '1',
            user_name: 'John Doe',
            content: 'Just completed my 50th workout! 💪',
            post_type: 'achievement',
            likes_count: 24,
            created_at: '2h ago',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addFriend = async () => {
    if (friendEmail.trim()) {
      try {
        const requestData = {
          friend_email: friendEmail,
        };
        
        await authenticatedPost('/api/friends/request', requestData);
        console.log('[Community] Friend request sent successfully');
        
        Alert.alert('Success', 'Friend request sent!');
        setFriendEmail('');
        
        // Reload friends list
        if (activeTab === 'friends') {
          loadData();
        }
      } catch (error) {
        console.error('[Community] Error sending friend request:', error);
        Alert.alert('Error', 'Failed to send friend request. Please try again.');
      }
    }
  };

  const acceptFriend = async (friendId: string) => {
    try {
      await authenticatedPut(`/api/friends/${friendId}/accept`, {});
      console.log('[Community] Friend request accepted');
      
      Alert.alert('Success', 'Friend request accepted!');
      loadData();
    } catch (error) {
      console.error('[Community] Error accepting friend:', error);
      Alert.alert('Error', 'Failed to accept friend request.');
    }
  };

  const likePost = async (postId: string) => {
    try {
      await authenticatedPost(`/api/social/posts/${postId}/like`, {});
      console.log('[Community] Post liked');
      loadData();
    } catch (error) {
      console.error('[Community] Error liking post:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
            onPress={() => setActiveTab('feed')}
          >
            <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>
              Feed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
              Leaderboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTab === 'feed' ? (
          <View>
            {posts.length === 0 ? (
              <Text style={styles.emptyText}>No posts yet. Start following friends!</Text>
            ) : (
              posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.avatar}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={24}
                        color={colors.text}
                      />
                    </View>
                    <View style={styles.postUserInfo}>
                      <Text style={styles.postUserName}>{post.user_name}</Text>
                      <Text style={styles.postTime}>{post.created_at}</Text>
                    </View>
                  </View>
                  <Text style={styles.postContent}>{post.content}</Text>
                  <View style={styles.postActions}>
                    <TouchableOpacity style={styles.postAction} onPress={() => likePost(post.id)}>
                      <IconSymbol
                        ios_icon_name="heart.fill"
                        android_material_icon_name="favorite"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.postActionText}>{post.likes_count || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.postAction}>
                      <IconSymbol
                        ios_icon_name="bubble.left.fill"
                        android_material_icon_name="chat"
                        size={20}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.postActionText}>Comment</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : activeTab === 'friends' ? (
          <View>
            <View style={styles.addFriendCard}>
              <Text style={styles.addFriendTitle}>Add Friend</Text>
              <View style={styles.addFriendRow}>
                <TextInput
                  style={styles.friendInput}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textSecondary}
                  value={friendEmail}
                  onChangeText={setFriendEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.addButton} onPress={addFriend}>
                  <IconSymbol
                    ios_icon_name="plus.circle.fill"
                    android_material_icon_name="add-circle"
                    size={28}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {friends.length === 0 ? (
              <Text style={styles.emptyText}>No friends yet. Add some friends!</Text>
            ) : (
              friends.map((friend) => (
                <View key={friend.id} style={styles.friendCard}>
                  <View style={styles.avatar}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={24}
                      color={colors.text}
                    />
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                    <Text style={styles.friendStats}>{friend.workouts || 0} workouts</Text>
                  </View>
                  {friend.status === 'pending' && (
                    <TouchableOpacity 
                      style={styles.acceptButton}
                      onPress={() => acceptFriend(friend.id)}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            {leaderboard.map((user, index) => (
              <View key={user.id} style={styles.leaderboardCard}>
                <View style={styles.leaderboardRank}>
                  <Text style={styles.leaderboardRankText}>{index + 1}</Text>
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{user.name}</Text>
                  <Text style={styles.leaderboardStats}>
                    {user.workouts} workouts • {user.streak} day streak
                  </Text>
                </View>
                {index === 0 && (
                  <IconSymbol
                    ios_icon_name="trophy.fill"
                    android_material_icon_name="emoji-events"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  postCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  postTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  postContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addFriendCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  addFriendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  addFriendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  friendInput: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  addButton: {
    justifyContent: 'center',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  friendStats: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  leaderboardRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardRankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  leaderboardStats: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 40,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});


import { colors } from '@/styles/commonStyles';
import { FocusTask } from '@/types/fitness';
import React, { useState, useEffect, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Modal,
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050608',
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#459b9b',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  tasksSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  taskItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#459b9b',
    borderColor: '#459b9b',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  taskMeta: {
    fontSize: 13,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1d21',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    backgroundColor: '#459b9b',
  },
  timerModal: {
    flex: 1,
    backgroundColor: '#050608',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  timerButton: {
    backgroundColor: '#459b9b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
});

export default function FocusScreen() {
  const [tasks, setTasks] = useState<FocusTask[]>([
    {
      id: '1',
      title: 'Complete Math Assignment',
      category: 'study',
      dueDate: 'Dec 16',
      completed: false,
    },
    {
      id: '2',
      title: 'Review Project Proposal',
      category: 'work',
      dueDate: 'Dec 17',
      completed: false,
    },
  ]);
  const [totalHours, setTotalHours] = useState(45.5);
  const [dayStreak, setDayStreak] = useState(12);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  const saveFocusSession = useCallback(async (duration: number) => {
    try {
      // TODO: Backend Integration - Save focus session to backend
      await authenticatedPost('/api/focus/sessions', {
        duration,
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save focus session:', error);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            const sessionMinutes = 25;
            saveFocusSession(sessionMinutes);
            setTotalHours((prev) => prev + sessionMinutes / 60);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, saveFocusSession]);

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: FocusTask = {
        id: Date.now().toString(),
        title: newTaskTitle,
        category: newTaskCategory || 'general',
        dueDate: newTaskDate || 'Today',
        completed: false,
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      setNewTaskCategory('');
      setNewTaskDate('');
      setShowAddModal(false);
    }
  };

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const startTimer = () => {
    setTimeLeft(25 * 60);
    setIsTimerRunning(true);
    setShowTimerModal(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setShowTimerModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Focus Hub</Text>
          <Text style={styles.subtitle}>Master your goals</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color="#fff" />
            <Text style={styles.buttonText}>Add Task</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.startButton} onPress={startTimer}>
            <IconSymbol ios_icon_name="timer" android_material_icon_name="timer" size={24} color="#fff" />
            <Text style={styles.buttonText}>Start Timer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={24} color="#459b9b" />
            <Text style={styles.statValue}>{totalHours}h</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="bolt.fill" android_material_icon_name="flash-on" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{dayStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskItem}
              onPress={() => toggleTask(task.id)}
            >
              <View style={styles.taskRow}>
                <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
                  {task.completed && <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color="#fff" />}
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskMeta}>
                    {task.category} • {task.dueDate}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Task</Text>
            <TextInput
              style={styles.input}
              placeholder="Task title"
              placeholderTextColor="#666"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (e.g., study, work)"
              placeholderTextColor="#666"
              value={newTaskCategory}
              onChangeText={setNewTaskCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Due date (e.g., Dec 16)"
              placeholderTextColor="#666"
              value={newTaskDate}
              onChangeText={setNewTaskDate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addTask}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showTimerModal} animationType="slide">
        <View style={styles.timerModal}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          <View style={styles.timerButtons}>
            <TouchableOpacity style={styles.timerButton} onPress={stopTimer}>
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timerButton}
              onPress={() => setIsTimerRunning(!isTimerRunning)}
            >
              <Text style={styles.buttonText}>{isTimerRunning ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

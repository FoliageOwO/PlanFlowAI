import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './platformService';
import http from './api';

const REMINDER_CHANNEL_ID = 'planflow-task-reminders';
const foregroundTimers = new Map<number, ReturnType<typeof setTimeout>>();

async function ensureReminderChannel() {
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: '任务提醒',
    description: 'PlanFlowAI 任务到期和提醒通知',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#1677ff',
  });
}

function parseReminderTime(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(normalized);
}

async function postImmediateReminder(reminder: {
  id: number;
  title: string;
  content: string;
  taskId?: number | string | null;
}) {
  await ensureReminderChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: reminder.id,
        title: reminder.title,
        body: reminder.content,
        largeBody: reminder.content,
        channelId: REMINDER_CHANNEL_ID,
        sound: 'default',
        extra: { taskId: reminder.taskId ? String(reminder.taskId) : undefined },
      },
    ],
  });
}

function armForegroundTimer(reminder: {
  id: number;
  title: string;
  content: string;
  remindAt: string;
  taskId?: number | string | null;
}) {
  if (foregroundTimers.has(reminder.id)) {
    clearTimeout(foregroundTimers.get(reminder.id));
  }

  const remindAt = parseReminderTime(reminder.remindAt);
  const delay = remindAt.getTime() - Date.now();
  if (!Number.isFinite(delay) || delay < 0) return;

  const timer = setTimeout(() => {
    foregroundTimers.delete(reminder.id);
    postImmediateReminder(reminder).catch((error) => {
      console.error('[local-notification] foreground post failed', error);
    });
  }, delay);
  foregroundTimers.set(reminder.id, timer);
}

export async function requestPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') {
    console.warn('[local-notification] permission not granted', perm);
    return false;
  }
  await ensureReminderChannel();
  return true;
}

export async function scheduleReminder(reminder: {
  id: number;
  title: string;
  content: string;
  remindAt: string;
  taskId?: number | string | null;
}): Promise<number> {
  const remindAt = parseReminderTime(reminder.remindAt);
  if (!Number.isFinite(remindAt.getTime())) {
    throw new Error(`Invalid reminder time: ${reminder.remindAt}`);
  }

  if (remindAt.getTime() <= Date.now() + 1000) {
    await postImmediateReminder(reminder);
    return reminder.id;
  }

  await ensureReminderChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: reminder.id,
        title: reminder.title,
        body: reminder.content,
        largeBody: reminder.content,
        schedule: { at: remindAt },
        channelId: REMINDER_CHANNEL_ID,
        sound: 'default',
        extra: { taskId: reminder.taskId ? String(reminder.taskId) : undefined },
      },
    ],
  });
  armForegroundTimer(reminder);
  return reminder.id;
}

export async function cancelReminder(notificationId: number) {
  await LocalNotifications.cancel({
    notifications: [{ id: notificationId }],
  });
}

export async function syncReminders() {
  if (!isNative()) return;
  try {
    const res: any = await http.get('/reminders/pending-local');
    const reminders: Array<{ id: number; title: string; content: string; remindAt: string; taskId?: number | string | null }> = res.data || res;
    const items: Array<{ reminderId: number; localNotificationId: string; syncStatus: string }> = [];
    for (const reminder of reminders) {
      const localNotificationId = await scheduleReminder(reminder);
      items.push({
        reminderId: reminder.id,
        localNotificationId: String(localNotificationId),
        syncStatus: 'SYNCED',
      });
    }
    await http.post('/reminders/local-sync', {
      deviceId: getDeviceId(),
      items,
    });
  } catch (error) {
    console.error('[local-notification] sync failed', error);
  }
}

export async function notifyLocalReminderNow(reminder: {
  reminderRuleId?: number | string | null;
  id?: number | string | null;
  title: string;
  content?: string;
  taskId?: number | string | null;
}) {
  if (!isNative()) return;
  const reminderId = Number(reminder.reminderRuleId || reminder.id);
  if (!Number.isFinite(reminderId)) {
    throw new Error(`Invalid local reminder id: ${reminder.reminderRuleId || reminder.id}`);
  }
  const localNotificationId = await scheduleReminder({
    id: reminderId,
    title: reminder.title || '任务提醒',
    content: reminder.content || '',
    remindAt: new Date().toISOString(),
    taskId: reminder.taskId,
  });
  await http.post('/reminders/local-sync', {
    deviceId: getDeviceId(),
    items: [{
      reminderId,
      localNotificationId: String(localNotificationId),
      syncStatus: 'SYNCED',
    }],
  });
}

function getDeviceId(): string {
  const key = 'planflow-device-id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

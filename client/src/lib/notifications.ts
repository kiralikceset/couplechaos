/**
 * Foreground notification helpers
 * Uses the Web Notifications API where the Android WebView supports it
 * Sends fun, playful notifications when partner is waiting
 * Works on both web and Capacitor (Android)
 */

import { t } from "./i18n";

const NOTIF_PERMISSION_KEY = "couple_chaos_notif";

// Fun notification messages - partner waiting
const PARTNER_WAITING_MESSAGES = [
  { title: "💕 Couple Chaos", bodyKey: "notif.partnerWaiting" },
  { title: "🔥 Couple Chaos", bodyKey: "notif.comeBack" },
  { title: "😢 Couple Chaos", bodyKey: "notif.missYou" },
];

// Extra fun messages for variety
const FUN_NOTIFICATIONS = [
  { title: "🎨 Couple Chaos", body: "Your partner's drawing skills need your help!" },
  { title: "⚡ Couple Chaos", body: "Quick! Your partner is about to start without you!" },
  { title: "🤖 Couple Chaos", body: "The score bot is getting bored. Come play!" },
  { title: "💀 Couple Chaos", body: "Your partner thinks they can win alone..." },
  { title: "🎮 Couple Chaos", body: "New round, new chaos. Jump in!" },
];

function storePermission(value: NotificationPermission): void {
  try {
    localStorage.setItem(NOTIF_PERMISSION_KEY, value);
  } catch {
    // Permission itself is managed by the operating system.
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  
  if (Notification.permission === "granted") {
    storePermission("granted");
    return true;
  }
  
  if (Notification.permission === "denied") return false;
  
  try {
    const result = await Notification.requestPermission();
    storePermission(result);
    return result === "granted";
  } catch {
    return false;
  }
}

export function hasNotificationPermission(): boolean {
  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
}

// Send immediate notification (when partner is waiting)
export function sendPartnerWaitingNotification(): void {
  if (!hasNotificationPermission()) {
    navigator.vibrate?.([120, 80, 120]);
    return;
  }
  
  const msg = PARTNER_WAITING_MESSAGES[Math.floor(Math.random() * PARTNER_WAITING_MESSAGES.length)];
  const body = t(msg.bodyKey);
  
  try {
    const notification = new Notification(msg.title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "partner-waiting",
    } as NotificationOptions);
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);
  } catch {
    // Fallback: do nothing on error
  }
}

// Send fun notification with random message
export function sendFunNotification(): void {
  if (!hasNotificationPermission()) return;
  
  const msg = FUN_NOTIFICATIONS[Math.floor(Math.random() * FUN_NOTIFICATIONS.length)];
  
  try {
    const notification = new Notification(msg.title, {
      body: msg.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "fun-reminder",
    } as NotificationOptions);
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    setTimeout(() => notification.close(), 6000);
  } catch {}
}

// Schedule a notification for when user leaves the app
let visibilityTimeout: ReturnType<typeof setTimeout> | null = null;
let visibilityNotificationsInitialized = false;

function clearVisibilityTimeout(): void {
  if (visibilityTimeout) {
    clearTimeout(visibilityTimeout);
    visibilityTimeout = null;
  }
}

export function setupVisibilityNotifications(): void {
  if (visibilityNotificationsInitialized) return;
  visibilityNotificationsInitialized = true;
  document.addEventListener("visibilitychange", () => {
    clearVisibilityTimeout();
    if (document.hidden) {
      // User left the app - schedule notification after 30 seconds
      visibilityTimeout = setTimeout(() => {
        sendFunNotification();
      }, 30000);
    } else {
      // User came back - cancel scheduled notification
      clearVisibilityTimeout();
    }
  });
}

// Setup notification for partner waiting in room
let partnerWaitingInterval: ReturnType<typeof setInterval> | null = null;
let partnerWaitingTimeout: ReturnType<typeof setTimeout> | null = null;

export function startPartnerWaitingNotifications(): void {
  stopPartnerWaitingNotifications();
  
  // Send first notification after 15 seconds if user leaves
  const handleVisibility = () => {
    if (partnerWaitingInterval) {
      clearInterval(partnerWaitingInterval);
      partnerWaitingInterval = null;
    }
    if (partnerWaitingTimeout) {
      clearTimeout(partnerWaitingTimeout);
      partnerWaitingTimeout = null;
    }
    if (document.hidden) {
      partnerWaitingInterval = setInterval(() => {
        sendPartnerWaitingNotification();
      }, 20000); // Every 20 seconds while away
      
      // First one after 10 seconds
      partnerWaitingTimeout = setTimeout(() => {
        if (document.hidden) sendPartnerWaitingNotification();
      }, 10000);
    }
  };
  
  document.addEventListener("visibilitychange", handleVisibility);
  
  // Store cleanup function
  (window as any).__cleanupPartnerNotif = () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    if (partnerWaitingInterval) {
      clearInterval(partnerWaitingInterval);
      partnerWaitingInterval = null;
    }
    if (partnerWaitingTimeout) {
      clearTimeout(partnerWaitingTimeout);
      partnerWaitingTimeout = null;
    }
  };
}

export function stopPartnerWaitingNotifications(): void {
  if ((window as any).__cleanupPartnerNotif) {
    (window as any).__cleanupPartnerNotif();
    delete (window as any).__cleanupPartnerNotif;
  }
}

// Initialize notification system
export function initNotifications(): void {
  setupVisibilityNotifications();
}

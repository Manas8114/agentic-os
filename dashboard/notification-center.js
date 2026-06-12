// Notification Center - Toast history, priority, channels
// Singleton pattern with proper guard
if (window.NotificationCenter && window.NotificationCenter._initialized) {
  // Already loaded
} else {
  const NotificationCenter = (function() {
    let notifications = [];
    let listeners = [];
    let unreadCount = 0;
    const STORAGE_KEY = 'agentic_os_notifications';
    const MAX_NOTIFICATIONS = 500;

    function load() {
      try {
        const stored = localStorage.getItem('agentic_os_notifications');
        if (stored) {
          notifications = JSON.parse(stored);
          updateUnreadCount();
        }
      } catch (e) {
        console.warn('Failed to load notifications:', e);
        notifications = [];
      }
    }

    function save() {
      try {
        localStorage.setItem('agentic_os_notifications', JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
      } catch (e) {
        console.warn('Failed to save notifications:', e);
      }
    }

    function updateUnreadCount() {
      unreadCount = notifications.filter(n => !n.read).length;
      notifyListeners();
    }

    function notifyListeners() {
      listeners.forEach(fn => fn(getStats()));
    }

    function subscribe(fn) {
      listeners.push(fn);
    }

    function unsubscribe(fn) {
      listeners = listeners.filter(l => l !== fn);
    }

    function getStats() {
      return {
        total: notifications.length,
        unread: unreadCount,
        byType: notifications.reduce((acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        }, {})
      };
    }

    function notify(message, type = 'info', options = {}) {
      const notification = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        message,
        type,
        title: options.title,
        source: options.source || 'system',
        timestamp: Date.now(),
        read: false,
        actions: options.actions || [],
        metadata: options.metadata || {},
        priority: options.priority || 'normal'
      };

      notifications.unshift(notification);
      if (notifications.length > MAX_NOTIFICATIONS) {
        notifications = notifications.slice(0, MAX_NOTIFICATIONS);
      }
      save();
      updateUnreadCount();

      // Also show as toast for immediate visibility
      if (window.showToast && options.showToast !== false && !options._preventRecursion) {
        window.showToast(message, type, { showToast: false, _preventRecursion: true });
      }

      return notification.id;
    }

    function markAsRead(id) {
      const n = notifications.find(n => n.id === id);
      if (n && !n.read) {
        n.read = true;
        save();
        updateUnreadCount();
      }
    }

    function markAllAsRead() {
      notifications.forEach(n => n.read = true);
      save();
      updateUnreadCount();
    }

    function remove(id) {
      notifications = notifications.filter(n => n.id !== id);
      save();
      updateUnreadCount();
    }

    function clearAll() {
      notifications = [];
      save();
      updateUnreadCount();
    }

    function getAll(options = {}) {
      let result = [...notifications];
      if (options.unreadOnly) result = result.filter(n => !n.read);
      if (options.type) result = result.filter(n => n.type === options.type);
      if (options.source) result = result.filter(n => n.source === options.source);
      if (options.limit) result = result.slice(0, options.limit);
      return result;
    }

    function getUnread() {
      return notifications.filter(n => !n.read);
    }

    // Convenience methods for different notification types
    function success(message, options) { return notify(message, 'success', options); }
    function error(message, options) { return notify(message, 'error', options); }
    function warning(message, options) { return notify(message, 'warning', options); }
    function info(message, options) { return notify(message, 'info', options); }

    // Channel-specific notifications
    function agentEvent(agent, event, data) {
      return notify(
        data?.message || `${agent}: ${event}`,
        'info',
        { source: 'agent', title: `${agent} - ${event}`, metadata: { agent, event, ...data } }
      );
    }

    function skillEvent(skill, event, data) {
      const type = event === 'failed' ? 'error' : event === 'completed' ? 'success' : 'info';
      return notify(
        data?.message || `Skill ${skill}: ${event}`,
        type,
        { source: 'skill', title: `Skill: ${skill}`, metadata: { skill, event, ...data } }
      );
    }

    function systemAlert(message, data) {
      return notify(message, 'warning', { source: 'system', title: 'System Alert', priority: 'high', ...data });
    }

    load();

    const api = {
      notify,
      success,
      error,
      warning,
      info,
      agentEvent,
      skillEvent,
      systemAlert,
      markAsRead,
      markAllAsRead,
      remove,
      clearAll,
      getAll,
      getUnread,
      getStats,
      subscribe,
      unsubscribe,
      _initialized: true
    };

    return api;
  })();

  window.NotificationCenter = NotificationCenter;
}

// Initialize on DOM ready - single initialization guard
(function initNotificationCenter() {
  if (window.NotificationCenter && window.NotificationCenter._initialized) return;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnce);
  } else {
    initOnce();
  }

  function initOnce() {
    // Override showToast to also create notifications
    if (window.showToast && !window.showToast._notifPatched) {
      const originalShowToast = window.showToast;
      window.showToast = function(message, type, options = {}) {
        if (options._preventRecursion) {
          if (originalShowToast) originalShowToast(message, type);
          return;
        }
        if (originalShowToast) originalShowToast(message, type);
        if (window.NotificationCenter) {
          window.NotificationCenter.notify(message, type, { ...options, showToast: false, _preventRecursion: true });
        }
      };
      window.showToast._notifPatched = true;
    }
  }
})();
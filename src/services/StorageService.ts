/**
 * خدمة للتعامل مع التخزين المحلي للإعدادات والبيانات
 */
export const StorageService = {
  /**
   * حفظ إعدادات الإشعارات في التخزين المحلي
   * @param settings إعدادات الإشعارات
   */
  async saveNotificationSettings(settings: any): Promise<void> {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings to local storage:', error);
      throw error;
    }
  },

  /**
   * جلب إعدادات الإشعارات من التخزين المحلي
   * @returns إعدادات الإشعارات أو null إذا لم تكن موجودة
   */
  async getNotificationSettings(): Promise<any | null> {
    try {
      const settings = localStorage.getItem('notificationSettings');
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error getting notification settings from local storage:', error);
      return null;
    }
  },

  /**
   * حذف إعدادات الإشعارات من التخزين المحلي
   */
  async clearNotificationSettings(): Promise<void> {
    try {
      localStorage.removeItem('notificationSettings');
    } catch (error) {
      console.error('Error clearing notification settings from local storage:', error);
      throw error;
    }
  }
};

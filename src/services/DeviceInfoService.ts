/**
 * خدمة كشف معلومات الجهاز المتقدمة
 * تجلب معلومات الموبايل الدقيقة وإصدار الأندرويد
 */

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  osName: string;
  osVersion: string;
  deviceModel: string;
  browserName: string;
  browserVersion: string;
  screenSize: string;
  pixelRatio: number;
  // معلومات موبايل متقدمة
  isAndroid: boolean;
  isIOS: boolean;
  androidVersion?: string;
  iosVersion?: string;
  deviceType: 'phone' | 'tablet' | 'desktop' | 'unknown';
  // معلومات الأداء
  memory: number;
  cores: number;
  isLowEndDevice: boolean;
}

class DeviceInfoService {
  private deviceInfo: DeviceInfo | null = null;

  getDeviceInfo(): DeviceInfo {
    if (this.deviceInfo) return this.deviceInfo;

    const userAgent = navigator.userAgent;
    const screen = window.screen;
    const deviceMemory = (navigator as any).deviceMemory || 0;
    const hardwareConcurrency = navigator.hardwareConcurrency || 0;

    // كشف نظام التشغيل
    const osInfo = this.detectOS(userAgent);
    
    // كشف المتصفح
    const browserInfo = this.detectBrowser(userAgent);
    
    // كشف نوع الجهاز
    const deviceType = this.detectDeviceType(userAgent, screen.width, screen.height);
    
    // كشف إصدار الأندرويد
    const androidVersion = this.detectAndroidVersion(userAgent);
    const iosVersion = this.detectIOSVersion(userAgent);

    // تحديد إذا كان جهاز منخفض المواصفات
    const isLowEndDevice = deviceMemory <= 2 || hardwareConcurrency <= 2;

    this.deviceInfo = {
      userAgent,
      platform: navigator.platform,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
      isTablet: /iPad|Android(?=.*Tablet)|Windows(?=.*Touch)/i.test(userAgent),
      isDesktop: !(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)),
      osName: osInfo.name,
      osVersion: osInfo.version,
      deviceModel: this.extractDeviceModel(userAgent),
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
      screenSize: `${screen.width}x${screen.height}`,
      pixelRatio: window.devicePixelRatio,
      isAndroid: /Android/i.test(userAgent),
      isIOS: /iPhone|iPad|iPod/i.test(userAgent),
      androidVersion: androidVersion,
      iosVersion: iosVersion,
      deviceType,
      memory: deviceMemory,
      cores: hardwareConcurrency,
      isLowEndDevice
    };

    return this.deviceInfo;
  }

  private detectOS(userAgent: string): { name: string; version: string } {
    if (/Windows NT/i.test(userAgent)) {
      const version = userAgent.match(/Windows NT ([\d\.]+)/)?.[1] || '';
      return { name: 'Windows', version };
    }
    if (/Android/i.test(userAgent)) {
      const version = userAgent.match(/Android ([\d\.]+)/)?.[1] || '';
      return { name: 'Android', version };
    }
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      const version = userAgent.match(/OS ([\d\_]+)/)?.[1]?.replace(/_/g, '.') || '';
      return { name: 'iOS', version };
    }
    if (/Mac OS X/i.test(userAgent)) {
      const version = userAgent.match(/Mac OS X ([\d\_]+)/)?.[1]?.replace(/_/g, '.') || '';
      return { name: 'macOS', version };
    }
    if (/Linux/i.test(userAgent)) {
      return { name: 'Linux', version: '' };
    }
    
    return { name: 'Unknown', version: '' };
  }

  private detectBrowser(userAgent: string): { name: string; version: string } {
    if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) {
      const version = userAgent.match(/Chrome\/([\d\.]+)/)?.[1] || '';
      return { name: 'Chrome', version };
    }
    if (/Firefox/i.test(userAgent)) {
      const version = userAgent.match(/Firefox\/([\d\.]+)/)?.[1] || '';
      return { name: 'Firefox', version };
    }
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
      const version = userAgent.match(/Version\/([\d\.]+)/)?.[1] || '';
      return { name: 'Safari', version };
    }
    if (/Edg/i.test(userAgent)) {
      const version = userAgent.match(/Edg\/([\d\.]+)/)?.[1] || '';
      return { name: 'Edge', version };
    }
    if (/Opera|OPR/i.test(userAgent)) {
      const version = userAgent.match(/(?:Opera|OPR)\/([\d\.]+)/)?.[1] || '';
      return { name: 'Opera', version };
    }
    
    return { name: 'Unknown', version: '' };
  }

  private detectDeviceType(userAgent: string, width: number, height: number): 'phone' | 'tablet' | 'desktop' | 'unknown' {
    if (/iPad|Android.*(?=.*Tablet)/i.test(userAgent)) {
      return 'tablet';
    }
    if (/Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'phone';
    }
    if (width > 768) {
      return 'desktop';
    }
    return 'unknown';
  }

  private detectAndroidVersion(userAgent: string): string | undefined {
    if (/Android/i.test(userAgent)) {
      const match = userAgent.match(/Android ([\d\.]+)/);
      return match?.[1];
    }
    return undefined;
  }

  private detectIOSVersion(userAgent: string): string | undefined {
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      const match = userAgent.match(/OS ([\d\_]+)/);
      if (match) {
        return match[1].replace(/_/g, '.');
      }
    }
    return undefined;
  }

  private extractDeviceModel(userAgent: string): string {
    // محاولة استخراج نموذج الجهاز من User Agent
    const androidModels = [
      /Android.*?;.*?([^;\)]+)\)/,
      /Android.*?SM-([^\s\)]+)/
    ];
    
    for (const pattern of androidModels) {
      const match = userAgent.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // للمتصفحات على iOS
    if (/iPhone/i.test(userAgent)) {
      const modelMatch = userAgent.match(/iPhone([^\s,;]+)/);
      if (modelMatch) {
        return `iPhone ${modelMatch[1]}`;
      }
    }
    
    if (/iPad/i.test(userAgent)) {
      return 'iPad';
    }
    
    return 'Unknown Device';
  }

  getDeviceCapabilities(): string[] {
    const capabilities: string[] = [];
    const info = this.getDeviceInfo();
    
    if (info.isMobile) capabilities.push('موبايل (Mobile)');
    if (info.isTablet) capabilities.push('تابلت (Tablet)');
    if (info.isDesktop) capabilities.push('كمبيوتر (Desktop)');
    if (info.isAndroid) capabilities.push('أندرويد (Android)');
    if (info.isIOS) capabilities.push('iOS');
    if (info.isLowEndDevice) capabilities.push('جهاز منخفض المواصفات');
    if (info.memory >= 4) capabilities.push('ذاكرة عالية (4GB+)');
    if (info.cores >= 4) capabilities.push('معالج متعدد النوى (4C+)');
    
    return capabilities;
  }
}

export const deviceInfoService = new DeviceInfoService();
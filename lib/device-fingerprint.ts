/**
 * Device Fingerprinting Utilities for Cross-Device Continuity
 * Provides unique device identification and tracking capabilities
 */

export interface DeviceFingerprint {
  deviceId: string;
  platform: string;
  browser: string;
  version: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  hardwareConcurrency: number;
  memory?: number;
  cookieEnabled: boolean;
  localStorageEnabled: boolean;
  sessionStorageEnabled: boolean;
  indexedDBEnabled: boolean;
  webGLInfo?: WebGLInfo;
  canvasFingerprint: string;
  audioFingerprint?: string;
  fontList?: string[];
  plugins?: PluginInfo[];
}

export interface WebGLInfo {
  vendor: string;
  renderer: string;
  version: string;
  shadingLanguageVersion: string;
  maxTextureSize: number;
  maxViewportDims: number[];
}

export interface PluginInfo {
  name: string;
  filename: string;
  description: string;
}

export interface DeviceCapabilities {
  touchSupport: boolean;
  maxTouchPoints: number;
  orientation: string;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  battery?: {
    charging: boolean;
    level: number;
  };
  geolocation: boolean;
  notifications: boolean;
  vibration: boolean;
  accelerometer: boolean;
  gyroscope: boolean;
  magnetometer: boolean;
}

export class AdvancedDeviceFingerprinter {
  private static readonly STORAGE_KEY = 'kimbleai_device_id';
  private static cachedFingerprint: DeviceFingerprint | null = null;

  /**
   * Generate a comprehensive device fingerprint
   */
  static async generateFingerprint(): Promise<DeviceFingerprint> {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    if (typeof window === 'undefined') {
      return this.generateServerFingerprint();
    }

    const fingerprint: DeviceFingerprint = {
      deviceId: await this.getOrCreateDeviceId(),
      platform: this.getPlatform(),
      browser: this.getBrowser(),
      version: this.getBrowserVersion(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      memory: (navigator as any).deviceMemory,
      cookieEnabled: navigator.cookieEnabled,
      localStorageEnabled: this.testLocalStorage(),
      sessionStorageEnabled: this.testSessionStorage(),
      indexedDBEnabled: await this.testIndexedDB(),
      webGLInfo: await this.getWebGLInfo(),
      canvasFingerprint: this.generateCanvasFingerprint(),
      audioFingerprint: await this.generateAudioFingerprint(),
      fontList: await this.detectFonts(),
      plugins: this.getPlugins()
    };

    this.cachedFingerprint = fingerprint;
    return fingerprint;
  }

  /**
   * Get or create a persistent device ID
   */
  private static async getOrCreateDeviceId(): Promise<string> {
    try {
      // Try to get existing ID from localStorage
      let deviceId = localStorage.getItem(this.STORAGE_KEY);

      if (deviceId) {
        return deviceId;
      }

      // Try to get from IndexedDB as backup
      deviceId = await this.getFromIndexedDB();

      if (deviceId) {
        localStorage.setItem(this.STORAGE_KEY, deviceId);
        return deviceId;
      }

      // Generate new device ID
      const components = [
        navigator.userAgent,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.language,
        navigator.platform,
        this.generateCanvasFingerprint().slice(-20)
      ];

      deviceId = this.hashComponents(components);

      // Store in both localStorage and IndexedDB
      localStorage.setItem(this.STORAGE_KEY, deviceId);
      await this.storeInIndexedDB(deviceId);

      return deviceId;

    } catch (error) {
      console.warn('Failed to generate persistent device ID:', error);
      return this.generateFallbackId();
    }
  }

  /**
   * Generate fallback ID when storage is not available
   */
  private static generateFallbackId(): string {
    const components = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      Date.now().toString(),
      Math.random().toString()
    ];

    return 'fallback_' + this.hashComponents(components);
  }

  /**
   * Hash multiple components into a single ID
   */
  private static hashComponents(components: string[]): string {
    const combined = components.join('|');
    let hash = 0;

    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36).substring(0, 12);
  }

  /**
   * Store device ID in IndexedDB
   */
  private static async storeInIndexedDB(deviceId: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['device'], 'readwrite');
      const store = transaction.objectStore('device');
      await store.put({ key: 'deviceId', value: deviceId });
    } catch (error) {
      console.warn('Failed to store in IndexedDB:', error);
    }
  }

  /**
   * Get device ID from IndexedDB
   */
  private static async getFromIndexedDB(): Promise<string | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction(['device'], 'readonly');
      const store = transaction.objectStore('device');
      const result = await store.get('deviceId');
      return result?.value || null;
    } catch (error) {
      console.warn('Failed to get from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Open IndexedDB
   */
  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KimbleAIDevice', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('device')) {
          db.createObjectStore('device', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Detect platform information
   */
  private static getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('windows')) return 'Windows';
    if (userAgent.includes('macintosh') || userAgent.includes('mac os')) return 'macOS';
    if (userAgent.includes('linux')) return 'Linux';
    if (userAgent.includes('android')) return 'Android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';

    return navigator.platform || 'Unknown';
  }

  /**
   * Detect browser information
   */
  private static getBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'Chrome';
    if (userAgent.includes('firefox')) return 'Firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
    if (userAgent.includes('edg')) return 'Edge';
    if (userAgent.includes('opera')) return 'Opera';

    return 'Unknown';
  }

  /**
   * Get browser version
   */
  private static getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const browser = this.getBrowser();

    let versionRegex: RegExp;

    switch (browser) {
      case 'Chrome':
        versionRegex = /chrome\/([0-9.]+)/i;
        break;
      case 'Firefox':
        versionRegex = /firefox\/([0-9.]+)/i;
        break;
      case 'Safari':
        versionRegex = /version\/([0-9.]+)/i;
        break;
      case 'Edge':
        versionRegex = /edg\/([0-9.]+)/i;
        break;
      default:
        return 'Unknown';
    }

    const match = userAgent.match(versionRegex);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Test localStorage availability
   */
  private static testLocalStorage(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test sessionStorage availability
   */
  private static testSessionStorage(): boolean {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test IndexedDB availability
   */
  private static async testIndexedDB(): Promise<boolean> {
    try {
      await this.openDB();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get WebGL information
   */
  private static async getWebGLInfo(): Promise<WebGLInfo | undefined> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) return undefined;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

      return {
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Generate canvas fingerprint
   */
  private static generateCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return 'no-canvas';

      canvas.width = 200;
      canvas.height = 50;

      // Draw text with different fonts and styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Device fingerprint test 🔒', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device fingerprint test 🔒', 4, 17);

      // Draw some shapes
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL();
    } catch (error) {
      return 'canvas-error';
    }
  }

  /**
   * Generate audio fingerprint
   */
  private static async generateAudioFingerprint(): Promise<string | undefined> {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return undefined;

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, context.currentTime);

      gainNode.gain.setValueAtTime(0, context.currentTime);
      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(0);

      return new Promise((resolve) => {
        setTimeout(() => {
          const data = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(data);
          oscillator.stop();
          context.close();

          const fingerprint = Array.from(data)
            .slice(0, 30)
            .map(x => Math.abs(x))
            .join(',');

          resolve(fingerprint);
        }, 100);
      });
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Detect available fonts
   */
  private static async detectFonts(): Promise<string[]> {
    try {
      const testFonts = [
        'Arial', 'Arial Black', 'Arial Narrow', 'Book Antiqua', 'Bookman Old Style',
        'Calibri', 'Cambria', 'Comic Sans MS', 'Courier', 'Courier New',
        'Garamond', 'Georgia', 'Helvetica', 'Impact', 'Lucida Console',
        'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Palatino Linotype',
        'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana'
      ];

      const availableFonts: string[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return [];

      const testText = 'mmmmmmmmmmlli';
      const testSize = '72px';

      // Get baseline measurements with a common font
      ctx.font = `${testSize} monospace`;
      const baselineWidth = ctx.measureText(testText).width;

      for (const font of testFonts) {
        ctx.font = `${testSize} "${font}", monospace`;
        const width = ctx.measureText(testText).width;

        if (width !== baselineWidth) {
          availableFonts.push(font);
        }
      }

      return availableFonts;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get plugin information
   */
  private static getPlugins(): PluginInfo[] {
    try {
      const plugins: PluginInfo[] = [];

      for (let i = 0; i < navigator.plugins.length; i++) {
        const plugin = navigator.plugins[i];
        plugins.push({
          name: plugin.name,
          filename: plugin.filename,
          description: plugin.description
        });
      }

      return plugins;
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate server-side fingerprint
   */
  private static generateServerFingerprint(): DeviceFingerprint {
    return {
      deviceId: `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      platform: 'Server',
      browser: 'Node.js',
      version: process.version || 'Unknown',
      userAgent: 'Server',
      screenResolution: '0x0x0',
      timezone: 'UTC',
      language: 'en-US',
      hardwareConcurrency: 0,
      cookieEnabled: false,
      localStorageEnabled: false,
      sessionStorageEnabled: false,
      indexedDBEnabled: false,
      canvasFingerprint: 'server-canvas'
    };
  }

  /**
   * Get device capabilities
   */
  static async getCapabilities(): Promise<DeviceCapabilities> {
    if (typeof window === 'undefined') {
      return {
        touchSupport: false,
        maxTouchPoints: 0,
        orientation: 'unknown',
        geolocation: false,
        notifications: false,
        vibration: false,
        accelerometer: false,
        gyroscope: false,
        magnetometer: false
      };
    }

    const capabilities: DeviceCapabilities = {
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      orientation: screen.orientation?.type || 'unknown',
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      vibration: 'vibrate' in navigator,
      accelerometer: 'DeviceMotionEvent' in window,
      gyroscope: 'DeviceOrientationEvent' in window,
      magnetometer: 'ondeviceorientationabsolute' in window
    };

    // Get network information if available
    const connection = (navigator as any).connection;
    if (connection) {
      capabilities.connection = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }

    // Get battery information if available
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        capabilities.battery = {
          charging: battery.charging,
          level: battery.level
        };
      }
    } catch (error) {
      // Battery API not available
    }

    return capabilities;
  }

  /**
   * Clear cached fingerprint (force regeneration)
   */
  static clearCache(): void {
    this.cachedFingerprint = null;
  }

  /**
   * Get a short device identifier for display
   */
  static getShortId(deviceId: string): string {
    return deviceId.substring(0, 8).toUpperCase();
  }

  /**
   * Check if two device IDs are likely the same device
   */
  static isSameDevice(id1: string, id2: string): boolean {
    return id1 === id2;
  }
}
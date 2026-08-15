export type NetworkStatusListener = (isOnline: boolean) => void;

export class NetworkService {
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<NetworkStatusListener> = new Set();
  private pingIntervalId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineEvent);
      window.addEventListener('offline', this.handleOfflineEvent);
      this.startPingCheck();
    }
  }

  private handleOnlineEvent = () => {
    this.checkActualConnectivity();
  };

  private handleOfflineEvent = () => {
    this.updateStatus(false);
  };

  private async checkActualConnectivity(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateStatus(false);
      return false;
    }

    try {
      // Lightweight ping check to verify true internet connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch('https://tile.openstreetmap.org/0/0/0.png', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const online = response.ok || response.status < 500;
      this.updateStatus(online);
      return online;
    } catch {
      // If ping fetch fails or times out, consider connection offline
      this.updateStatus(false);
      return false;
    }
  }

  private startPingCheck(): void {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    // Ping every 12 seconds to ensure seamless offline detection
    this.pingIntervalId = setInterval(() => {
      this.checkActualConnectivity();
    }, 12000);
  }

  private updateStatus(newStatus: boolean): void {
    if (this.isOnlineStatus !== newStatus) {
      this.isOnlineStatus = newStatus;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isOnlineStatus);
      } catch (err) {
        console.error('Error in NetworkStatusListener:', err);
      }
    });
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    // Immediately invoke listener with current status
    listener(this.isOnlineStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineEvent);
      window.removeEventListener('offline', this.handleOfflineEvent);
    }
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }
  }
}

export const networkService = new NetworkService();

import { create } from 'zustand';

interface DeviceState {
  isMobileDevice: boolean;
  isHandsetConnected: boolean;
  sessionCode: string;
  handsetId: string | null;

  // Actions
  setIsMobileDevice: (isMobile: boolean) => void;
  setHandsetConnected: (connected: boolean, handsetId?: string) => void;
  setSessionCode: (code: string) => void;
  generateSessionCode: () => string;
}

// Detect if mobile device
const detectMobile = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check URL param first (for testing)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'handset') return true;
  if (urlParams.get('mode') === 'desktop') return false;

  // Check user agent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Generate random 4-digit session code
const generateCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const useDeviceStore = create<DeviceState>((set) => ({
  isMobileDevice: detectMobile(),
  isHandsetConnected: false,
  sessionCode: generateCode(),
  handsetId: null,

  setIsMobileDevice: (isMobile) => set({ isMobileDevice: isMobile }),

  setHandsetConnected: (connected, handsetId) =>
    set({
      isHandsetConnected: connected,
      handsetId: connected ? handsetId || null : null,
    }),

  setSessionCode: (code) => set({ sessionCode: code }),

  generateSessionCode: () => {
    const code = generateCode();
    set({ sessionCode: code });
    return code;
  },
}));

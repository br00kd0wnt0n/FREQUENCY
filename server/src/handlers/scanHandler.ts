import { Socket } from 'socket.io';
import { frequencyManager } from '../services/FrequencyManager';
import { ScanPayload, ScanUpdateEvent, SocketEvents } from '@frequency/shared';

const SCAN_INTERVAL_SLOW = 200; // ms per frequency step
const SCAN_INTERVAL_FAST = 50;
const FREQUENCY_STEP = 0.050; // 50 kHz steps
const MIN_FREQUENCY = 26.000;
const MAX_FREQUENCY = 32.000;

// Store active scans by socket ID
const activeScans = new Map<string, NodeJS.Timeout>();

export async function handleScan(socket: Socket, payload: ScanPayload): Promise<void> {
  const { direction, speed } = payload;
  const userId = socket.data.userId;

  // Stop any existing scan
  stopScan(socket.id);

  let currentFrequency = socket.data.currentFrequency || 27.000;
  const interval = speed === 'slow' ? SCAN_INTERVAL_SLOW : SCAN_INTERVAL_FAST;

  const scanInterval = setInterval(async () => {
    // Update frequency
    if (direction === 'up') {
      currentFrequency += FREQUENCY_STEP;
      if (currentFrequency > MAX_FREQUENCY) currentFrequency = MIN_FREQUENCY;
    } else {
      currentFrequency -= FREQUENCY_STEP;
      if (currentFrequency < MIN_FREQUENCY) currentFrequency = MAX_FREQUENCY;
    }

    // Round to avoid floating point issues
    currentFrequency = Math.round(currentFrequency * 1000) / 1000;

    // Check what's at this frequency
    const info = await frequencyManager.getFrequencyInfo(currentFrequency);

    // Calculate signal strength (how close to an actual broadcast)
    let signalStrength = 0.1; // Base noise
    let blip: 'voice' | 'morse' | 'numbers' | undefined;

    if (info && info.frequency.broadcast_type !== 'static') {
      signalStrength = 0.8 + Math.random() * 0.2; // Strong signal with slight variation
      if (info.frequency.broadcast_type === 'voice') blip = 'voice';
      else if (info.frequency.broadcast_type === 'morse') blip = 'morse';
      else if (info.frequency.broadcast_type === 'numbers') blip = 'numbers';
    }

    const scanUpdate: ScanUpdateEvent = {
      frequency: currentFrequency,
      signalStrength,
      blip,
    };

    socket.emit(SocketEvents.SCAN_UPDATE, scanUpdate);
    socket.data.currentFrequency = currentFrequency;

  }, interval);

  activeScans.set(socket.id, scanInterval);
  console.log(`User ${userId} started scanning ${direction} (${speed})`);
}

export function handleStopScan(socket: Socket): void {
  stopScan(socket.id);
  console.log(`User ${socket.data.userId} stopped scanning`);
}

function stopScan(socketId: string): void {
  const existingInterval = activeScans.get(socketId);
  if (existingInterval) {
    clearInterval(existingInterval);
    activeScans.delete(socketId);
  }
}

// Clean up scans on disconnect
export function cleanupScan(socketId: string): void {
  stopScan(socketId);
}

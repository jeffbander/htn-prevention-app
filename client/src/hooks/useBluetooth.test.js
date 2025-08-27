import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBluetooth, useBluetoothStatus, useBluetoothMeasurement } from './useBluetooth';
import bluetoothBPService from '@/services/bluetoothBP';
import * as bluetoothParser from '@/utils/bluetoothParser';

// Mock the services
vi.mock('@/services/bluetoothBP', () => ({
  default: {
    isConnected: vi.fn(),
    getDeviceInfo: vi.fn(),
    connectToDevice: vi.fn(),
    disconnect: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
}));

vi.mock('@/utils/bluetoothParser', () => ({
  checkBrowserCompatibility: vi.fn(),
  formatDeviceInfo: vi.fn(),
  formatMeasurement: vi.fn(),
  validateBPReading: vi.fn(),
  measurementToAPIFormat: vi.fn()
}));

describe('useBluetooth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock implementations
    bluetoothBPService.isConnected.mockReturnValue(false);
    bluetoothBPService.getDeviceInfo.mockReturnValue(null);
    bluetoothParser.checkBrowserCompatibility.mockReturnValue({
      canUseBluetooth: true,
      isIOS: false,
      browser: { isChrome: true }
    });
    bluetoothParser.formatDeviceInfo.mockImplementation((device) => ({
      ...device,
      displayName: device?.name || 'Unknown Device'
    }));
    bluetoothParser.formatMeasurement.mockImplementation((m) => ({
      ...m,
      formatted: true
    }));
    bluetoothParser.validateBPReading.mockReturnValue({
      isValid: true,
      errors: []
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useBluetooth());
      
      expect(result.current.isSupported).toBe(true);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.device).toBeNull();
      expect(result.current.lastMeasurement).toBeNull();
      expect(result.current.measurementHistory).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('disconnected');
    });

    it('should detect when already connected', () => {
      const mockDevice = { name: 'Test Device', id: 'test-123' };
      bluetoothBPService.isConnected.mockReturnValue(true);
      bluetoothBPService.getDeviceInfo.mockReturnValue(mockDevice);
      
      const { result } = renderHook(() => useBluetooth());
      
      expect(result.current.isConnected).toBe(true);
      expect(result.current.device).toEqual({
        ...mockDevice,
        displayName: 'Test Device'
      });
      expect(result.current.status).toBe('connected');
    });

    it('should handle unsupported browser', () => {
      bluetoothParser.checkBrowserCompatibility.mockReturnValue({
        canUseBluetooth: false,
        isIOS: false
      });
      
      const { result } = renderHook(() => useBluetooth());
      
      expect(result.current.isSupported).toBe(false);
      expect(result.current.status).toBe('unsupported');
    });
  });

  describe('Connection Management', () => {
    it('should connect to device successfully', async () => {
      const mockDevice = { name: 'BP Monitor', id: 'device-456' };
      const onConnect = vi.fn();
      bluetoothBPService.connectToDevice.mockResolvedValue(mockDevice);
      
      const { result } = renderHook(() => useBluetooth({ onConnect }));
      
      let connectResult;
      await act(async () => {
        connectResult = await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(true);
      expect(result.current.device).toEqual({
        ...mockDevice,
        displayName: 'BP Monitor'
      });
      expect(onConnect).toHaveBeenCalledWith(mockDevice);
      expect(connectResult).toBe(true);
    });

    it('should handle connection failure', async () => {
      const error = new Error('Connection failed');
      const onError = vi.fn();
      bluetoothBPService.connectToDevice.mockRejectedValue(error);
      
      const { result } = renderHook(() => useBluetooth({ onError }));
      
      let connectResult;
      await act(async () => {
        connectResult = await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe('Failed to connect to device');
      expect(onError).toHaveBeenCalledWith(error);
      expect(connectResult).toBe(false);
    });

    it('should handle user cancellation', async () => {
      const error = new Error('User cancelled the requestDevice() chooser');
      bluetoothBPService.connectToDevice.mockRejectedValue(error);
      
      const { result } = renderHook(() => useBluetooth());
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.error).toBe('Connection cancelled');
    });

    it('should disconnect successfully', async () => {
      const onDisconnect = vi.fn();
      bluetoothBPService.disconnect.mockResolvedValue(undefined);
      
      // First connect
      bluetoothBPService.isConnected.mockReturnValue(true);
      bluetoothBPService.getDeviceInfo.mockReturnValue({ name: 'Device' });
      
      const { result, rerender } = renderHook(() => useBluetooth({ onDisconnect }));
      rerender();
      
      let disconnectResult;
      await act(async () => {
        disconnectResult = await result.current.disconnect();
      });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.device).toBeNull();
      expect(onDisconnect).toHaveBeenCalledWith({ unexpected: false });
      expect(disconnectResult).toBe(true);
    });

    it('should handle disconnection failure', async () => {
      const error = new Error('Disconnect failed');
      const onError = vi.fn();
      bluetoothBPService.disconnect.mockRejectedValue(error);
      
      const { result } = renderHook(() => useBluetooth({ onError }));
      
      let disconnectResult;
      await act(async () => {
        disconnectResult = await result.current.disconnect();
      });
      
      expect(result.current.error).toBe('Failed to disconnect from device');
      expect(onError).toHaveBeenCalledWith(error);
      expect(disconnectResult).toBe(false);
    });
  });

  describe('Measurement Handling', () => {
    it('should handle incoming measurements', () => {
      const onMeasurement = vi.fn();
      let measurementHandler;
      
      bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'measurement') {
          measurementHandler = handler;
        }
      });
      
      const { result } = renderHook(() => useBluetooth({ onMeasurement }));
      
      const mockMeasurement = {
        systolic: 120,
        diastolic: 80,
        heartRate: 70,
        timestamp: new Date()
      };
      
      act(() => {
        if (measurementHandler) {
          measurementHandler(mockMeasurement);
        }
      });
      
      expect(result.current.lastMeasurement).toMatchObject({
        ...mockMeasurement,
        formatted: true,
        isValid: true,
        validationErrors: []
      });
      expect(result.current.measurementHistory).toHaveLength(1);
      expect(onMeasurement).toHaveBeenCalled();
    });

    it('should validate measurements', () => {
      bluetoothParser.validateBPReading.mockReturnValue({
        isValid: false,
        errors: ['Systolic too high']
      });
      
      let measurementHandler;
      bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'measurement') {
          measurementHandler = handler;
        }
      });
      
      const { result } = renderHook(() => useBluetooth());
      
      const mockMeasurement = {
        systolic: 250,
        diastolic: 80,
        heartRate: 70
      };
      
      act(() => {
        if (measurementHandler) {
          measurementHandler(mockMeasurement);
        }
      });
      
      expect(result.current.lastMeasurement.isValid).toBe(false);
      expect(result.current.lastMeasurement.validationErrors).toContain('Systolic too high');
    });

    it('should maintain measurement history with max 10 items', () => {
      let measurementHandler;
      bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'measurement') {
          measurementHandler = handler;
        }
      });
      
      const { result } = renderHook(() => useBluetooth());
      
      // Add 12 measurements
      act(() => {
        for (let i = 0; i < 12; i++) {
          if (measurementHandler) {
            measurementHandler({
              systolic: 120 + i,
              diastolic: 80,
              heartRate: 70
            });
          }
        }
      });
      
      expect(result.current.measurementHistory).toHaveLength(10);
      expect(result.current.measurementHistory[0].systolic).toBe(131); // Latest
      expect(result.current.measurementHistory[9].systolic).toBe(122); // 10th
    });

    it('should clear measurement history', () => {
      let measurementHandler;
      bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'measurement') {
          measurementHandler = handler;
        }
      });
      
      const { result } = renderHook(() => useBluetooth());
      
      // Add measurements
      act(() => {
        if (measurementHandler) {
          measurementHandler({ systolic: 120, diastolic: 80 });
        }
      });
      
      expect(result.current.measurementHistory).toHaveLength(1);
      
      act(() => {
        result.current.clearHistory();
      });
      
      expect(result.current.measurementHistory).toHaveLength(0);
      expect(result.current.lastMeasurement).toBeNull();
    });
  });

  describe('Auto-reconnect', () => {
    it('should attempt auto-reconnect on unexpected disconnection', async () => {
      const mockDevice = { name: 'Device', id: 'test-123' };
      bluetoothBPService.connectToDevice.mockResolvedValue(mockDevice);
      
      let disconnectHandler;
      bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'disconnected') {
          disconnectHandler = handler;
        }
      });
      
      renderHook(() => useBluetooth({ autoReconnect: true }));
      
      act(() => {
        if (disconnectHandler) {
          disconnectHandler({ unexpected: true });
        }
      });
      
      // Fast-forward timer
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      await waitFor(() => {
        expect(bluetoothBPService.connectToDevice).toHaveBeenCalled();
      });
    });

    it('should not auto-reconnect on manual disconnection', () => {
      let disconnectHandler;
      bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'disconnected') {
          disconnectHandler = handler;
        }
      });
      
      renderHook(() => useBluetooth({ autoReconnect: true }));
      
      act(() => {
        if (disconnectHandler) {
          disconnectHandler({ unexpected: false });
        }
      });
      
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      expect(bluetoothBPService.connectToDevice).not.toHaveBeenCalled();
    });
  });

  describe('API Format Conversion', () => {
    it('should format measurement for API', () => {
      bluetoothParser.measurementToAPIFormat.mockReturnValue({
        memberId: 'member-123',
        systolic: 120,
        diastolic: 80,
        heartRate: 70,
        measuredAt: '2025-08-27T10:00:00Z'
      });
      
      const { result } = renderHook(() => useBluetooth());
      
      const measurement = {
        systolic: 120,
        diastolic: 80,
        heartRate: 70
      };
      
      const formatted = result.current.formatForAPI(measurement, 'member-123');
      
      expect(bluetoothParser.measurementToAPIFormat).toHaveBeenCalledWith(
        measurement,
        'member-123'
      );
      expect(formatted.memberId).toBe('member-123');
    });
  });
});

describe('useBluetoothStatus Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should track connection status', () => {
    bluetoothBPService.isConnected.mockReturnValue(false);
    
    const { result } = renderHook(() => useBluetoothStatus());
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.device).toBeNull();
  });

  it('should update status when connected', () => {
    const mockDevice = { name: 'Device', id: 'test-456' };
    bluetoothBPService.isConnected.mockReturnValue(true);
    bluetoothBPService.getDeviceInfo.mockReturnValue(mockDevice);
    
    const { result } = renderHook(() => useBluetoothStatus());
    
    expect(result.current.isConnected).toBe(true);
    expect(result.current.device).toMatchObject(mockDevice);
  });

  it('should handle disconnection events', () => {
    let disconnectHandler;
    bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
      if (event === 'disconnected') {
        disconnectHandler = handler;
      }
    });
    
    const { result } = renderHook(() => useBluetoothStatus());
    
    // Initially connected
    bluetoothBPService.isConnected.mockReturnValue(true);
    bluetoothBPService.getDeviceInfo.mockReturnValue({ name: 'Device' });
    
    act(() => {
      if (disconnectHandler) {
        disconnectHandler();
      }
    });
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.device).toBeNull();
  });

  it('should check status periodically', () => {
    bluetoothBPService.isConnected.mockReturnValue(false);
    
    const { rerender } = renderHook(() => useBluetoothStatus());
    
    // Change connection status
    bluetoothBPService.isConnected.mockReturnValue(true);
    bluetoothBPService.getDeviceInfo.mockReturnValue({ name: 'Device' });
    
    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    rerender();
    
    expect(bluetoothBPService.isConnected).toHaveBeenCalledTimes(2); // Initial + periodic check
  });
});

describe('useBluetoothMeasurement Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should collect measurements', () => {
    const onMeasurement = vi.fn();
    let measurementHandler;
    
    bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
      if (event === 'measurement') {
        measurementHandler = handler;
      }
    });
    
    const { result } = renderHook(() => 
      useBluetoothMeasurement({ onMeasurement })
    );
    
    expect(result.current.isWaiting).toBe(true);
    expect(result.current.measurements).toEqual([]);
    
    const mockMeasurement = {
      systolic: 120,
      diastolic: 80,
      heartRate: 70
    };
    
    act(() => {
      if (measurementHandler) {
        measurementHandler(mockMeasurement);
      }
    });
    
    expect(result.current.isWaiting).toBe(false);
    expect(result.current.measurements).toHaveLength(1);
    expect(result.current.latestMeasurement).toMatchObject(mockMeasurement);
    expect(onMeasurement).toHaveBeenCalled();
  });

  it('should clear measurements', () => {
    let measurementHandler;
    bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
      if (event === 'measurement') {
        measurementHandler = handler;
      }
    });
    
    const { result } = renderHook(() => useBluetoothMeasurement());
    
    // Add measurement
    act(() => {
      if (measurementHandler) {
        measurementHandler({ systolic: 120, diastolic: 80 });
      }
    });
    
    expect(result.current.measurements).toHaveLength(1);
    
    act(() => {
      result.current.clearMeasurements();
    });
    
    expect(result.current.measurements).toHaveLength(0);
    expect(result.current.isWaiting).toBe(true);
  });
});
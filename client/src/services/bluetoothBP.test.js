import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bluetoothBPService from './bluetoothBP';

// Mock Web Bluetooth API
const mockDevice = {
  name: 'Test BP Monitor',
  id: 'test-device-id',
  gatt: {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn()
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

const mockServer = {
  getPrimaryService: vi.fn(),
  connected: true
};

const mockService = {
  getCharacteristic: vi.fn()
};

const mockCharacteristic = {
  properties: {
    indicate: true,
    notify: true,
    read: false
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  startNotifications: vi.fn(),
  stopNotifications: vi.fn(),
  service: {
    device: mockDevice
  }
};

const mockFeatureCharacteristic = {
  properties: {
    read: true
  },
  readValue: vi.fn()
};

describe('BluetoothBPService', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockDevice.gatt.connect.mockResolvedValue(mockServer);
    mockServer.getPrimaryService.mockResolvedValue(mockService);
    mockService.getCharacteristic.mockImplementation((uuid) => {
      if (uuid === 0x2A35) {
        return Promise.resolve(mockCharacteristic);
      } else if (uuid === 0x2A49) {
        return Promise.resolve(mockFeatureCharacteristic);
      }
      return Promise.reject(new Error('Characteristic not found'));
    });
    mockCharacteristic.startNotifications.mockResolvedValue(undefined);
    
    // Mock navigator.bluetooth
    global.navigator = {
      bluetooth: {
        requestDevice: vi.fn().mockResolvedValue(mockDevice)
      }
    };
  });

  afterEach(() => {
    // Clean up
    vi.clearAllMocks();
    delete global.navigator;
  });

  describe('isSupported', () => {
    it('should return true when Web Bluetooth is available', () => {
      expect(bluetoothBPService.constructor.isSupported()).toBe(true);
    });

    it('should return false when Web Bluetooth is not available', () => {
      delete global.navigator.bluetooth;
      expect(bluetoothBPService.constructor.isSupported()).toBe(false);
    });
  });

  describe('connectToDevice', () => {
    it('should successfully connect to a blood pressure device', async () => {
      const result = await bluetoothBPService.connectToDevice();
      
      expect(navigator.bluetooth.requestDevice).toHaveBeenCalledWith({
        filters: [
          { services: ['blood_pressure'] },
          { services: [0xFE4A] }
        ],
        optionalServices: ['blood_pressure', 0xFE4A]
      });
      
      expect(mockDevice.gatt.connect).toHaveBeenCalled();
      expect(mockServer.getPrimaryService).toHaveBeenCalledWith('blood_pressure');
      expect(mockService.getCharacteristic).toHaveBeenCalledWith(0x2A35);
      expect(mockCharacteristic.startNotifications).toHaveBeenCalled();
      
      expect(result).toEqual({
        name: 'Test BP Monitor',
        id: 'test-device-id',
        connected: true
      });
    });

    it('should fallback to Omron custom service if standard service is not found', async () => {
      mockServer.getPrimaryService.mockImplementation((uuid) => {
        if (uuid === 'blood_pressure') {
          return Promise.reject(new Error('Service not found'));
        } else if (uuid === 0xFE4A) {
          return Promise.resolve(mockService);
        }
      });

      await bluetoothBPService.connectToDevice();
      
      expect(mockServer.getPrimaryService).toHaveBeenCalledWith('blood_pressure');
      expect(mockServer.getPrimaryService).toHaveBeenCalledWith(0xFE4A);
    });

    it('should throw error when Web Bluetooth is not supported', async () => {
      delete global.navigator.bluetooth;
      
      await expect(bluetoothBPService.connectToDevice()).rejects.toThrow(
        'Web Bluetooth is not supported in this browser'
      );
    });

    it('should handle connection failure gracefully', async () => {
      navigator.bluetooth.requestDevice.mockRejectedValue(new Error('User cancelled'));
      
      await expect(bluetoothBPService.connectToDevice()).rejects.toThrow('User cancelled');
    });

    it('should set up disconnect listener on device', async () => {
      await bluetoothBPService.connectToDevice();
      
      expect(mockDevice.addEventListener).toHaveBeenCalledWith(
        'gattserverdisconnected',
        expect.any(Function)
      );
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      mockDevice.gatt.connected = true;
      await bluetoothBPService.connectToDevice();
    });

    it('should stop notifications and disconnect from device', async () => {
      mockCharacteristic.stopNotifications.mockResolvedValue(undefined);
      mockDevice.gatt.disconnect.mockResolvedValue(undefined);
      
      await bluetoothBPService.disconnect();
      
      expect(mockCharacteristic.stopNotifications).toHaveBeenCalled();
      expect(mockDevice.gatt.disconnect).toHaveBeenCalled();
      expect(bluetoothBPService.device).toBeNull();
    });

    it('should handle errors when stopping notifications', async () => {
      mockCharacteristic.stopNotifications.mockRejectedValue(new Error('Failed to stop'));
      mockDevice.gatt.disconnect.mockResolvedValue(undefined);
      
      await expect(bluetoothBPService.disconnect()).resolves.not.toThrow();
      expect(mockDevice.gatt.disconnect).toHaveBeenCalled();
    });
  });

  describe('_parseMeasurement', () => {
    it('should parse blood pressure measurement in mmHg', () => {
      // Create mock DataView for BP measurement
      // Flags: 0x00 (mmHg, no timestamp, no pulse, no user ID, no status)
      // Systolic: 120 mmHg (SFLOAT: 120 * 10 with exponent -1)
      // Diastolic: 80 mmHg (SFLOAT: 80 * 10 with exponent -1)
      // MAP: 93 mmHg (SFLOAT: 93 * 10 with exponent -1)
      const buffer = new ArrayBuffer(7);
      const view = new DataView(buffer);
      view.setUint8(0, 0x00); // Flags
      // SFLOAT format: lower 12 bits are mantissa, upper 4 bits are exponent
      // For 120.0 with exponent -1: mantissa = 1200, exponent = 0xF (-1 in 4-bit two's complement)
      view.setInt16(1, 0xF4B0, true); // Systolic (1200 mantissa, -1 exponent)
      view.setInt16(3, 0xF320, true); // Diastolic (800 mantissa, -1 exponent)
      view.setInt16(5, 0xF3A2, true); // MAP (930 mantissa, -1 exponent)
      
      const measurement = bluetoothBPService._parseMeasurement(view);
      
      expect(measurement.systolic).toBe(120);
      expect(measurement.diastolic).toBe(80);
      expect(measurement.meanArterialPressure).toBe(93);
      expect(measurement.originalUnit).toBe('mmHg');
    });

    it('should parse blood pressure measurement in kPa and convert to mmHg', () => {
      const buffer = new ArrayBuffer(7);
      const view = new DataView(buffer);
      view.setUint8(0, 0x01); // Flags (kPa)
      // For 16.0 kPa with exponent -1: mantissa = 160, exponent = 0xF
      view.setInt16(1, 0xF0A0, true); // Systolic (160 mantissa, -1 exponent = 16.0 kPa)
      view.setInt16(3, 0xF06B, true); // Diastolic (107 mantissa, -1 exponent = 10.7 kPa)
      view.setInt16(5, 0xF07C, true); // MAP (124 mantissa, -1 exponent = 12.4 kPa)
      
      const measurement = bluetoothBPService._parseMeasurement(view);
      
      expect(measurement.systolic).toBe(120); // 16.0 kPa * 7.50062 ≈ 120 mmHg
      expect(measurement.diastolic).toBe(80); // 10.7 kPa * 7.50062 ≈ 80 mmHg
      expect(measurement.meanArterialPressure).toBe(93); // 12.4 kPa * 7.50062 ≈ 93 mmHg
      expect(measurement.originalUnit).toBe('kPa');
    });

    it('should parse measurement with heart rate', () => {
      const buffer = new ArrayBuffer(9);
      const view = new DataView(buffer);
      view.setUint8(0, 0x04); // Flags (pulse rate present)
      view.setInt16(1, 0xF4B0, true); // Systolic (1200 mantissa, -1 exponent)
      view.setInt16(3, 0xF320, true); // Diastolic (800 mantissa, -1 exponent)
      view.setInt16(5, 0xF3A2, true); // MAP (930 mantissa, -1 exponent)
      view.setInt16(7, 0xF2BC, true); // Heart rate (700 mantissa, -1 exponent = 70 bpm)
      
      const measurement = bluetoothBPService._parseMeasurement(view);
      
      expect(measurement.heartRate).toBe(70);
    });

    it('should parse measurement with timestamp', () => {
      const buffer = new ArrayBuffer(14);
      const view = new DataView(buffer);
      view.setUint8(0, 0x02); // Flags (timestamp present)
      view.setInt16(1, 0xF4B0, true); // Systolic (1200 mantissa, -1 exponent)
      view.setInt16(3, 0xF320, true); // Diastolic (800 mantissa, -1 exponent)
      view.setInt16(5, 0xF3A2, true); // MAP (930 mantissa, -1 exponent)
      // Timestamp: 2025-08-27 14:30:45
      view.setUint16(7, 2025, true); // Year
      view.setUint8(9, 8); // Month
      view.setUint8(10, 27); // Day
      view.setUint8(11, 14); // Hours
      view.setUint8(12, 30); // Minutes
      view.setUint8(13, 45); // Seconds
      
      const measurement = bluetoothBPService._parseMeasurement(view);
      
      expect(measurement.deviceTimestamp).toBeInstanceOf(Date);
      expect(measurement.deviceTimestamp.getFullYear()).toBe(2025);
      expect(measurement.deviceTimestamp.getMonth()).toBe(7); // 0-indexed (August)
      expect(measurement.deviceTimestamp.getDate()).toBe(27);
    });

    it('should parse measurement status flags', () => {
      const buffer = new ArrayBuffer(9);
      const view = new DataView(buffer);
      view.setUint8(0, 0x10); // Flags (measurement status present)
      view.setInt16(1, 0xF4B0, true); // Systolic (1200 mantissa, -1 exponent)
      view.setInt16(3, 0xF320, true); // Diastolic (800 mantissa, -1 exponent)
      view.setInt16(5, 0xF3A2, true); // MAP (930 mantissa, -1 exponent)
      view.setUint16(7, 0x07, true); // Status flags (body movement, cuff fit error, irregular pulse)
      
      const measurement = bluetoothBPService._parseMeasurement(view);
      
      expect(measurement.status).toEqual({
        bodyMovementDetected: true,
        cuffFitError: true,
        irregularPulseDetected: true,
        pulseRateOutOfRange: false,
        measurementPositionImproper: false
      });
    });
  });

  describe('_parseSFLOAT', () => {
    it('should parse positive SFLOAT values correctly', () => {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      
      // 120.0 with exponent -1: mantissa = 1200, exponent = 0xF
      view.setInt16(0, 0xF4B0, true);
      expect(bluetoothBPService._parseSFLOAT(view, 0)).toBe(120);
      
      // 80.0 with exponent -1: mantissa = 800, exponent = 0xF
      view.setInt16(0, 0xF320, true);
      expect(bluetoothBPService._parseSFLOAT(view, 0)).toBe(80);
    });

    it('should handle special SFLOAT values', () => {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      
      // NaN
      view.setInt16(0, 0x07FF, true);
      expect(bluetoothBPService._parseSFLOAT(view, 0)).toBeNaN();
      
      // Positive Infinity
      view.setInt16(0, 0x07FE, true);
      expect(bluetoothBPService._parseSFLOAT(view, 0)).toBe(Infinity);
      
      // Negative Infinity
      view.setInt16(0, 0x0802, true);
      expect(bluetoothBPService._parseSFLOAT(view, 0)).toBe(-Infinity);
      
      // Reserved value
      view.setInt16(0, 0x0801, true);
      expect(bluetoothBPService._parseSFLOAT(view, 0)).toBeNull();
    });
  });

  describe('Event handling', () => {
    it('should add and notify event listeners', () => {
      const mockCallback = vi.fn();
      bluetoothBPService.addEventListener('measurement', mockCallback);
      
      const testData = { systolic: 120, diastolic: 80 };
      bluetoothBPService._notifyListeners('measurement', testData);
      
      expect(mockCallback).toHaveBeenCalledWith(testData);
    });

    it('should remove event listeners', () => {
      const mockCallback = vi.fn();
      bluetoothBPService.addEventListener('measurement', mockCallback);
      bluetoothBPService.removeEventListener('measurement', mockCallback);
      
      bluetoothBPService._notifyListeners('measurement', { systolic: 120 });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle errors in event listeners gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalCallback = vi.fn();
      
      bluetoothBPService.addEventListener('measurement', errorCallback);
      bluetoothBPService.addEventListener('measurement', normalCallback);
      
      const testData = { systolic: 120 };
      bluetoothBPService._notifyListeners('measurement', testData);
      
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalledWith(testData);
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      // Clean up any previous connection state
      bluetoothBPService._cleanup();
      expect(bluetoothBPService.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      mockDevice.gatt.connected = true;
      await bluetoothBPService.connectToDevice();
      
      expect(bluetoothBPService.isConnected()).toBe(true);
    });
  });

  describe('getDeviceInfo', () => {
    it('should return null when no device is connected', () => {
      // Clean up any previous connection state
      bluetoothBPService._cleanup();
      expect(bluetoothBPService.getDeviceInfo()).toBeNull();
    });

    it('should return device info when connected', async () => {
      mockDevice.gatt.connected = true;
      await bluetoothBPService.connectToDevice();
      
      const info = bluetoothBPService.getDeviceInfo();
      expect(info).toEqual({
        name: 'Test BP Monitor',
        id: 'test-device-id',
        connected: true
      });
    });
  });
});
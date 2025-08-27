import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BluetoothScanner from './BluetoothScanner';
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
  formatDeviceInfo: vi.fn()
}));

describe('BluetoothScanner', () => {
  const mockOnDeviceConnected = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    bluetoothBPService.isConnected.mockReturnValue(false);
    bluetoothBPService.getDeviceInfo.mockReturnValue(null);
    bluetoothParser.checkBrowserCompatibility.mockReturnValue({
      canUseBluetooth: true,
      isIOS: false,
      browser: {
        isChrome: true,
        isEdge: false,
        isBrave: false
      },
      message: 'Web Bluetooth is supported'
    });
    bluetoothParser.formatDeviceInfo.mockImplementation((device) => ({
      ...device,
      displayName: device?.name || 'Unknown Device',
      type: 'Blood Pressure Monitor',
      compatibility: 'high'
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the scanner interface when Bluetooth is supported', () => {
      render(<BluetoothScanner />);
      
      expect(screen.getByText('Bluetooth Blood Pressure Monitor')).toBeInTheDocument();
      expect(screen.getByText(/Connect your Bluetooth-enabled blood pressure monitor/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Scan for Devices/i })).toBeInTheDocument();
    });

    it('should show iOS warning when on iOS device', () => {
      bluetoothParser.checkBrowserCompatibility.mockReturnValue({
        canUseBluetooth: false,
        isIOS: true,
        browser: { isChrome: false, isEdge: false, isBrave: false },
        message: 'iOS does not support Web Bluetooth'
      });

      render(<BluetoothScanner />);
      
      expect(screen.getByText('iOS Device Detected')).toBeInTheDocument();
      expect(screen.getByText(/Web Bluetooth Not Supported on iOS/)).toBeInTheDocument();
      expect(screen.getByText(/Option 1: Use Bluefy Browser/)).toBeInTheDocument();
      expect(screen.getByText(/Option 2: Manual Entry/)).toBeInTheDocument();
    });

    it('should show browser compatibility error when not supported', () => {
      bluetoothParser.checkBrowserCompatibility.mockReturnValue({
        canUseBluetooth: false,
        isIOS: false,
        browser: { isChrome: false, isEdge: false, isBrave: false },
        message: 'Your browser does not support Web Bluetooth'
      });

      render(<BluetoothScanner />);
      
      expect(screen.getByText('Bluetooth Not Available')).toBeInTheDocument();
      expect(screen.getByText('Compatibility Issue')).toBeInTheDocument();
      expect(screen.getByText(/Your browser does not support Web Bluetooth/)).toBeInTheDocument();
    });

    it('should display connected device if already connected', () => {
      const mockDevice = {
        name: 'Omron Evolv',
        id: 'device-123',
        connected: true
      };
      
      bluetoothBPService.isConnected.mockReturnValue(true);
      bluetoothBPService.getDeviceInfo.mockReturnValue(mockDevice);

      render(<BluetoothScanner />);
      
      expect(screen.getByText('Connected Device')).toBeInTheDocument();
      expect(screen.getByText('Omron Evolv')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Disconnect/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Scan for Devices/i })).not.toBeInTheDocument();
    });
  });

  describe('Device Connection', () => {
    it('should handle successful device connection', async () => {
      const mockDevice = {
        name: 'Test BP Monitor',
        id: 'device-456',
        connected: true
      };
      
      bluetoothBPService.connectToDevice.mockResolvedValue(mockDevice);

      render(
        <BluetoothScanner 
          onDeviceConnected={mockOnDeviceConnected}
          onError={mockOnError}
        />
      );

      const scanButton = screen.getByRole('button', { name: /Scan for Devices/i });
      fireEvent.click(scanButton);

      // Check scanning state
      expect(screen.getByText(/Scanning for devices.../)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(bluetoothBPService.connectToDevice).toHaveBeenCalled();
        expect(mockOnDeviceConnected).toHaveBeenCalledWith(mockDevice);
        expect(screen.getByText('Connected Device')).toBeInTheDocument();
        expect(screen.getByText('Test BP Monitor')).toBeInTheDocument();
      });
    });

    it('should handle user cancellation', async () => {
      const error = new Error('User cancelled the requestDevice() chooser');
      bluetoothBPService.connectToDevice.mockRejectedValue(error);

      render(
        <BluetoothScanner 
          onDeviceConnected={mockOnDeviceConnected}
          onError={mockOnError}
        />
      );

      const scanButton = screen.getByRole('button', { name: /Scan for Devices/i });
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Device selection cancelled')).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });

    it('should handle connection failure', async () => {
      const error = new Error('GATT Server connection failed');
      bluetoothBPService.connectToDevice.mockRejectedValue(error);

      render(
        <BluetoothScanner 
          onDeviceConnected={mockOnDeviceConnected}
          onError={mockOnError}
        />
      );

      const scanButton = screen.getByRole('button', { name: /Scan for Devices/i });
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText(/Failed to connect to device/)).toBeInTheDocument();
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });

    it('should handle Web Bluetooth not supported error', async () => {
      const error = new Error('Web Bluetooth is not supported');
      bluetoothBPService.connectToDevice.mockRejectedValue(error);

      render(
        <BluetoothScanner 
          onDeviceConnected={mockOnDeviceConnected}
          onError={mockOnError}
        />
      );

      const scanButton = screen.getByRole('button', { name: /Scan for Devices/i });
      fireEvent.click(scanButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Web Bluetooth is not supported in this browser')).toBeInTheDocument();
      });
    });
  });

  describe('Device Disconnection', () => {
    it('should handle manual disconnection', async () => {
      const mockDevice = {
        name: 'Test Device',
        id: 'device-789',
        connected: true
      };
      
      bluetoothBPService.isConnected.mockReturnValue(true);
      bluetoothBPService.getDeviceInfo.mockReturnValue(mockDevice);
      bluetoothBPService.disconnect.mockResolvedValue(undefined);

      render(<BluetoothScanner />);

      const disconnectButton = screen.getByRole('button', { name: /Disconnect/i });
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(bluetoothBPService.disconnect).toHaveBeenCalled();
        expect(screen.queryByText('Connected Device')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Scan for Devices/i })).toBeInTheDocument();
      });
    });

    it('should handle disconnection failure', async () => {
      const mockDevice = {
        name: 'Test Device',
        id: 'device-789',
        connected: true
      };
      
      bluetoothBPService.isConnected.mockReturnValue(true);
      bluetoothBPService.getDeviceInfo.mockReturnValue(mockDevice);
      bluetoothBPService.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      render(<BluetoothScanner />);

      const disconnectButton = screen.getByRole('button', { name: /Disconnect/i });
      fireEvent.click(disconnectButton);

      await waitFor(() => {
        expect(bluetoothBPService.disconnect).toHaveBeenCalled();
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to disconnect from device')).toBeInTheDocument();
      });
    });

    it('should handle unexpected disconnection event', () => {
      let disconnectHandler;
      bluetoothBPService.addEventListener.mockImplementation((event, handler) => {
        if (event === 'disconnected') {
          disconnectHandler = handler;
        }
      });

      render(<BluetoothScanner />);

      // Verify event listener was registered
      expect(bluetoothBPService.addEventListener).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function)
      );

      // Simulate unexpected disconnection
      if (disconnectHandler) {
        disconnectHandler();
      }

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Device disconnected unexpectedly')).toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('should display connection instructions when not connected', () => {
      render(<BluetoothScanner />);
      
      expect(screen.getByText('Before connecting:')).toBeInTheDocument();
      expect(screen.getByText(/Turn on your blood pressure monitor/)).toBeInTheDocument();
      expect(screen.getByText(/Enable Bluetooth\/pairing mode/)).toBeInTheDocument();
      expect(screen.getByText(/Keep the device within 3 feet/)).toBeInTheDocument();
    });

    it('should display list of supported devices', () => {
      render(<BluetoothScanner />);
      
      expect(screen.getByText('Supported Devices:')).toBeInTheDocument();
      expect(screen.getByText(/Omron Evolv/)).toBeInTheDocument();
      expect(screen.getByText(/A&D Medical/)).toBeInTheDocument();
      expect(screen.getByText(/Withings BPM/)).toBeInTheDocument();
    });

    it('should show Chrome browser detection', () => {
      bluetoothParser.checkBrowserCompatibility.mockReturnValue({
        canUseBluetooth: true,
        isIOS: false,
        browser: {
          isChrome: true,
          isEdge: false,
          isBrave: false
        }
      });

      render(<BluetoothScanner />);
      
      expect(screen.getByText(/Chrome Browser Detected - Full Support/)).toBeInTheDocument();
    });

    it('should show Edge browser detection', () => {
      bluetoothParser.checkBrowserCompatibility.mockReturnValue({
        canUseBluetooth: true,
        isIOS: false,
        browser: {
          isChrome: false,
          isEdge: true,
          isBrave: false
        }
      });

      render(<BluetoothScanner />);
      
      expect(screen.getByText(/Edge Browser Detected - Full Support/)).toBeInTheDocument();
    });
  });

  describe('Event Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = render(<BluetoothScanner />);
      
      expect(bluetoothBPService.addEventListener).toHaveBeenCalled();
      
      unmount();
      
      expect(bluetoothBPService.removeEventListener).toHaveBeenCalledWith(
        'disconnected',
        expect.any(Function)
      );
    });
  });
});
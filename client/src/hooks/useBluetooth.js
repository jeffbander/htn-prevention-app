import { useState, useEffect, useCallback, useRef } from 'react';
import bluetoothBPService from '@/services/bluetoothBP';
import {
  checkBrowserCompatibility,
  formatDeviceInfo,
  formatMeasurement,
  validateBPReading,
  measurementToAPIFormat
} from '@/utils/bluetoothParser';

/**
 * Custom React hook for managing Bluetooth blood pressure monitor connections
 * @param {Object} options - Hook configuration options
 * @param {Function} options.onMeasurement - Callback when measurement is received
 * @param {Function} options.onConnect - Callback when device connects
 * @param {Function} options.onDisconnect - Callback when device disconnects
 * @param {Function} options.onError - Callback for errors
 * @param {boolean} options.autoReconnect - Attempt to reconnect on disconnection
 * @returns {Object} Bluetooth state and control functions
 */
export function useBluetooth({
  onMeasurement,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = false
} = {}) {
  // State management
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [device, setDevice] = useState(null);
  const [lastMeasurement, setLastMeasurement] = useState(null);
  const [measurementHistory, setMeasurementHistory] = useState([]);
  const [error, setError] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  
  // Refs for callbacks to avoid stale closures
  const callbacksRef = useRef({
    onMeasurement,
    onConnect,
    onDisconnect,
    onError
  });
  
  // Update callbacks ref
  useEffect(() => {
    callbacksRef.current = {
      onMeasurement,
      onConnect,
      onDisconnect,
      onError
    };
  }, [onMeasurement, onConnect, onDisconnect, onError]);

  // Initialize and check compatibility
  useEffect(() => {
    const compat = checkBrowserCompatibility();
    setCompatibility(compat);
    setIsSupported(compat.canUseBluetooth);
    
    // Check if already connected
    if (bluetoothBPService.isConnected()) {
      const deviceInfo = bluetoothBPService.getDeviceInfo();
      setDevice(formatDeviceInfo(deviceInfo));
      setIsConnected(true);
    }
  }, []);

  // Handle measurement events
  const handleMeasurement = useCallback((measurement) => {
    console.log('Bluetooth hook received measurement:', measurement);
    
    // Format and validate
    const formatted = formatMeasurement(measurement);
    const validation = validateBPReading(
      measurement.systolic,
      measurement.diastolic,
      measurement.heartRate
    );
    
    const enrichedMeasurement = {
      ...formatted,
      raw: measurement,
      isValid: validation.isValid,
      validationErrors: validation.errors,
      receivedAt: new Date()
    };
    
    // Update state
    setLastMeasurement(enrichedMeasurement);
    setMeasurementHistory(prev => [enrichedMeasurement, ...prev].slice(0, 10)); // Keep last 10
    
    // Call user callback
    if (callbacksRef.current.onMeasurement) {
      callbacksRef.current.onMeasurement(enrichedMeasurement);
    }
  }, []);

  // Handle disconnection events
  const handleDisconnection = useCallback((data) => {
    console.log('Device disconnected:', data);
    
    setIsConnected(false);
    setDevice(null);
    
    if (callbacksRef.current.onDisconnect) {
      callbacksRef.current.onDisconnect(data);
    }
    
    // Auto-reconnect if enabled and it was unexpected
    if (autoReconnect && data?.unexpected) {
      setTimeout(() => {
        console.log('Attempting auto-reconnect...');
        connect();
      }, 3000);
    }
  }, [autoReconnect]);

  // Set up event listeners
  useEffect(() => {
    bluetoothBPService.addEventListener('measurement', handleMeasurement);
    bluetoothBPService.addEventListener('disconnected', handleDisconnection);
    
    return () => {
      bluetoothBPService.removeEventListener('measurement', handleMeasurement);
      bluetoothBPService.removeEventListener('disconnected', handleDisconnection);
    };
  }, [handleMeasurement, handleDisconnection]);

  // Connect to device
  const connect = useCallback(async () => {
    if (!isSupported) {
      const error = new Error('Web Bluetooth is not supported');
      setError(error.message);
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(error);
      }
      return false;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const connectedDevice = await bluetoothBPService.connectToDevice();
      const deviceInfo = formatDeviceInfo(connectedDevice);
      
      setDevice(deviceInfo);
      setIsConnected(true);
      
      if (callbacksRef.current.onConnect) {
        callbacksRef.current.onConnect(connectedDevice);
      }
      
      return true;
    } catch (err) {
      console.error('Failed to connect:', err);
      
      let errorMessage = 'Failed to connect to device';
      if (err.message.includes('User cancelled')) {
        errorMessage = 'Connection cancelled';
      } else if (err.message.includes('not supported')) {
        errorMessage = 'Browser does not support Web Bluetooth';
      }
      
      setError(errorMessage);
      
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(err);
      }
      
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported]);

  // Disconnect from device
  const disconnect = useCallback(async () => {
    try {
      await bluetoothBPService.disconnect();
      setIsConnected(false);
      setDevice(null);
      setError(null);
      
      if (callbacksRef.current.onDisconnect) {
        callbacksRef.current.onDisconnect({ unexpected: false });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to disconnect:', err);
      setError('Failed to disconnect from device');
      
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(err);
      }
      
      return false;
    }
  }, []);

  // Clear measurement history
  const clearHistory = useCallback(() => {
    setMeasurementHistory([]);
    setLastMeasurement(null);
  }, []);

  // Convert measurement to API format
  const formatForAPI = useCallback((measurement, memberId) => {
    if (!measurement) return null;
    
    const raw = measurement.raw || measurement;
    return measurementToAPIFormat(raw, memberId);
  }, []);

  // Get current status
  const getStatus = useCallback(() => {
    if (!isSupported) return 'unsupported';
    if (isConnecting) return 'connecting';
    if (isConnected) return 'connected';
    return 'disconnected';
  }, [isSupported, isConnecting, isConnected]);

  return {
    // State
    isSupported,
    isConnected,
    isConnecting,
    device,
    lastMeasurement,
    measurementHistory,
    error,
    compatibility,
    status: getStatus(),
    
    // Methods
    connect,
    disconnect,
    clearHistory,
    formatForAPI,
    
    // Service reference (for advanced usage)
    service: bluetoothBPService
  };
}

/**
 * Simplified hook for basic Bluetooth connection status
 */
export function useBluetoothStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [device, setDevice] = useState(null);
  
  useEffect(() => {
    const checkStatus = () => {
      const connected = bluetoothBPService.isConnected();
      setIsConnected(connected);
      
      if (connected) {
        const deviceInfo = bluetoothBPService.getDeviceInfo();
        setDevice(formatDeviceInfo(deviceInfo));
      } else {
        setDevice(null);
      }
    };
    
    // Check initial status
    checkStatus();
    
    // Listen for changes
    const handleDisconnection = () => {
      setIsConnected(false);
      setDevice(null);
    };
    
    bluetoothBPService.addEventListener('disconnected', handleDisconnection);
    
    // Check periodically (backup)
    const interval = setInterval(checkStatus, 5000);
    
    return () => {
      bluetoothBPService.removeEventListener('disconnected', handleDisconnection);
      clearInterval(interval);
    };
  }, []);
  
  return { isConnected, device };
}

/**
 * Hook for managing Bluetooth measurements only (assumes connection exists)
 */
export function useBluetoothMeasurement(options = {}) {
  const [measurements, setMeasurements] = useState([]);
  const [isWaiting, setIsWaiting] = useState(true);
  
  useEffect(() => {
    const handleMeasurement = (measurement) => {
      const formatted = formatMeasurement(measurement);
      const validation = validateBPReading(
        measurement.systolic,
        measurement.diastolic,
        measurement.heartRate
      );
      
      const enriched = {
        ...formatted,
        raw: measurement,
        isValid: validation.isValid,
        validationErrors: validation.errors
      };
      
      setMeasurements(prev => [enriched, ...prev]);
      setIsWaiting(false);
      
      if (options.onMeasurement) {
        options.onMeasurement(enriched);
      }
    };
    
    bluetoothBPService.addEventListener('measurement', handleMeasurement);
    
    return () => {
      bluetoothBPService.removeEventListener('measurement', handleMeasurement);
    };
  }, [options.onMeasurement]);
  
  const clearMeasurements = () => {
    setMeasurements([]);
    setIsWaiting(true);
  };
  
  return {
    measurements,
    latestMeasurement: measurements[0] || null,
    isWaiting,
    clearMeasurements
  };
}

export default useBluetooth;
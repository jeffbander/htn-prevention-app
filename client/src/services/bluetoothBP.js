// Bluetooth Blood Pressure Service
// Handles connection and data retrieval from Bluetooth LE blood pressure monitors

class BluetoothBPService {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.measurementCharacteristic = null;
    this.listeners = new Map();
    
    // Standard Blood Pressure Service UUIDs
    this.BP_SERVICE_UUID = 'blood_pressure'; // 0x1810
    this.BP_MEASUREMENT_UUID = 0x2A35;
    this.BP_FEATURE_UUID = 0x2A49;
    
    // Omron custom service UUID (for newer models)
    this.OMRON_CUSTOM_SERVICE_UUID = 0xFE4A;
  }

  // Check if Web Bluetooth is supported
  static isSupported() {
    return navigator.bluetooth !== undefined;
  }

  // Request and connect to a blood pressure device
  async connectToDevice() {
    if (!BluetoothBPService.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    try {
      // Request a device with Blood Pressure Service
      // Allow both standard and Omron custom service
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.BP_SERVICE_UUID] },
          { services: [this.OMRON_CUSTOM_SERVICE_UUID] }
        ],
        optionalServices: [this.BP_SERVICE_UUID, this.OMRON_CUSTOM_SERVICE_UUID]
      });

      // Set up disconnect listener
      this.device.addEventListener('gattserverdisconnected', () => {
        this._handleDisconnection();
      });

      // Connect to GATT Server
      this.server = await this.device.gatt.connect();
      console.log('Connected to GATT Server');

      // Try to get the standard BP service first
      try {
        this.service = await this.server.getPrimaryService(this.BP_SERVICE_UUID);
        console.log('Using standard Blood Pressure Service');
      } catch (error) {
        // Fallback to Omron custom service
        console.log('Standard BP service not found, trying Omron custom service');
        this.service = await this.server.getPrimaryService(this.OMRON_CUSTOM_SERVICE_UUID);
        console.log('Using Omron custom service');
      }

      // Get the Blood Pressure Measurement characteristic
      this.measurementCharacteristic = await this.service.getCharacteristic(this.BP_MEASUREMENT_UUID);

      // Start notifications/indications
      await this._startNotifications();

      // Try to read BP Feature characteristic if available
      await this._readFeatures();

      return {
        name: this.device.name || 'Unknown Device',
        id: this.device.id,
        connected: true
      };

    } catch (error) {
      console.error('Connection failed:', error);
      this._cleanup();
      throw error;
    }
  }

  // Start receiving notifications/indications from the device
  async _startNotifications() {
    if (!this.measurementCharacteristic) {
      throw new Error('Measurement characteristic not available');
    }

    // Check if indications are supported (typical for BP measurement)
    if (this.measurementCharacteristic.properties.indicate || 
        this.measurementCharacteristic.properties.notify) {
      
      // Set up event listener for BP measurements
      this.measurementCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this._handleMeasurement.bind(this)
      );
      
      // Start receiving notifications/indications
      await this.measurementCharacteristic.startNotifications();
      console.log('Started BP measurement notifications');
    } else {
      throw new Error('Device does not support notifications/indications');
    }
  }

  // Read BP Feature characteristic if available
  async _readFeatures() {
    try {
      const featureChar = await this.service.getCharacteristic(this.BP_FEATURE_UUID);
      if (featureChar.properties.read) {
        const value = await featureChar.readValue();
        const features = this._parseFeatures(value);
        console.log('BP Device Features:', features);
        return features;
      }
    } catch (error) {
      console.log('BP Feature characteristic not available');
      return null;
    }
  }

  // Parse BP Feature flags
  _parseFeatures(dataView) {
    const flags = dataView.getUint16(0, true);
    return {
      bodyMovementDetection: (flags & 0x01) === 0x01,
      cuffFitDetection: (flags & 0x02) === 0x02,
      irregularPulseDetection: (flags & 0x04) === 0x04,
      pulseRateRangeDetection: (flags & 0x08) === 0x08,
      measurementPositionDetection: (flags & 0x10) === 0x10,
      multipleUserSupport: (flags & 0x20) === 0x20,
      multipleStorageSupport: (flags & 0x40) === 0x40
    };
  }

  // Handle incoming blood pressure measurement
  _handleMeasurement(event) {
    const value = event.target.value;
    const measurement = this._parseMeasurement(value);
    
    console.log('Blood Pressure Measurement:', measurement);
    
    // Notify all listeners
    this._notifyListeners('measurement', measurement);
  }

  // Parse blood pressure measurement data
  _parseMeasurement(dataView) {
    let index = 0;
    
    // Parse flags (first byte)
    const flags = dataView.getUint8(index);
    index++;
    
    // Check units (bit 0)
    const isKPa = (flags & 0x01) === 0x01;
    const unit = isKPa ? 'kPa' : 'mmHg';
    
    // Read systolic, diastolic, and MAP values (SFLOAT format)
    const systolic = this._parseSFLOAT(dataView, index);
    index += 2;
    const diastolic = this._parseSFLOAT(dataView, index);
    index += 2;
    const meanArterialPressure = this._parseSFLOAT(dataView, index);
    index += 2;
    
    // Convert kPa to mmHg if needed (1 kPa = 7.50062 mmHg)
    const convertedSystolic = isKPa ? Math.round(systolic * 7.50062) : systolic;
    const convertedDiastolic = isKPa ? Math.round(diastolic * 7.50062) : diastolic;
    const convertedMAP = isKPa ? Math.round(meanArterialPressure * 7.50062) : meanArterialPressure;
    
    const measurement = {
      systolic: convertedSystolic,
      diastolic: convertedDiastolic,
      meanArterialPressure: convertedMAP,
      originalUnit: unit,
      timestamp: new Date()
    };
    
    // Check if timestamp is present (bit 1 of flags)
    if ((flags & 0x02) === 0x02) {
      const year = dataView.getUint16(index, true);
      const month = dataView.getUint8(index + 2);
      const day = dataView.getUint8(index + 3);
      const hours = dataView.getUint8(index + 4);
      const minutes = dataView.getUint8(index + 5);
      const seconds = dataView.getUint8(index + 6);
      index += 7;
      
      // Create proper date object
      measurement.deviceTimestamp = new Date(year, month - 1, day, hours, minutes, seconds);
    }
    
    // Check if pulse rate is present (bit 2 of flags)
    if ((flags & 0x04) === 0x04) {
      const pulseRate = this._parseSFLOAT(dataView, index);
      index += 2;
      measurement.heartRate = Math.round(pulseRate);
    }
    
    // Check if user ID is present (bit 3 of flags)
    if ((flags & 0x08) === 0x08) {
      measurement.userId = dataView.getUint8(index);
      index++;
    }
    
    // Check if measurement status is present (bit 4 of flags)
    if ((flags & 0x10) === 0x10) {
      const statusFlags = dataView.getUint16(index, true);
      measurement.status = this._parseMeasurementStatus(statusFlags);
      index += 2;
    }
    
    return measurement;
  }

  // Parse IEEE 11073 SFLOAT format
  _parseSFLOAT(dataView, offset) {
    const value = dataView.getInt16(offset, true);
    
    // Special values
    if (value === 0x07FF) return NaN;  // Not a Number
    if (value === 0x0800) return NaN;  // Not at this Resolution
    if (value === 0x07FE) return Infinity;  // Positive Infinity
    if (value === 0x0802) return -Infinity; // Negative Infinity
    if (value === 0x0801) return null; // Reserved
    
    // Extract mantissa and exponent
    const mantissa = value & 0x0FFF;
    let exponent = value >> 12;
    
    // Handle negative exponent (two's complement)
    if (exponent >= 0x08) {
      exponent = -((0x0F - exponent) + 1);
    }
    
    // Calculate actual value
    const mantissaValue = (mantissa >= 0x0800) ? 
      -(0x1000 - mantissa) : mantissa;
    
    return mantissaValue * Math.pow(10, exponent);
  }

  // Parse measurement status flags
  _parseMeasurementStatus(statusFlags) {
    return {
      bodyMovementDetected: (statusFlags & 0x01) === 0x01,
      cuffFitError: (statusFlags & 0x02) === 0x02,
      irregularPulseDetected: (statusFlags & 0x04) === 0x04,
      pulseRateOutOfRange: (statusFlags & 0x08) === 0x08,
      measurementPositionImproper: (statusFlags & 0x10) === 0x10
    };
  }

  // Disconnect from the device
  async disconnect() {
    if (this.measurementCharacteristic && this.measurementCharacteristic.service.device.gatt.connected) {
      try {
        await this.measurementCharacteristic.stopNotifications();
      } catch (error) {
        console.warn('Error stopping notifications:', error);
      }
    }

    if (this.device && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
      console.log('Disconnected from device');
    }

    this._cleanup();
  }

  // Handle unexpected disconnection
  _handleDisconnection() {
    console.log('Device disconnected unexpectedly');
    this._cleanup();
    this._notifyListeners('disconnected', { unexpected: true });
  }

  // Clean up resources
  _cleanup() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.measurementCharacteristic = null;
  }

  // Add event listener
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  // Remove event listener
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // Notify all listeners for an event
  _notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Get connection status
  isConnected() {
    return !!(this.device && this.device.gatt && this.device.gatt.connected);
  }

  // Get device info
  getDeviceInfo() {
    if (!this.device) return null;
    
    return {
      name: this.device.name || 'Unknown Device',
      id: this.device.id,
      connected: this.isConnected()
    };
  }
}

// Export singleton instance
const bluetoothBPService = new BluetoothBPService();
export default bluetoothBPService;
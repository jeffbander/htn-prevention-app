// Bluetooth Blood Pressure Data Parser Utilities
// Helper functions for parsing and validating BP measurements

// HTN Status calculation based on AHA guidelines
export function calculateHTNStatus(systolic, diastolic) {
  if (systolic >= 180 || diastolic >= 120) {
    return 'Crisis';
  } else if (systolic >= 140 || diastolic >= 90) {
    return 'Stage 2';
  } else if (systolic >= 130 || diastolic >= 80) {
    return 'Stage 1';
  } else if (systolic >= 120 && diastolic < 80) {
    return 'Elevated';
  } else {
    return 'Normal';
  }
}

// Validate blood pressure reading values
export function validateBPReading(systolic, diastolic, heartRate = null) {
  const errors = [];
  
  // Validate systolic
  if (!systolic || isNaN(systolic)) {
    errors.push('Systolic pressure is required');
  } else if (systolic < 70 || systolic > 300) {
    errors.push('Systolic pressure must be between 70-300 mmHg');
  }
  
  // Validate diastolic
  if (!diastolic || isNaN(diastolic)) {
    errors.push('Diastolic pressure is required');
  } else if (diastolic < 40 || diastolic > 200) {
    errors.push('Diastolic pressure must be between 40-200 mmHg');
  }
  
  // Validate relationship between systolic and diastolic
  if (systolic && diastolic && !isNaN(systolic) && !isNaN(diastolic)) {
    if (systolic <= diastolic) {
      errors.push('Systolic pressure must be greater than diastolic pressure');
    }
  }
  
  // Validate heart rate if provided
  if (heartRate !== null && heartRate !== undefined) {
    if (isNaN(heartRate)) {
      errors.push('Heart rate must be a number');
    } else if (heartRate < 30 || heartRate > 250) {
      errors.push('Heart rate must be between 30-250 bpm');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Format measurement for display
export function formatMeasurement(measurement) {
  if (!measurement) return null;
  
  const { systolic, diastolic, heartRate, timestamp, deviceTimestamp } = measurement;
  
  // Use device timestamp if available, otherwise use local timestamp
  const measurementTime = deviceTimestamp || timestamp;
  
  return {
    bloodPressure: `${systolic}/${diastolic}`,
    systolic,
    diastolic,
    heartRate: heartRate ? `${heartRate} bpm` : null,
    htnStatus: calculateHTNStatus(systolic, diastolic),
    timestamp: measurementTime,
    formattedTime: formatTimestamp(measurementTime)
  };
}

// Format timestamp for display
export function formatTimestamp(date) {
  if (!date) return 'Unknown time';
  
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  
  // If less than 1 minute ago
  if (diff < 60000) {
    return 'Just now';
  }
  
  // If less than 1 hour ago
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  
  // If today
  if (d.toDateString() === now.toDateString()) {
    return `Today at ${d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  }
  
  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  }
  
  // Otherwise show full date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Convert measurement to API format
export function measurementToAPIFormat(measurement, memberId) {
  if (!measurement || !memberId) return null;
  
  const { systolic, diastolic, heartRate, deviceTimestamp, timestamp } = measurement;
  
  // Use device timestamp if available, otherwise use local timestamp
  const readingDate = (deviceTimestamp || timestamp || new Date()).toISOString();
  
  return {
    memberId,
    systolic: parseInt(systolic),
    diastolic: parseInt(diastolic),
    heartRate: heartRate ? parseInt(heartRate) : null,
    readingDate
  };
}

// Get HTN status color for UI
export function getHTNStatusColor(status) {
  const colors = {
    'Normal': 'bg-green-100 text-green-800',
    'Elevated': 'bg-yellow-100 text-yellow-800',
    'Stage 1': 'bg-orange-100 text-orange-800',
    'Stage 2': 'bg-red-100 text-red-800',
    'Crisis': 'bg-red-200 text-red-900 font-bold'
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Get HTN status icon
export function getHTNStatusIcon(status) {
  const icons = {
    'Normal': '✓',
    'Elevated': '⚠',
    'Stage 1': '⚠',
    'Stage 2': '⚠',
    'Crisis': '🚨'
  };
  
  return icons[status] || '';
}

// Parse measurement status for user-friendly messages
export function parseMeasurementStatus(status) {
  if (!status) return [];
  
  const messages = [];
  
  if (status.bodyMovementDetected) {
    messages.push({
      type: 'warning',
      message: 'Body movement detected during measurement'
    });
  }
  
  if (status.cuffFitError) {
    messages.push({
      type: 'error',
      message: 'Cuff fit error - please adjust cuff and retry'
    });
  }
  
  if (status.irregularPulseDetected) {
    messages.push({
      type: 'warning',
      message: 'Irregular pulse detected'
    });
  }
  
  if (status.pulseRateOutOfRange) {
    messages.push({
      type: 'warning',
      message: 'Pulse rate out of normal range'
    });
  }
  
  if (status.measurementPositionImproper) {
    messages.push({
      type: 'warning',
      message: 'Improper measurement position detected'
    });
  }
  
  return messages;
}

// Device compatibility checker
export function checkDeviceCompatibility(deviceName) {
  if (!deviceName) return { compatible: true, confidence: 'low' };
  
  const lowerName = deviceName.toLowerCase();
  
  // Known compatible devices
  const compatibleDevices = [
    { pattern: /omron/i, confidence: 'high' },
    { pattern: /evolv/i, confidence: 'high' },
    { pattern: /m7/i, confidence: 'high' },
    { pattern: /intelli/i, confidence: 'high' },
    { pattern: /bp\d+/i, confidence: 'medium' },
    { pattern: /blood pressure/i, confidence: 'medium' },
    { pattern: /a\&d/i, confidence: 'medium' },
    { pattern: /beurer/i, confidence: 'medium' },
    { pattern: /withings/i, confidence: 'medium' }
  ];
  
  for (const device of compatibleDevices) {
    if (device.pattern.test(deviceName)) {
      return { 
        compatible: true, 
        confidence: device.confidence,
        deviceType: deviceName
      };
    }
  }
  
  // Unknown device - might still work with standard GATT profile
  return { 
    compatible: true, 
    confidence: 'low',
    deviceType: 'Generic BP Monitor'
  };
}

// Format device info for display
export function formatDeviceInfo(device) {
  if (!device) return 'No device connected';
  
  const { name, id, connected } = device;
  const compatibility = checkDeviceCompatibility(name);
  
  return {
    displayName: name || 'Unknown Device',
    shortId: id ? id.substring(0, 8) : 'Unknown',
    status: connected ? 'Connected' : 'Disconnected',
    compatibility: compatibility.confidence,
    type: compatibility.deviceType
  };
}

// Check browser compatibility
export function checkBrowserCompatibility() {
  const isSupported = 'bluetooth' in navigator;
  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  
  // Check for iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // Check for specific browsers
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  const isEdge = /Edg/.test(navigator.userAgent);
  const isBrave = navigator.brave !== undefined;
  const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
  
  return {
    isSupported,
    isSecure,
    isIOS,
    browser: {
      isChrome,
      isEdge,
      isBrave,
      isSafari
    },
    canUseBluetooth: isSupported && isSecure && !isIOS,
    message: getCompatibilityMessage(isSupported, isSecure, isIOS)
  };
}

// Get user-friendly compatibility message
function getCompatibilityMessage(isSupported, isSecure, isIOS) {
  if (isIOS) {
    return 'Web Bluetooth is not supported on iOS. Please use the Bluefy browser app or manual entry.';
  }
  
  if (!isSupported) {
    return 'Your browser does not support Web Bluetooth. Please use Chrome, Edge, or Brave browser.';
  }
  
  if (!isSecure) {
    return 'Web Bluetooth requires a secure connection (HTTPS). Please access the site via HTTPS.';
  }
  
  return 'Your browser supports Web Bluetooth. You can connect to compatible devices.';
}

export default {
  calculateHTNStatus,
  validateBPReading,
  formatMeasurement,
  formatTimestamp,
  measurementToAPIFormat,
  getHTNStatusColor,
  getHTNStatusIcon,
  parseMeasurementStatus,
  checkDeviceCompatibility,
  formatDeviceInfo,
  checkBrowserCompatibility
};
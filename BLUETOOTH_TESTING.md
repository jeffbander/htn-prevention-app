# Bluetooth Blood Pressure Integration Testing Guide

## Overview
This HTN Prevention App now supports Bluetooth blood pressure monitors using the Web Bluetooth API. The integration allows automatic data capture from compatible Bluetooth LE blood pressure devices.

## Supported Platforms

### ✅ Full Support
- **Desktop Chrome** (Windows, Mac, Linux)
- **Desktop Edge** (Windows)
- **Android Chrome/Edge/Brave**

### ❌ Not Supported
- **iOS Safari** (Apple restriction)
- **Desktop Safari**

### iOS Workaround
- Use **Bluefy Browser** app from App Store
- Manual entry fallback available

## Features Implemented

### 1. Core Bluetooth Service (`/client/src/services/bluetoothBP.js`)
- Device discovery and connection
- GATT service communication
- Standard BP Service (0x1810) support
- Omron custom service (0xFE4A) support
- IEEE 11073 SFLOAT data parsing
- Automatic HTN status calculation

### 2. UI Components
- **BluetoothScanner**: Device discovery interface
- **BluetoothStatus**: Connection status indicator
- **BluetoothReading**: Real-time measurement display
- **useBluetooth Hook**: React integration

### 3. Blood Pressure Page Integration
- Connect Device button in header
- Bluetooth status indicator
- Automatic form population with readings
- Manual entry fallback

## Testing Instructions

### Prerequisites
1. **HTTPS Required**: Access the app via HTTPS (localhost is OK)
2. **Compatible Browser**: Chrome, Edge, or Brave
3. **Bluetooth Device** (optional): Omron or compatible BP monitor

### Test Without Physical Device
1. Navigate to **Blood Pressure** page
2. Click **"Connect Device"** button
3. Browser will show device chooser
4. Click "Cancel" to simulate no device available
5. Use manual entry form instead

### Test With Physical Device
1. Turn on your Bluetooth BP monitor
2. Enable pairing mode on the device
3. Navigate to **Blood Pressure** page
4. Click **"Connect Device"** button
5. Select your device from the browser list
6. Click "Pair" when prompted
7. Take a blood pressure measurement
8. Reading will auto-populate in the form

## Compatible Devices

### Verified Models
- Omron Evolv (BP7000)
- Omron M7 Intelli IT
- Omron X7 Smart

### Should Work (Standard GATT)
- A&D Medical monitors
- Beurer BM series
- Withings BPM
- Any device supporting Blood Pressure Service (0x1810)

## Data Flow
1. User clicks Connect Device
2. Browser shows device chooser
3. User selects BP monitor
4. App pairs with device
5. User takes measurement on device
6. Data transmitted via Bluetooth
7. App parses and validates reading
8. Form auto-populates with values
9. User confirms and saves

## Security Features
- HTTPS required for Web Bluetooth
- User permission for each connection
- No background scanning
- Pairing required for data transfer
- Data validation before saving

## Troubleshooting

### "Web Bluetooth not supported"
- Use Chrome, Edge, or Brave browser
- Ensure HTTPS connection
- Check browser version is up-to-date

### Device Not Found
- Ensure device is on and in pairing mode
- Keep device within 3 feet
- Check device battery level
- Try turning Bluetooth off/on

### Connection Failed
- Remove existing pairing in OS settings
- Restart the BP monitor
- Refresh the web page
- Try different browser

### iOS Not Working
1. Install Bluefy Browser from App Store
2. Open HTN Prevention App in Bluefy
3. Bluetooth will work normally
4. Or use manual entry as fallback

## API Endpoints
No new API endpoints required. Bluetooth readings use existing:
- `POST /api/blood-pressure-readings`

## Technical Details

### Bluetooth GATT Services
- **Blood Pressure Service**: UUID 0x1810
- **BP Measurement**: UUID 0x2A35 (Indication)
- **BP Feature**: UUID 0x2A49 (Read)
- **Omron Custom**: UUID 0xFE4A

### Data Format
```javascript
{
  systolic: 120,        // mmHg
  diastolic: 80,        // mmHg
  heartRate: 70,        // bpm (optional)
  timestamp: Date,      // Measurement time
  htnStatus: "Normal"   // Auto-calculated
}
```

### Browser Console Testing
```javascript
// Check if Web Bluetooth is supported
console.log('Bluetooth supported:', 'bluetooth' in navigator);

// Manually trigger connection (for testing)
navigator.bluetooth.requestDevice({
  filters: [{ services: ['blood_pressure'] }]
}).then(device => {
  console.log('Device:', device.name);
}).catch(error => {
  console.error('Error:', error);
});
```

## Future Enhancements
- Historical data retrieval from device
- Multiple user profiles
- Export readings to health apps
- Native mobile app wrapper
- Continuous monitoring mode
- AFib detection (Omron M7 IT)

## Support
For issues with Bluetooth integration:
1. Check browser console for errors
2. Verify device compatibility
3. Test with Chrome DevTools Bluetooth Inspector
4. Report issues with device model and browser version

---
**Implementation Date**: August 27, 2025  
**Version**: 1.0.0
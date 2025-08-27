import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bluetooth, 
  BluetoothConnected,
  BluetoothOff, 
  Smartphone, 
  Monitor,
  AlertCircle,
  Info,
  CheckCircle,
  Loader2
} from 'lucide-react';
import bluetoothBPService from '@/services/bluetoothBP';
import { checkBrowserCompatibility, formatDeviceInfo } from '@/utils/bluetoothParser';

export default function BluetoothScanner({ onDeviceConnected, onError }) {
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check browser compatibility on mount
    const compat = checkBrowserCompatibility();
    setCompatibility(compat);

    // Check if already connected
    if (bluetoothBPService.isConnected()) {
      const device = bluetoothBPService.getDeviceInfo();
      setConnectedDevice(formatDeviceInfo(device));
    }

    // Set up event listeners
    const handleDisconnection = () => {
      setConnectedDevice(null);
      setError('Device disconnected unexpectedly');
    };

    bluetoothBPService.addEventListener('disconnected', handleDisconnection);

    return () => {
      bluetoothBPService.removeEventListener('disconnected', handleDisconnection);
    };
  }, []);

  const handleScanAndConnect = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const device = await bluetoothBPService.connectToDevice();
      const formattedDevice = formatDeviceInfo(device);
      setConnectedDevice(formattedDevice);
      
      if (onDeviceConnected) {
        onDeviceConnected(device);
      }
    } catch (err) {
      console.error('Failed to connect:', err);
      let errorMessage = 'Failed to connect to device';
      
      if (err.message.includes('User cancelled')) {
        errorMessage = 'Device selection cancelled';
      } else if (err.message.includes('not supported')) {
        errorMessage = 'Web Bluetooth is not supported in this browser';
      } else if (err.message.includes('GATT')) {
        errorMessage = 'Failed to connect to device. Please ensure the device is on and in pairing mode.';
      }
      
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await bluetoothBPService.disconnect();
      setConnectedDevice(null);
    } catch (err) {
      console.error('Failed to disconnect:', err);
      setError('Failed to disconnect from device');
    }
  };

  // Show compatibility warning for iOS
  if (compatibility && compatibility.isIOS) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            iOS Device Detected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Web Bluetooth Not Supported on iOS</AlertTitle>
            <AlertDescription className="mt-2">
              Safari and other iOS browsers don't support Web Bluetooth. 
              Here are your options:
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Option 1: Use Bluefy Browser</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Download the Bluefy browser app from the App Store. It supports Web Bluetooth on iOS.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055', '_blank')}
              >
                Get Bluefy Browser
              </Button>
            </div>
            
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Option 2: Manual Entry</h4>
              <p className="text-sm text-muted-foreground">
                Take a reading on your blood pressure monitor and enter the values manually below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show browser compatibility issues
  if (compatibility && !compatibility.canUseBluetooth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BluetoothOff className="h-5 w-5" />
            Bluetooth Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Compatibility Issue</AlertTitle>
            <AlertDescription className="mt-2">
              {compatibility.message}
            </AlertDescription>
          </Alert>
          
          {!compatibility.browser.isChrome && !compatibility.browser.isEdge && !compatibility.browser.isBrave && (
            <div className="mt-4 p-4 border rounded-lg">
              <p className="text-sm mb-2">Supported browsers:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Google Chrome (Desktop & Android)</li>
                <li>• Microsoft Edge</li>
                <li>• Brave Browser</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Main scanner UI
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bluetooth className="h-5 w-5" />
          Bluetooth Blood Pressure Monitor
        </CardTitle>
        <CardDescription>
          Connect your Bluetooth-enabled blood pressure monitor to automatically import readings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {connectedDevice ? (
          <div className="border rounded-lg p-4 bg-green-50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BluetoothConnected className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Connected Device</span>
                </div>
                <p className="text-sm">{connectedDevice.displayName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {connectedDevice.type}
                  </Badge>
                  {connectedDevice.compatibility === 'high' && (
                    <Badge className="text-xs bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified Compatible
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              No device connected. Click the button below to scan for nearby devices.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        {!connectedDevice && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Before connecting:</AlertTitle>
            <AlertDescription>
              <ol className="mt-2 ml-4 list-decimal text-sm space-y-1">
                <li>Turn on your blood pressure monitor</li>
                <li>Enable Bluetooth/pairing mode on the device</li>
                <li>Keep the device within 3 feet of your computer</li>
                <li>Click "Scan for Devices" below</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Supported Devices */}
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-2">Supported Devices:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>• Omron Evolv</div>
            <div>• Omron M7 Intelli IT</div>
            <div>• A&D Medical</div>
            <div>• Beurer BM Series</div>
            <div>• Withings BPM</div>
            <div>• Most Bluetooth LE monitors</div>
          </div>
        </div>

        {/* Action Button */}
        {!connectedDevice && (
          <Button 
            onClick={handleScanAndConnect}
            disabled={isScanning}
            className="w-full"
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning for devices...
              </>
            ) : (
              <>
                <Bluetooth className="mr-2 h-4 w-4" />
                Scan for Devices
              </>
            )}
          </Button>
        )}

        {/* Platform Info */}
        <div className="text-xs text-center text-muted-foreground pt-2 border-t">
          {compatibility && compatibility.browser.isChrome && (
            <span className="flex items-center justify-center gap-1">
              <Monitor className="h-3 w-3" />
              Chrome Browser Detected - Full Support
            </span>
          )}
          {compatibility && compatibility.browser.isEdge && (
            <span className="flex items-center justify-center gap-1">
              <Monitor className="h-3 w-3" />
              Edge Browser Detected - Full Support
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, AlertCircle, CheckCircle2, XCircle, Wifi, Search } from 'lucide-react';

export default function BluetoothDiagnostic() {
  const [browserInfo, setBrowserInfo] = useState({});
  const [bluetoothSupport, setBluetoothSupport] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [detectedDevices, setDetectedDevices] = useState([]);
  const [connectionLog, setConnectionLog] = useState([]);

  useEffect(() => {
    checkBrowserSupport();
  }, []);

  const checkBrowserSupport = () => {
    const info = {
      userAgent: navigator.userAgent,
      browser: getBrowserName(),
      platform: navigator.platform,
      isSecureContext: window.isSecureContext,
      bluetoothAvailable: 'bluetooth' in navigator,
      permissions: 'permissions' in navigator
    };
    
    setBrowserInfo(info);
    setBluetoothSupport(info.bluetoothAvailable && info.isSecureContext);
    
    addLog(`Browser: ${info.browser}`);
    addLog(`Platform: ${info.platform}`);
    addLog(`Secure Context: ${info.isSecureContext ? 'Yes' : 'No'}`);
    addLog(`Bluetooth API: ${info.bluetoothAvailable ? 'Available' : 'Not Available'}`);
  };

  const getBrowserName = () => {
    const ua = navigator.userAgent;
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
    return 'Unknown';
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const scanForAllDevices = async () => {
    setIsScanning(true);
    setErrorMessage('');
    setScanResult(null);
    setDetectedDevices([]);
    
    try {
      addLog('Starting device scan...');
      
      // Request device with no filters to see all available devices
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'blood_pressure',           // Standard BP service
          0x1810,                     // BP service UUID as number
          0xFE4A,                     // Omron custom service
          'battery_service',          // Common service
          'device_information'        // Common service
        ]
      });
      
      addLog(`Device found: ${device.name || 'Unnamed'} (${device.id})`);
      
      setScanResult({
        success: true,
        device: {
          name: device.name || 'Unnamed Device',
          id: device.id
        }
      });
      
      // Try to connect and get more info
      try {
        addLog('Attempting to connect to device...');
        const server = await device.gatt.connect();
        addLog('Connected! Getting services...');
        
        const services = await server.getPrimaryServices();
        const serviceList = [];
        
        for (const service of services) {
          const serviceInfo = {
            uuid: service.uuid,
            name: getServiceName(service.uuid)
          };
          serviceList.push(serviceInfo);
          addLog(`Found service: ${serviceInfo.name} (${serviceInfo.uuid})`);
        }
        
        setScanResult(prev => ({
          ...prev,
          services: serviceList,
          connected: true
        }));
        
        // Disconnect after getting info
        await device.gatt.disconnect();
        addLog('Disconnected from device');
        
      } catch (connectError) {
        addLog(`Connection error: ${connectError.message}`);
      }
      
    } catch (error) {
      addLog(`Scan error: ${error.message}`);
      setErrorMessage(error.message);
      setScanResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsScanning(false);
    }
  };

  const scanForBPDevices = async () => {
    setIsScanning(true);
    setErrorMessage('');
    setScanResult(null);
    
    try {
      addLog('Scanning for blood pressure devices...');
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['blood_pressure'] },
          { services: [0x1810] },
          { services: [0xFE4A] }  // Omron
        ],
        optionalServices: ['blood_pressure', 0x1810, 0xFE4A, 'battery_service', 'device_information']
      });
      
      addLog(`BP Device found: ${device.name || 'Unnamed'} (${device.id})`);
      
      setScanResult({
        success: true,
        device: {
          name: device.name || 'Unnamed BP Device',
          id: device.id
        }
      });
      
      // Try to connect
      const server = await device.gatt.connect();
      addLog('Connected to BP device!');
      
      const services = await server.getPrimaryServices();
      const serviceList = services.map(s => ({
        uuid: s.uuid,
        name: getServiceName(s.uuid)
      }));
      
      setScanResult(prev => ({
        ...prev,
        services: serviceList,
        connected: true
      }));
      
      await device.gatt.disconnect();
      addLog('Disconnected from BP device');
      
    } catch (error) {
      addLog(`BP scan error: ${error.message}`);
      setErrorMessage(error.message);
      setScanResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getServiceName = (uuid) => {
    const serviceNames = {
      '0x1810': 'Blood Pressure Service',
      '00001810-0000-1000-8000-00805f9b34fb': 'Blood Pressure Service',
      '0xfe4a': 'Omron Custom Service',
      '0000fe4a-0000-1000-8000-00805f9b34fb': 'Omron Custom Service',
      'battery_service': 'Battery Service',
      'device_information': 'Device Information'
    };
    return serviceNames[uuid.toLowerCase()] || uuid;
  };

  const checkPermissions = async () => {
    if (!('permissions' in navigator)) {
      addLog('Permissions API not available');
      return;
    }
    
    try {
      const result = await navigator.permissions.query({ name: 'bluetooth' });
      addLog(`Bluetooth permission state: ${result.state}`);
      
      result.addEventListener('change', () => {
        addLog(`Permission state changed to: ${result.state}`);
      });
    } catch (error) {
      addLog(`Permission check error: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bluetooth className="h-6 w-6" />
            Bluetooth Diagnostic Tool
          </CardTitle>
          <CardDescription>
            Test Bluetooth connectivity and scan for blood pressure devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Browser Support Status */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Browser Support</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Browser:</span>
                <Badge variant={browserInfo.browser === 'Chrome' || browserInfo.browser === 'Edge' ? 'success' : 'secondary'}>
                  {browserInfo.browser}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Platform:</span>
                <Badge>{browserInfo.platform}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Secure Context:</span>
                {browserInfo.isSecureContext ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Bluetooth API:</span>
                {browserInfo.bluetoothAvailable ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
          </div>

          {/* Bluetooth Support Alert */}
          {bluetoothSupport === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Bluetooth Not Supported</AlertTitle>
              <AlertDescription>
                Your browser doesn't support Web Bluetooth. Please use Chrome or Edge on desktop/Android.
              </AlertDescription>
            </Alert>
          )}

          {bluetoothSupport === true && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Bluetooth Ready</AlertTitle>
              <AlertDescription>
                Your browser supports Bluetooth. You can scan for devices.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={checkPermissions}
              disabled={!bluetoothSupport}
              variant="outline"
            >
              Check Permissions
            </Button>
            <Button 
              onClick={scanForAllDevices}
              disabled={!bluetoothSupport || isScanning}
            >
              {isScanning ? (
                <>
                  <Search className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Scan All Devices
                </>
              )}
            </Button>
            <Button 
              onClick={scanForBPDevices}
              disabled={!bluetoothSupport || isScanning}
              variant="secondary"
            >
              {isScanning ? (
                <>
                  <Wifi className="mr-2 h-4 w-4 animate-pulse" />
                  Scanning BP...
                </>
              ) : (
                <>
                  <Wifi className="mr-2 h-4 w-4" />
                  Scan BP Devices Only
                </>
              )}
            </Button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Scan Results */}
          {scanResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {scanResult.success ? 'Device Found' : 'Scan Failed'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scanResult.success && (
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span> {scanResult.device.name}
                    </div>
                    <div>
                      <span className="font-medium">ID:</span> {scanResult.device.id}
                    </div>
                    {scanResult.connected && (
                      <Badge variant="success">Connected Successfully</Badge>
                    )}
                    {scanResult.services && (
                      <div>
                        <span className="font-medium">Services:</span>
                        <ul className="mt-1 space-y-1">
                          {scanResult.services.map((service, idx) => (
                            <li key={idx} className="text-sm">
                              • {service.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Connection Log */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connection Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 max-h-48 overflow-y-auto">
                {connectionLog.length > 0 ? (
                  <div className="space-y-1 font-mono text-xs">
                    {connectionLog.map((log, idx) => (
                      <div key={idx}>{log}</div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No logs yet...</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Troubleshooting Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Make sure your blood pressure cuff is turned ON</li>
                <li>• Put the cuff in pairing mode (usually holding the Bluetooth button)</li>
                <li>• Ensure the cuff is not connected to another device (phone app)</li>
                <li>• Try "Scan All Devices" first to see if your device appears</li>
                <li>• Check if the cuff LED is blinking (indicating pairing mode)</li>
                <li>• Make sure you're using Chrome or Edge browser</li>
                <li>• The site must be served over HTTPS (localhost is OK)</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Bluetooth, 
  BluetoothConnected,
  BluetoothOff,
  BluetoothSearching,
  Loader2,
  X
} from 'lucide-react';
import bluetoothBPService from '@/services/bluetoothBP';
import { formatDeviceInfo } from '@/utils/bluetoothParser';

export default function BluetoothStatus({ 
  onConnect, 
  onDisconnect,
  compact = false,
  showDeviceName = true 
}) {
  const [device, setDevice] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Check initial connection status
    updateDeviceStatus();

    // Set up event listeners
    const handleMeasurement = () => {
      setIsListening(true);
      setTimeout(() => setIsListening(false), 2000);
    };

    const handleDisconnection = () => {
      setDevice(null);
      if (onDisconnect) {
        onDisconnect();
      }
    };

    bluetoothBPService.addEventListener('measurement', handleMeasurement);
    bluetoothBPService.addEventListener('disconnected', handleDisconnection);

    return () => {
      bluetoothBPService.removeEventListener('measurement', handleMeasurement);
      bluetoothBPService.removeEventListener('disconnected', handleDisconnection);
    };
  }, [onDisconnect]);

  const updateDeviceStatus = () => {
    if (bluetoothBPService.isConnected()) {
      const deviceInfo = bluetoothBPService.getDeviceInfo();
      setDevice(formatDeviceInfo(deviceInfo));
    } else {
      setDevice(null);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const connectedDevice = await bluetoothBPService.connectToDevice();
      setDevice(formatDeviceInfo(connectedDevice));
      
      if (onConnect) {
        onConnect(connectedDevice);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await bluetoothBPService.disconnect();
      setDevice(null);
      
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Compact mode - just an icon/badge
  if (compact) {
    if (!device) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConnect}
                disabled={isConnecting}
                className="h-8 px-2"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BluetoothOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Connect Bluetooth Device</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Badge 
                variant={isListening ? "default" : "outline"} 
                className="h-7 px-2 text-xs"
              >
                {isListening ? (
                  <BluetoothSearching className="h-3 w-3 mr-1 animate-pulse" />
                ) : (
                  <BluetoothConnected className="h-3 w-3 mr-1" />
                )}
                {device.displayName}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">{device.displayName}</p>
              <p className="text-muted-foreground">{device.type}</p>
              <p className="text-muted-foreground">Click × to disconnect</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full mode - detailed status display
  if (!device) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
        <div className="flex items-center gap-3">
          <BluetoothOff className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No Device Connected</p>
            <p className="text-xs text-muted-foreground">
              Connect a Bluetooth blood pressure monitor
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Bluetooth className="mr-2 h-3 w-3" />
              Connect
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
      <div className="flex items-center gap-3">
        <div className="relative">
          {isListening ? (
            <BluetoothSearching className="h-5 w-5 text-green-600 animate-pulse" />
          ) : (
            <BluetoothConnected className="h-5 w-5 text-green-600" />
          )}
          {isListening && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-600 rounded-full animate-ping" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{device.displayName}</p>
            {device.compatibility === 'high' && (
              <Badge className="text-xs h-4 px-1 bg-green-100 text-green-800">
                Verified
              </Badge>
            )}
          </div>
          {showDeviceName && (
            <p className="text-xs text-muted-foreground">
              {isListening ? 'Receiving data...' : `${device.type} • Ready`}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDisconnect}
        className="text-muted-foreground hover:text-destructive"
      >
        Disconnect
      </Button>
    </div>
  );
}
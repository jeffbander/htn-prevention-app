import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Heart,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  BluetoothSearching
} from 'lucide-react';
import bluetoothBPService from '@/services/bluetoothBP';
import {
  formatMeasurement,
  validateBPReading,
  getHTNStatusColor,
  getHTNStatusIcon,
  parseMeasurementStatus,
  formatTimestamp
} from '@/utils/bluetoothParser';

export default function BluetoothReading({ 
  onSave, 
  onCancel,
  memberId,
  memberName,
  autoSave = false 
}) {
  const [currentReading, setCurrentReading] = useState(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [statusMessages, setStatusMessages] = useState([]);
  const [readingHistory, setReadingHistory] = useState([]);

  useEffect(() => {
    // Set up measurement listener
    const handleMeasurement = (measurement) => {
      console.log('Received measurement:', measurement);
      
      // Format the measurement
      const formatted = formatMeasurement(measurement);
      
      // Validate the reading
      const validation = validateBPReading(
        measurement.systolic,
        measurement.diastolic,
        measurement.heartRate
      );
      
      // Parse status messages if available
      const messages = measurement.status ? 
        parseMeasurementStatus(measurement.status) : [];
      
      setCurrentReading({
        ...formatted,
        raw: measurement,
        isValid: validation.isValid,
        validationErrors: validation.errors
      });
      
      setStatusMessages(messages);
      setIsWaiting(false);
      
      // Add to history
      setReadingHistory(prev => [...prev, formatted]);
      
      // Auto-save if enabled and valid
      if (autoSave && validation.isValid && onSave) {
        setTimeout(() => {
          onSave(measurement);
        }, 2000); // Give user 2 seconds to review
      }
    };

    bluetoothBPService.addEventListener('measurement', handleMeasurement);

    return () => {
      bluetoothBPService.removeEventListener('measurement', handleMeasurement);
    };
  }, [autoSave, onSave]);

  const handleSave = () => {
    if (currentReading && currentReading.isValid && onSave) {
      onSave(currentReading.raw);
    }
  };

  const handleRetry = () => {
    setCurrentReading(null);
    setIsWaiting(true);
    setStatusMessages([]);
  };

  // Waiting for measurement
  if (isWaiting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BluetoothSearching className="h-5 w-5 animate-pulse" />
            Waiting for Measurement
          </CardTitle>
          <CardDescription>
            Take a blood pressure reading on your connected device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center py-8">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-muted animate-pulse" />
              <Heart className="h-10 w-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground animate-pulse" />
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ol className="ml-4 mt-1 list-decimal text-sm space-y-1">
                <li>Sit comfortably with your back supported</li>
                <li>Place your arm at heart level</li>
                <li>Press the START button on your monitor</li>
                <li>Remain still during measurement</li>
              </ol>
            </AlertDescription>
          </Alert>

          {memberName && (
            <div className="text-center text-sm text-muted-foreground">
              Reading for: <span className="font-medium">{memberName}</span>
            </div>
          )}

          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Display measurement
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Blood Pressure Reading
          </span>
          <Badge className={getHTNStatusColor(currentReading.htnStatus)}>
            {getHTNStatusIcon(currentReading.htnStatus)} {currentReading.htnStatus}
          </Badge>
        </CardTitle>
        <CardDescription>
          Received from Bluetooth device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Reading Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Systolic</p>
            <p className="text-3xl font-bold">{currentReading.systolic}</p>
            <p className="text-xs text-muted-foreground">mmHg</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Diastolic</p>
            <p className="text-3xl font-bold">{currentReading.diastolic}</p>
            <p className="text-xs text-muted-foreground">mmHg</p>
          </div>
        </div>

        {/* Heart Rate if available */}
        {currentReading.heartRate && (
          <>
            <Separator />
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm">Heart Rate</span>
              </div>
              <span className="font-semibold">{currentReading.heartRate}</span>
            </div>
          </>
        )}

        {/* Timestamp */}
        <Separator />
        <div className="flex items-center justify-between px-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Measured</span>
          </div>
          <span className="text-muted-foreground">
            {currentReading.formattedTime}
          </span>
        </div>

        {/* Member Info */}
        {memberName && (
          <>
            <Separator />
            <div className="px-4 text-sm">
              <span className="text-muted-foreground">Patient: </span>
              <span className="font-medium">{memberName}</span>
            </div>
          </>
        )}

        {/* Status Messages */}
        {statusMessages.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              {statusMessages.map((msg, index) => (
                <Alert key={index} variant={msg.type === 'error' ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{msg.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </>
        )}

        {/* Validation Errors */}
        {!currentReading.isValid && currentReading.validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">Invalid Reading:</p>
              <ul className="list-disc ml-4 text-sm">
                {currentReading.validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {currentReading.isValid ? (
            <>
              <Button
                onClick={handleSave}
                disabled={!memberId}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Reading
              </Button>
              <Button
                variant="outline"
                onClick={handleRetry}
                className="flex-1"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Take Another
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleRetry}
                className="flex-1"
              >
                Try Again
              </Button>
              {onCancel && (
                <Button
                  variant="ghost"
                  onClick={onCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </>
          )}
        </div>

        {/* Auto-save indicator */}
        {autoSave && currentReading.isValid && (
          <div className="text-center text-xs text-muted-foreground">
            <CheckCircle className="inline h-3 w-3 mr-1" />
            Auto-saving in 2 seconds...
          </div>
        )}

        {/* History (if multiple readings) */}
        {readingHistory.length > 1 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold">Previous Readings</p>
              {readingHistory.slice(0, -1).reverse().map((reading, index) => (
                <div key={index} className="flex justify-between text-sm p-2 border rounded">
                  <span>{reading.bloodPressure} mmHg</span>
                  <span className="text-muted-foreground">
                    {formatTimestamp(reading.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
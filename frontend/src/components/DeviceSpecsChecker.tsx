import React, { useEffect, useState } from 'react';
import { Device, DeviceInfo } from '@capacitor/device';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface SpecStatus {
  meetsMin: boolean;
  meetsRec: boolean;
  value: string;
}

export const DeviceSpecsChecker = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [networkStatus, setNetworkStatus] = useState<ConnectionStatus | null>(null);
  const [cameraExists, setCameraExists] = useState<boolean | null>(null);
  const [ramStatus, setRamStatus] = useState<SpecStatus | null>(null);
  const [osStatus, setOsStatus] = useState<SpecStatus | null>(null);
  const [storageStatus, setStorageStatus] = useState<SpecStatus | null>(null);

  useEffect(() => {
    const fetchSpecs = async () => {
      // 1. Get basic device info (OS version, etc.)
      const info = await Device.getInfo();
      setDeviceInfo(info);
      
      // Evaluate OS Version
      const isAndroid = info.platform === 'android';
      const isIOS = info.platform === 'ios';
      const osVer = parseFloat(info.osVersion);
      
      let osMeetsMin = false;
      let osMeetsRec = false;
      
      if (isAndroid) {
        osMeetsMin = osVer >= 8.0;
        osMeetsRec = osVer >= 11.0;
      } else if (isIOS) {
        osMeetsMin = osVer >= 14.0;
        osMeetsRec = osVer >= 16.0;
      } else {
        // web fallback
        osMeetsMin = true;
        osMeetsRec = true; 
      }
      setOsStatus({ meetsMin: osMeetsMin, meetsRec: osMeetsRec, value: `${info.platform === 'web' ? 'Web Browser' : info.platform} ${info.osVersion}` });

      // 2. Get RAM (Web API fallback for now, as Capacitor core doesn't expose total RAM directly without custom plugins)
      // @ts-ignore
      const deviceMemory = navigator.deviceMemory; 
      if (deviceMemory) {
        const memGB = parseFloat(deviceMemory);
        setRamStatus({
          meetsMin: memGB >= 2,
          meetsRec: memGB >= 4,
          value: `${memGB} GB+`
        });
      } else {
        setRamStatus({ meetsMin: true, meetsRec: false, value: 'Unknown (Assume 2GB+)' });
      }

      // 3. Get Network Status
      const netStatus = await Network.getStatus();
      setNetworkStatus(netStatus);

      // 4. Check for Camera presence
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(d => d.kind === 'videoinput');
          setCameraExists(hasCamera);
        } else {
          setCameraExists(false);
        }
      } catch (e) {
        setCameraExists(false);
      }
      
      // 5. Storage estimation (Web API)
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const quotaMB = estimate.quota ? estimate.quota / (1024 * 1024) : 0;
        setStorageStatus({
           meetsMin: quotaMB > 100,
           meetsRec: quotaMB > 500,
           value: quotaMB > 0 ? `${Math.round(quotaMB)} MB available quota` : 'Unknown'
        });
      }
    };

    fetchSpecs();
  }, []);

  const StatusIcon = ({ status }: { status?: SpecStatus | null }) => {
    if (!status) return <HelpCircle className="w-5 h-5 text-gray-400 inline mr-2" />;
    if (status.meetsRec) return <CheckCircle2 className="w-5 h-5 text-green-500 inline mr-2" />;
    if (status.meetsMin) return <CheckCircle2 className="w-5 h-5 text-yellow-500 inline mr-2" />;
    return <XCircle className="w-5 h-5 text-red-500 inline mr-2" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Device Capability Check</CardTitle>
        <CardDescription>Validating specs against application requirements.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
           {/* Render OS Status */}
           <div className="flex items-center justify-between border-b pb-2">
             <div>
               <p className="font-semibold text-sm">Operating System</p>
               <p className="text-xs text-muted-foreground">Min: Android 8+ / iOS 14+ | Rec: Android 11+ / iOS 16+</p>
             </div>
             <div className="flex items-center text-sm">
               <StatusIcon status={osStatus} />
               <span>{osStatus?.value || '...'}</span>
             </div>
           </div>
           
           {/* Render RAM */}
           <div className="flex items-center justify-between border-b pb-2">
             <div>
               <p className="font-semibold text-sm">RAM</p>
               <p className="text-xs text-muted-foreground">Min: 2 GB | Rec: 4 GB</p>
             </div>
             <div className="flex items-center text-sm">
               <StatusIcon status={ramStatus} />
               <span>{ramStatus?.value || '...'}</span>
             </div>
           </div>

           {/* Render Camera */}
           <div className="flex items-center justify-between border-b pb-2">
             <div>
               <p className="font-semibold text-sm">Camera</p>
               <p className="text-xs text-muted-foreground">Min: 13 MP Rear | Rec: 30 MP (Resolution check simulated)</p>
             </div>
             <div className="flex items-center text-sm">
               {cameraExists === null ? <span className="text-gray-400">Loading...</span> : 
                cameraExists ? <CheckCircle2 className="w-5 h-5 text-green-500 inline mr-2" /> : <XCircle className="w-5 h-5 text-red-500 inline mr-2" />
               }
               <span>{cameraExists ? 'Camera Detected' : 'No Camera'}</span>
             </div>
           </div>
           
           {/* Render Network */}
           <div className="flex items-center justify-between border-b pb-2">
             <div>
               <p className="font-semibold text-sm">Internet</p>
               <p className="text-xs text-muted-foreground">Min: 3G | Rec: 4G LTE or Wi-Fi</p>
             </div>
             <div className="flex items-center text-sm">
               {networkStatus?.connected ? <CheckCircle2 className="w-5 h-5 text-green-500 inline mr-2" /> : <XCircle className="w-5 h-5 text-red-500 inline mr-2" />}
               <span>{networkStatus ? `${networkStatus.connectionType} (${networkStatus.connected ? 'Connected' : 'Offline'})` : '...'}</span>
             </div>
           </div>
           
           {/* Render Storage */}
           <div className="flex items-center justify-between">
             <div>
               <p className="font-semibold text-sm">Storage</p>
               <p className="text-xs text-muted-foreground">Min: 100 MB free | Rec: 500 MB free</p>
             </div>
             <div className="flex items-center text-sm">
               <StatusIcon status={storageStatus} />
               <span>{storageStatus?.value || '...'}</span>
             </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
};

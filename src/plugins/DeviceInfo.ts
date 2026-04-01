import { registerPlugin } from '@capacitor/core';

export interface MemoryInfo {
    totalMB: number;
    availableMB: number;
    usedMB: number;
    usagePercent: number;
    isLowMemory: boolean;
}

export interface StorageInfo {
    totalGB: number;
    usedGB: number;
    freeGB: number;
    usagePercent: number;
}

export interface BatteryInfo {
    temperatureC: number;
    batteryPercent: number;
    isCharging: boolean;
    thermalStatus: 'normal' | 'warm' | 'high' | 'critical';
}

export interface DeviceDetails {
    manufacturer: string;
    model: string;
    brand: string;
    device: string;
    androidVersion: string;
    sdkVersion: number;
    cpuCores: number;
    cpuArch: string;
}

export interface AllDeviceInfo {
    memory: {
        totalMB: number;
        availableMB: number;
        usedMB: number;
        usagePercent: number;
    };
    battery: {
        temperatureC: number;
        percent: number;
    };
    device: {
        manufacturer: string;
        model: string;
        cpuCores: number;
        androidVersion: string;
    };
}

export interface DeviceInfoPlugin {
    getMemoryInfo(): Promise<MemoryInfo>;
    getStorageInfo(): Promise<StorageInfo>;
    getBatteryTemperature(): Promise<BatteryInfo>;
    getDeviceDetails(): Promise<DeviceDetails>;
    getAllInfo(): Promise<AllDeviceInfo>;
}

const DeviceInfo = registerPlugin<DeviceInfoPlugin>('DeviceInfo');

export default DeviceInfo;

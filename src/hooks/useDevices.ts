import { useState, useCallback } from 'react';
import { Device, LogEntry } from '@/types/device';

const STORAGE_KEY = 'aws_devices';
const LOGS_KEY = 'aws_logs';

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (key === STORAGE_KEY) {
        return parsed.map((d: Device) => ({
          ...d,
          createdAt: new Date(d.createdAt)
        })) as T;
      }
      if (key === LOGS_KEY) {
        return parsed.map((l: LogEntry) => ({
          ...l,
          timestamp: new Date(l.timestamp)
        })) as T;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading from storage:', e);
  }
  return defaultValue;
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
};

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>(() => 
    loadFromStorage<Device[]>(STORAGE_KEY, [])
  );
  const [logs, setLogs] = useState<LogEntry[]>(() => 
    loadFromStorage<LogEntry[]>(LOGS_KEY, [])
  );

  const addDevice = useCallback((name: string, barcode: string): { success: boolean; message: string } => {
    const normalizedBarcode = barcode.toUpperCase().trim();
    
    if (!name.trim() || !normalizedBarcode) {
      return { success: false, message: 'Nome e código de barras são obrigatórios' };
    }
    
    const exists = devices.some(d => d.barcode === normalizedBarcode);
    if (exists) {
      return { success: false, message: `Código "${normalizedBarcode}" já existe!` };
    }

    const newDevice: Device = {
      id: crypto.randomUUID(),
      name: name.trim(),
      barcode: normalizedBarcode,
      status: 'disponivel',
      currentOwner: null,
      createdAt: new Date()
    };

    const updated = [...devices, newDevice];
    setDevices(updated);
    saveToStorage(STORAGE_KEY, updated);
    
    return { success: true, message: `Coletor "${name}" cadastrado com sucesso!` };
  }, [devices]);

  const removeDevice = useCallback((id: string): { success: boolean; message: string } => {
    const device = devices.find(d => d.id === id);
    if (!device) {
      return { success: false, message: 'Dispositivo não encontrado' };
    }
    if (device.status === 'emprestado') {
      return { success: false, message: 'Não é possível remover um dispositivo emprestado' };
    }

    const updated = devices.filter(d => d.id !== id);
    setDevices(updated);
    saveToStorage(STORAGE_KEY, updated);
    
    return { success: true, message: `Coletor "${device.name}" removido!` };
  }, [devices]);

  const scanDevice = useCallback((barcode: string, ownerName?: string): { 
    success: boolean; 
    message: string; 
    needsOwner?: boolean;
    device?: Device;
  } => {
    const normalizedBarcode = barcode.toUpperCase().trim();
    const device = devices.find(d => d.barcode === normalizedBarcode);

    if (!device) {
      return { success: false, message: `Código "${normalizedBarcode}" não encontrado!` };
    }

    const now = new Date();

    if (device.status === 'disponivel') {
      if (!ownerName?.trim()) {
        return { success: false, message: '', needsOwner: true, device };
      }

      const updatedDevices = devices.map(d => 
        d.id === device.id 
          ? { ...d, status: 'emprestado' as const, currentOwner: ownerName.trim() }
          : d
      );
      setDevices(updatedDevices);
      saveToStorage(STORAGE_KEY, updatedDevices);

      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        deviceName: device.name,
        action: 'SAÍDA',
        owner: ownerName.trim(),
        timestamp: now
      };
      const updatedLogs = [newLog, ...logs].slice(0, 100);
      setLogs(updatedLogs);
      saveToStorage(LOGS_KEY, updatedLogs);

      return { success: true, message: `SAÍDA: ${device.name} → ${ownerName.trim()}` };
    } else {
      const previousOwner = device.currentOwner || 'Desconhecido';
      
      const updatedDevices = devices.map(d => 
        d.id === device.id 
          ? { ...d, status: 'disponivel' as const, currentOwner: null }
          : d
      );
      setDevices(updatedDevices);
      saveToStorage(STORAGE_KEY, updatedDevices);

      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        deviceName: device.name,
        action: 'DEVOLUÇÃO',
        owner: previousOwner,
        timestamp: now
      };
      const updatedLogs = [newLog, ...logs].slice(0, 100);
      setLogs(updatedLogs);
      saveToStorage(LOGS_KEY, updatedLogs);

      return { success: true, message: `DEVOLVIDO: ${device.name} ← ${previousOwner}` };
    }
  }, [devices, logs]);

  const getStats = useCallback(() => {
    const total = devices.length;
    const emprestados = devices.filter(d => d.status === 'emprestado').length;
    const disponiveis = total - emprestados;
    return { total, emprestados, disponiveis };
  }, [devices]);

  return {
    devices,
    logs,
    addDevice,
    removeDevice,
    scanDevice,
    getStats
  };
};

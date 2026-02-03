import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Package, Sparkles, Users, CheckCircle, Clock, 
  ArrowUpRight, ArrowDownLeft, Trash2, User, 
  Scan, Send, Plus, X, XCircle, Info, Search, History,
  LayoutGrid, List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

// ==================== TYPES ====================
interface Device {
  id: string;
  name: string;
  barcode: string;
  status: 'disponivel' | 'emprestado';
  currentOwner: string | null;
  createdAt: Date;
}

interface LogEntry {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceBarcode: string;
  action: 'SAÍDA' | 'DEVOLUÇÃO';
  owner: string;
  timestamp: Date;
  sector?: string;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

// ==================== STORAGE ====================
const STORAGE_KEY = 'zonacriativa_devices';
const LOGS_KEY = 'zonacriativa_logs';

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
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

const saveToStorage = <T,>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
};

// ==================== HOOK ====================
const useDevices = () => {
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
        deviceId: device.id,
        deviceName: device.name,
        deviceBarcode: device.barcode,
        action: 'SAÍDA',
        owner: ownerName.trim(),
        timestamp: now
      };
      const updatedLogs = [newLog, ...logs].slice(0, 500);
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
        deviceId: device.id,
        deviceName: device.name,
        deviceBarcode: device.barcode,
        action: 'DEVOLUÇÃO',
        owner: previousOwner,
        timestamp: now
      };
      const updatedLogs = [newLog, ...logs].slice(0, 500);
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

  return { devices, logs, addDevice, removeDevice, scanDevice, getStats };
};

// ==================== COMPONENTS ====================

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, variant }: {
  icon: React.ElementType;
  label: string;
  value: number;
  variant: 'default' | 'success' | 'destructive';
}) => {
  const variants = {
    default: 'bg-card border-border text-foreground',
    success: 'bg-success/5 border-success/20 text-success',
    destructive: 'bg-destructive/5 border-destructive/20 text-destructive'
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm transition-all hover:scale-105",
      variants[variant]
    )}>
      <Icon className="w-5 h-5" />
      <div>
        <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
        <div className="text-xl font-mono font-bold">{value}</div>
      </div>
    </div>
  );
};

// Header
const Header = ({ total, emprestados }: { total: number; emprestados: number }) => {
  const disponivel = total - emprestados;
  
  return (
    <header className="bg-card/50 backdrop-blur-md border-b border-border sticky top-0 z-40">
      <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-4">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-black text-xl tracking-wide">
                <span className="text-foreground">Zona</span>
                <span className="neon-text-cyan">Criativa</span>
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Controle de Equipamentos</p>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <StatsCard icon={Package} label="Total" value={total} variant="default" />
            <StatsCard icon={CheckCircle} label="Disponíveis" value={disponivel} variant="success" />
            <StatsCard icon={Users} label="Em Uso" value={emprestados} variant="destructive" />
          </div>
        </div>
      </div>
    </header>
  );
};

// Notification
const Notification = ({ message, type, onClose }: NotificationState & { onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = { success: CheckCircle, error: XCircle, info: Info };
  const Icon = icons[type];

  return (
    <div className={cn(
      "fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl",
      "animate-in slide-in-from-right-4 fade-in duration-300 max-w-sm",
      type === 'success' && "bg-success text-success-foreground",
      type === 'error' && "bg-destructive text-destructive-foreground",
      type === 'info' && "bg-primary text-primary-foreground"
    )}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Compact Device Card for Grid View (otimizado para 100+ dispositivos)
const DeviceCard = ({ device, onRemove, compact = false }: { 
  device: Device; 
  onRemove?: (id: string) => void;
  compact?: boolean;
}) => {
  const isAvailable = device.status === 'disponivel';

  if (compact) {
    return (
      <div className={cn(
        "relative border rounded-xl p-3 transition-all duration-200 group hover:shadow-lg",
        isAvailable 
          ? "border-success/20 bg-success/5 hover:border-success/40" 
          : "border-destructive/20 bg-destructive/5 hover:border-destructive/40"
      )}>
        {onRemove && isAvailable && (
          <button
            onClick={() => onRemove(device.id)}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-lg"
            title="Remover"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            isAvailable ? "bg-success/20" : "bg-destructive/20"
          )}>
            <Package className={cn("w-4 h-4", isAvailable ? "text-success" : "text-destructive")} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{device.name}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{device.barcode}</div>
          </div>

          {!isAvailable && device.currentOwner && (
            <div className="text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded-full truncate max-w-[80px]">
              {device.currentOwner}
            </div>
          )}
          
          {isAvailable && (
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative border rounded-2xl p-4 transition-all duration-200 group hover:shadow-xl hover:scale-[1.02]",
      isAvailable 
        ? "border-success/20 bg-gradient-to-br from-success/10 to-success/5 hover:border-success/40" 
        : "border-destructive/20 bg-gradient-to-br from-destructive/10 to-destructive/5 hover:border-destructive/40"
    )}>
      {onRemove && isAvailable && (
        <button
          onClick={() => onRemove(device.id)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg bg-destructive/20 hover:bg-destructive text-destructive hover:text-destructive-foreground"
          title="Remover equipamento"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-col">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
          isAvailable ? "bg-success/20" : "bg-destructive/20"
        )}>
          <Package className={cn("w-5 h-5", isAvailable ? "text-success" : "text-destructive")} />
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-mono text-muted-foreground tracking-wider bg-muted/50 px-2 py-0.5 rounded inline-block">
            {device.barcode}
          </div>
          <div className="font-semibold text-sm truncate">{device.name}</div>
        </div>

        {isAvailable ? (
          <div className="flex items-center gap-2 mt-3 text-xs font-medium text-success">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Disponível
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3 text-xs text-destructive">
            <User className="w-3 h-3" />
            <span className="truncate font-medium">{device.currentOwner}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ScanInput
const ScanInput = ({ onScan, onNotification }: {
  onScan: (barcode: string, owner?: string) => { success: boolean; message: string; needsOwner?: boolean; device?: Device };
  onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}) => {
  const [barcode, setBarcode] = useState('');
  const [pendingDevice, setPendingDevice] = useState<Device | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const handleScan = () => {
    if (!barcode.trim()) return;
    const result = onScan(barcode, undefined);
    
    if (result.needsOwner && result.device) {
      setPendingDevice(result.device);
      setTimeout(() => ownerRef.current?.focus(), 100);
    } else {
      if (result.success) {
        onNotification(result.message, result.message.includes('DEVOLVIDO') ? 'info' : 'success');
      } else if (result.message) {
        onNotification(result.message, 'error');
      }
      setBarcode('');
      barcodeRef.current?.focus();
    }
  };

  const handleCheckout = () => {
    if (!pendingDevice || !ownerName.trim()) return;
    const result = onScan(pendingDevice.barcode, ownerName);
    onNotification(result.message, result.success ? 'success' : 'error');
    setBarcode(''); setOwnerName(''); setPendingDevice(null);
    barcodeRef.current?.focus();
  };

  const cancelCheckout = () => {
    setPendingDevice(null); setOwnerName(''); setBarcode('');
    barcodeRef.current?.focus();
  };

  if (pendingDevice) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-sm">Registrar Empréstimo</span>
            <p className="text-[10px] text-muted-foreground">Informe o responsável</p>
          </div>
        </div>
        
        <div className="bg-card/50 rounded-lg p-3 mb-4 border border-border/50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{pendingDevice.name}</span>
            <span className="text-[10px] font-mono text-muted-foreground ml-auto">{pendingDevice.barcode}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Input ref={ownerRef} value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
            placeholder="Nome do responsável" className="flex-1 h-10 bg-input border-border focus:border-primary rounded-lg text-sm" />
          <Button onClick={handleCheckout} size="sm" className="bg-success hover:bg-success/90 text-success-foreground rounded-lg px-4 h-10">
            <Send className="w-4 h-4" />
          </Button>
          <Button onClick={cancelCheckout} size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg h-10">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
          <Scan className="w-4 h-4 text-primary" />
        </div>
        <div>
          <span className="font-semibold text-sm">Escanear Código</span>
          <p className="text-[10px] text-muted-foreground">Empréstimo ou devolução automática</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input ref={barcodeRef} value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="Digite ou escaneie o código..." className="flex-1 h-10 bg-input border-border focus:border-primary font-mono uppercase rounded-lg text-sm" />
        <Button onClick={handleScan} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-5 h-10">
          <Scan className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// AddDeviceForm
const AddDeviceForm = ({ onAdd, onNotification }: {
  onAdd: (name: string, barcode: string) => { success: boolean; message: string };
  onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}) => {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onAdd(name, barcode);
    if (result.success) {
      onNotification(result.message, 'success');
      setName(''); setBarcode(''); setIsOpen(false);
    } else {
      onNotification(result.message, 'error');
    }
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline"
        className="w-full h-full min-h-[120px] border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary rounded-2xl transition-all group">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">Adicionar Equipamento</span>
        </div>
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center">
          <Package className="w-4 h-4 text-success" />
        </div>
        <div>
          <span className="font-semibold text-sm">Novo Equipamento</span>
          <p className="text-[10px] text-muted-foreground">Cadastrar no sistema</p>
        </div>
      </div>
      <div className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do equipamento"
          className="h-10 bg-input border-border focus:border-primary rounded-lg text-sm" />
        <Input value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())} placeholder="Código de barras"
          className="h-10 bg-input border-border focus:border-primary font-mono uppercase rounded-lg text-sm" />
        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" className="flex-1 bg-success hover:bg-success/90 text-success-foreground rounded-lg h-9">
            <Plus className="w-4 h-4 mr-1.5" />Cadastrar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setIsOpen(false)} className="rounded-lg h-9">
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
};

// Log Entry Component - Mais profissional
const LogEntryItem = ({ log }: { log: LogEntry }) => {
  const isSaida = log.action === 'SAÍDA';
  
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50",
      isSaida ? "bg-destructive/5" : "bg-success/5"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        isSaida ? "bg-destructive/20" : "bg-success/20"
      )}>
        {isSaida ? (
          <ArrowUpRight className="w-4 h-4 text-destructive" />
        ) : (
          <ArrowDownLeft className="w-4 h-4 text-success" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isSaida ? "text-destructive" : "text-success"
          )}>
            {log.action}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {format(log.timestamp, "dd/MM/yy HH:mm:ss", { locale: ptBR })}
          </span>
        </div>
        
        <div className="text-sm font-medium text-foreground truncate">
          {log.deviceName}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {log.deviceBarcode}
          </span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">{log.owner}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// LogsSidebar - Redesenhado
const LogsSidebar = ({ logs }: { logs: LogEntry[] }) => {
  const [filter, setFilter] = useState<'all' | 'SAÍDA' | 'DEVOLUÇÃO'>('all');
  
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(l => l.action === filter);

  const todayLogs = filteredLogs.filter(l => {
    const today = new Date();
    return l.timestamp.toDateString() === today.toDateString();
  });

  return (
    <aside className="w-80 bg-card/50 backdrop-blur-sm border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Histórico de Movimentações</h3>
          </div>
          <span className="text-[10px] bg-muted px-2 py-1 rounded-full font-mono">
            {logs.length}
          </span>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-colors",
              filter === 'all' 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Todos ({logs.length})
          </button>
          <button
            onClick={() => setFilter('SAÍDA')}
            className={cn(
              "flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-colors",
              filter === 'SAÍDA' 
                ? "bg-destructive text-destructive-foreground" 
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Saídas
          </button>
          <button
            onClick={() => setFilter('DEVOLUÇÃO')}
            className={cn(
              "flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-colors",
              filter === 'DEVOLUÇÃO' 
                ? "bg-success text-success-foreground" 
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Devoluções
          </button>
        </div>
      </div>
      
      {todayLogs.length > 0 && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Hoje — {todayLogs.length} {todayLogs.length === 1 ? 'movimentação' : 'movimentações'}
          </span>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhuma movimentação</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <LogEntryItem key={log.id} log={log} />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

// ==================== MAIN PAGE ====================
const Index = () => {
  const { devices, logs, addDevice, removeDevice, scanDevice, getStats } = useDevices();
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('compact');

  const stats = getStats();

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
  }, []);

  const handleRemove = useCallback((id: string) => {
    const result = removeDevice(id);
    showNotification(result.message, result.success ? 'success' : 'error');
  }, [removeDevice, showNotification]);

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    d.barcode.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (d.currentOwner?.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const availableDevices = filteredDevices.filter(d => d.status === 'disponivel');
  const borrowedDevices = filteredDevices.filter(d => d.status === 'emprestado');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
      
      <Header total={stats.total} emprestados={stats.emprestados} />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Actions Bar */}
          <div className="border-b border-border bg-card/30">
            <div className="max-w-[1800px] mx-auto p-4 lg:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ScanInput onScan={scanDevice} onNotification={showNotification} />
                <AddDeviceForm onAdd={addDevice} onNotification={showNotification} />
              </div>
              
              {/* Search and View Toggle */}
              <div className="flex items-center gap-3 mt-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome, código ou responsável..."
                    value={searchFilter} 
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full h-10 bg-input border border-border rounded-lg pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" 
                  />
                </div>
                
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('compact')}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      viewMode === 'compact' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Visualização compacta"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      viewMode === 'grid' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Visualização em grade"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
                
                {devices.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {filteredDevices.length} de {devices.length} equipamentos
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Device Grid */}
          <ScrollArea className="flex-1">
            <div className="max-w-[1800px] mx-auto p-4 lg:p-5">
              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-5">
                    <Package className="w-10 h-10 opacity-30" />
                  </div>
                  <h2 className="font-semibold text-lg mb-2 text-foreground">Nenhum Equipamento</h2>
                  <p className="text-sm text-center max-w-md">
                    Adicione equipamentos para começar a controlar empréstimos e devoluções.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {borrowedDevices.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive">
                          Em Uso ({borrowedDevices.length})
                        </h2>
                      </div>
                      <div className={cn(
                        "grid gap-3",
                        viewMode === 'compact' 
                          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
                      )}>
                        {borrowedDevices.map(device => (
                          <DeviceCard key={device.id} device={device} compact={viewMode === 'compact'} />
                        ))}
                      </div>
                    </section>
                  )}

                  {availableDevices.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-success" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-success">
                          Disponíveis ({availableDevices.length})
                        </h2>
                      </div>
                      <div className={cn(
                        "grid gap-3",
                        viewMode === 'compact' 
                          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8"
                      )}>
                        {availableDevices.map(device => (
                          <DeviceCard key={device.id} device={device} onRemove={handleRemove} compact={viewMode === 'compact'} />
                        ))}
                      </div>
                    </section>
                  )}

                  {filteredDevices.length === 0 && devices.length > 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum resultado para "{searchFilter}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>

        <div className="hidden xl:flex">
          <LogsSidebar logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default Index;

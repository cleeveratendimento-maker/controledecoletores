import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Package, ScanBarcode, Users, CheckCircle, Clock, 
  ArrowUpRight, ArrowDownLeft, Trash2, User, 
  Scan, Send, Plus, X, XCircle, Info, Search, History,
  LayoutGrid, List, Activity, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

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

// Stats Card Component - Enhanced
const StatsCard = ({ icon: Icon, label, value, variant }: {
  icon: React.ElementType;
  label: string;
  value: number;
  variant: 'default' | 'success' | 'destructive';
}) => {
  const variants = {
    default: 'bg-secondary border-border/50 text-foreground',
    success: 'bg-success/8 border-success/25 text-success',
    destructive: 'bg-destructive/8 border-destructive/25 text-destructive'
  };

  const iconBg = {
    default: 'bg-muted',
    success: 'bg-success/15',
    destructive: 'bg-destructive/15'
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-sm stats-glow",
        variants[variant]
      )}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg[variant])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.15em] opacity-60 font-medium">{label}</div>
        <div className="text-2xl font-mono font-bold tracking-tight">{value}</div>
      </div>
    </motion.div>
  );
};

// Header - Enhanced
const Header = ({ total, emprestados }: { total: number; emprestados: number }) => {
  const disponivel = total - emprestados;
  
  return (
    <header className="bg-card/60 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40">
      <div className="max-w-[1800px] mx-auto px-5 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-lg shadow-primary/25"
            >
              <ScanBarcode className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="font-display font-extrabold text-2xl tracking-wide">
                <span className="text-foreground">Zona</span>
                <span className="neon-text-cyan">Criativa</span>
              </h1>
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Controle de Equipamentos</p>
            </div>
          </div>

          <div className="flex gap-3">
            <StatsCard icon={Package} label="Total" value={total} variant="default" />
            <StatsCard icon={CheckCircle} label="Disponíveis" value={disponivel} variant="success" />
            <StatsCard icon={Users} label="Em Uso" value={emprestados} variant="destructive" />
          </div>
        </div>
      </div>
    </header>
  );
};

// Notification - Enhanced
const Notification = ({ message, type, onClose }: NotificationState & { onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = { success: CheckCircle, error: XCircle, info: Info };
  const Icon = icons[type];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={cn(
        "fixed top-24 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl max-w-sm backdrop-blur-sm border",
        type === 'success' && "bg-success/90 text-success-foreground border-success/50",
        type === 'error' && "bg-destructive/90 text-destructive-foreground border-destructive/50",
        type === 'info' && "bg-primary/90 text-primary-foreground border-primary/50"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-semibold flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Device Card - Enhanced with glow
const DeviceCard = ({ device, onRemove, compact = false }: { 
  device: Device; 
  onRemove?: (id: string) => void;
  compact?: boolean;
}) => {
  const isAvailable = device.status === 'disponivel';

  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        className={cn(
          "relative border rounded-xl p-4 transition-all duration-200 group",
          isAvailable 
            ? "border-success/20 bg-success/5 device-card-available" 
            : "border-destructive/20 bg-destructive/5 device-card-borrowed"
        )}
      >
        {onRemove && isAvailable && (
          <button
            onClick={() => onRemove(device.id)}
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-full bg-destructive text-destructive-foreground shadow-lg"
            title="Remover"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isAvailable ? "bg-success/15" : "bg-destructive/15"
          )}>
            <ScanBarcode className={cn("w-5 h-5", isAvailable ? "text-success" : "text-destructive")} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{device.name}</div>
            <div className="text-[11px] font-mono text-muted-foreground tracking-wide">{device.barcode}</div>
          </div>

          {!isAvailable && device.currentOwner && (
            <div className="text-[11px] text-destructive bg-destructive/10 px-2.5 py-1 rounded-full truncate max-w-[90px] font-medium">
              {device.currentOwner}
            </div>
          )}
          
          {isAvailable && (
            <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shrink-0 shadow-[0_0_8px_hsl(160_80%_45%/0.6)]" />
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative border rounded-2xl p-5 transition-all duration-300 group",
        isAvailable 
          ? "border-success/20 bg-gradient-to-br from-success/10 to-success/3 device-card-available" 
          : "border-destructive/20 bg-gradient-to-br from-destructive/10 to-destructive/3 device-card-borrowed"
      )}
    >
      {onRemove && isAvailable && (
        <button
          onClick={() => onRemove(device.id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-xl bg-destructive/20 hover:bg-destructive text-destructive hover:text-destructive-foreground"
          title="Remover equipamento"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-col">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
          isAvailable ? "bg-success/15" : "bg-destructive/15"
        )}>
          <ScanBarcode className={cn("w-6 h-6", isAvailable ? "text-success" : "text-destructive")} />
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-muted-foreground tracking-wider bg-muted/50 px-2.5 py-1 rounded-lg inline-block">
            {device.barcode}
          </div>
          <div className="font-bold text-sm truncate">{device.name}</div>
        </div>

        {isAvailable ? (
          <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-success">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(160_80%_45%/0.6)]" />
            Disponível
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-4 text-xs text-destructive">
            <User className="w-3.5 h-3.5" />
            <span className="truncate font-semibold">{device.currentOwner}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ScanInput - Enhanced: BIGGER, CENTRAL, FOCUS FIX
const ScanInput = ({ onScan, onNotification }: {
  onScan: (barcode: string, owner?: string) => { success: boolean; message: string; needsOwner?: boolean; device?: Device };
  onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}) => {
  const [barcode, setBarcode] = useState('');
  const [pendingDevice, setPendingDevice] = useState<Device | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const handleScan = () => {
    if (!barcode.trim()) return;
    
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 300);
    
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
      // FOCUS FIX: always refocus barcode input after scan
      requestAnimationFrame(() => {
        barcodeRef.current?.focus();
      });
    }
  };

  const handleCheckout = () => {
    if (!pendingDevice || !ownerName.trim()) return;
    const result = onScan(pendingDevice.barcode, ownerName);
    onNotification(result.message, result.success ? 'success' : 'error');
    setBarcode(''); setOwnerName(''); setPendingDevice(null);
    // FOCUS FIX: refocus barcode input after checkout
    requestAnimationFrame(() => {
      barcodeRef.current?.focus();
    });
  };

  const cancelCheckout = () => {
    setPendingDevice(null); setOwnerName(''); setBarcode('');
    requestAnimationFrame(() => {
      barcodeRef.current?.focus();
    });
  };

  if (pendingDevice) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/25 rounded-2xl p-6 col-span-1 lg:col-span-2"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="font-bold text-base">Registrar Empréstimo</span>
            <p className="text-xs text-muted-foreground">Informe o responsável pelo equipamento</p>
          </div>
        </div>
        
        <div className="bg-card/60 backdrop-blur-sm rounded-xl p-4 mb-5 border border-border/50">
          <div className="flex items-center gap-3">
            <ScanBarcode className="w-5 h-5 text-muted-foreground" />
            <span className="text-base font-semibold">{pendingDevice.name}</span>
            <span className="text-xs font-mono text-muted-foreground ml-auto bg-muted px-2 py-1 rounded-lg">{pendingDevice.barcode}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Input ref={ownerRef} value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
            placeholder="Nome do responsável" className="flex-1 h-12 bg-input border-border focus:border-primary rounded-xl text-sm font-medium" />
          <Button onClick={handleCheckout} className="bg-success hover:bg-success/90 text-success-foreground rounded-xl px-6 h-12 font-semibold">
            <Send className="w-4 h-4 mr-2" />Confirmar
          </Button>
          <Button onClick={cancelCheckout} variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl h-12">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="col-span-1 lg:col-span-2">
      <div className={cn(
        "bg-card/80 backdrop-blur-sm border rounded-2xl p-6 transition-all scanner-input",
        isScanning ? "border-primary/60" : "border-border/50"
      )}>
        <div className="flex items-center gap-3 mb-5">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
            isScanning ? "bg-primary/30 shadow-[0_0_20px_hsl(186_100%_50%/0.3)]" : "bg-primary/15"
          )}>
            <Scan className={cn("w-5 h-5 text-primary transition-transform", isScanning && "scale-110")} />
          </div>
          <div>
            <span className="font-bold text-lg">Escanear Código</span>
            <p className="text-xs text-muted-foreground">Empréstimo ou devolução automática</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input 
              ref={barcodeRef} 
              value={barcode} 
              onChange={(e) => setBarcode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              placeholder="Digite ou escaneie o código..."
              className="w-full h-14 bg-input border-2 border-border rounded-xl pl-5 pr-14 font-mono uppercase text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(186_100%_50%/0.15)] transition-all tracking-wider" 
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30">
              <ScanBarcode className="w-6 h-6" />
            </div>
          </div>
          <Button 
            onClick={handleScan} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-14 font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Scan className="w-5 h-5 mr-2" />
            Escanear
          </Button>
        </div>
      </div>
    </div>
  );
};

// AddDeviceForm - Enhanced
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
        className="w-full h-full min-h-[100px] border-2 border-dashed border-border/50 hover:border-primary/40 text-muted-foreground hover:text-primary rounded-2xl transition-all group">
        <div className="flex flex-col items-center gap-2">
          <div className="w-11 h-11 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-semibold">Adicionar Equipamento</span>
        </div>
      </Button>
    );
  }

  return (
    <motion.form 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onSubmit={handleSubmit} 
      className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-success/15 flex items-center justify-center">
          <Package className="w-5 h-5 text-success" />
        </div>
        <div>
          <span className="font-bold text-base">Novo Equipamento</span>
          <p className="text-xs text-muted-foreground">Cadastrar no sistema</p>
        </div>
      </div>
      <div className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do equipamento"
          className="h-12 bg-input border-border focus:border-primary rounded-xl text-sm" />
        <Input value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())} placeholder="Código de barras"
          className="h-12 bg-input border-border focus:border-primary font-mono uppercase rounded-xl text-sm" />
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1 bg-success hover:bg-success/90 text-success-foreground rounded-xl h-11 font-semibold">
            <Plus className="w-4 h-4 mr-1.5" />Cadastrar
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl h-11">
            Cancelar
          </Button>
        </div>
      </div>
    </motion.form>
  );
};

// Quick Stats Mini Dashboard
const QuickDashboard = ({ logs, devices }: { logs: LogEntry[]; devices: Device[] }) => {
  const today = new Date();
  const todayLogs = logs.filter(l => l.timestamp.toDateString() === today.toDateString());
  const saidas = todayLogs.filter(l => l.action === 'SAÍDA').length;
  const devolucoes = todayLogs.filter(l => l.action === 'DEVOLUÇÃO').length;
  const lastLog = logs[0];

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm">Resumo do Dia</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-destructive/8 rounded-xl p-3 text-center">
          <div className="text-2xl font-mono font-bold text-destructive">{saidas}</div>
          <div className="text-[10px] uppercase tracking-wider text-destructive/70 font-medium">Saídas</div>
        </div>
        <div className="bg-success/8 rounded-xl p-3 text-center">
          <div className="text-2xl font-mono font-bold text-success">{devolucoes}</div>
          <div className="text-[10px] uppercase tracking-wider text-success/70 font-medium">Devoluções</div>
        </div>
      </div>

      {lastLog && (
        <div className="bg-muted/30 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Última movimentação</div>
          <div className="flex items-center gap-2">
            {lastLog.action === 'SAÍDA' ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
            ) : (
              <ArrowDownLeft className="w-3.5 h-3.5 text-success" />
            )}
            <span className="text-xs font-semibold truncate">{lastLog.deviceName}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(lastLog.timestamp, "HH:mm", { locale: ptBR })} • {lastLog.owner}
          </div>
        </div>
      )}
    </div>
  );
};

// Log Entry Component - Enhanced with more spacing
const LogEntryItem = ({ log }: { log: LogEntry }) => {
  const isSaida = log.action === 'SAÍDA';
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-muted/30 border border-transparent hover:border-border/50",
        isSaida ? "bg-destructive/5" : "bg-success/5"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        isSaida ? "bg-destructive/15" : "bg-success/15"
      )}>
        {isSaida ? (
          <ArrowUpRight className="w-5 h-5 text-destructive" />
        ) : (
          <ArrowDownLeft className="w-5 h-5 text-success" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            isSaida ? "text-destructive" : "text-success"
          )}>
            {log.action}
          </span>
        </div>
        
        <div className="text-sm font-semibold text-foreground truncate mb-1.5">
          {log.deviceName}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-lg">
            {log.deviceBarcode}
          </span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">{log.owner}</span>
          </div>
        </div>
        
        <div className="text-[10px] text-muted-foreground/60 mt-1.5 font-mono">
          {format(log.timestamp, "dd/MM/yy 'às' HH:mm:ss", { locale: ptBR })}
        </div>
      </div>
    </motion.div>
  );
};

// LogsSidebar - Enhanced
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
    <aside className="w-[340px] bg-card/40 backdrop-blur-sm border-l border-border/50 flex flex-col h-full">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-base">Histórico</h3>
          </div>
          <span className="text-[11px] bg-muted px-2.5 py-1 rounded-full font-mono font-medium">
            {logs.length}
          </span>
        </div>
        
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "flex-1 text-[11px] py-2 rounded-xl font-semibold transition-all",
              filter === 'all' 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('SAÍDA')}
            className={cn(
              "flex-1 text-[11px] py-2 rounded-xl font-semibold transition-all",
              filter === 'SAÍDA' 
                ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20" 
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Saídas
          </button>
          <button
            onClick={() => setFilter('DEVOLUÇÃO')}
            className={cn(
              "flex-1 text-[11px] py-2 rounded-xl font-semibold transition-all",
              filter === 'DEVOLUÇÃO' 
                ? "bg-success text-success-foreground shadow-lg shadow-success/20" 
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Devoluções
          </button>
        </div>
      </div>
      
      {todayLogs.length > 0 && (
        <div className="px-5 py-3 bg-muted/20 border-b border-border/30">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
            Hoje — {todayLogs.length} {todayLogs.length === 1 ? 'movimentação' : 'movimentações'}
          </span>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-xs font-medium">Nenhuma movimentação</p>
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
    <div className="min-h-screen flex flex-col cyber-grid">
      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>
      
      <Header total={stats.total} emprestados={stats.emprestados} />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Scanner + Add Section */}
          <div className="border-b border-border/30 bg-card/20 backdrop-blur-sm">
            <div className="max-w-[1800px] mx-auto p-5 lg:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ScanInput onScan={scanDevice} onNotification={showNotification} />
                <AddDeviceForm onAdd={addDevice} onNotification={showNotification} />
              </div>
              
              {/* Search and View Toggle */}
              <div className="flex items-center gap-3 mt-5">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome, código ou responsável..."
                    value={searchFilter} 
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full h-11 bg-input border border-border/50 rounded-xl pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" 
                  />
                </div>
                
                <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('compact')}
                    className={cn(
                      "p-2.5 rounded-lg transition-all",
                      viewMode === 'compact' 
                        ? "bg-card text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Visualização compacta"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2.5 rounded-lg transition-all",
                      viewMode === 'grid' 
                        ? "bg-card text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Visualização em grade"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
                
                {devices.length > 0 && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {filteredDevices.length} de {devices.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Device Grid */}
          <ScrollArea className="flex-1">
            <div className="max-w-[1800px] mx-auto p-5 lg:p-6">
              {/* Mini Dashboard when empty space */}
              {devices.length > 0 && logs.length > 0 && (
                <div className="mb-6 xl:hidden">
                  <QuickDashboard logs={logs} devices={devices} />
                </div>
              )}

              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-6"
                  >
                    <ScanBarcode className="w-12 h-12 opacity-30" />
                  </motion.div>
                  <h2 className="font-bold text-xl mb-2 text-foreground">Nenhum Equipamento</h2>
                  <p className="text-sm text-center max-w-md leading-relaxed">
                    Adicione equipamentos para começar a controlar empréstimos e devoluções.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {borrowedDevices.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_hsl(348_90%_55%/0.5)]" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-destructive">
                          Em Uso ({borrowedDevices.length})
                        </h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-destructive/20 to-transparent" />
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
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full bg-success shadow-[0_0_8px_hsl(160_80%_45%/0.5)]" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-success">
                          Disponíveis ({availableDevices.length})
                        </h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-success/20 to-transparent" />
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
                    <div className="text-center py-20 text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Nenhum resultado para "{searchFilter}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>

        <div className="hidden xl:flex flex-col">
          <div className="p-4 border-b border-border/30">
            <QuickDashboard logs={logs} devices={devices} />
          </div>
          <LogsSidebar logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default Index;

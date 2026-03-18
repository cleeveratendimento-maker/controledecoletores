import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Package,
  ScanBarcode,
  Users,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  User,
  Scan,
  Send,
  Plus,
  X,
  XCircle,
  Info,
  Search,
  History,
  LayoutGrid,
  List,
  Activity,
  TrendingUp,
  Laptop,
  Smartphone,
  Globe,
  PlaneTakeoff,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import mascotImage from '@/assets/mascot-pilllowtex.jpeg';

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
          createdAt: new Date(d.createdAt),
        })) as T;
      }
      if (key === LOGS_KEY) {
        return parsed.map((l: LogEntry) => ({
          ...l,
          timestamp: new Date(l.timestamp),
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

const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>(() => loadFromStorage<Device[]>(STORAGE_KEY, []));
  const [logs, setLogs] = useState<LogEntry[]>(() => loadFromStorage<LogEntry[]>(LOGS_KEY, []));

  const addDevice = useCallback(
    (name: string, barcode: string): { success: boolean; message: string } => {
      const normalizedBarcode = barcode.toUpperCase().trim();

      if (!name.trim() || !normalizedBarcode) {
        return { success: false, message: 'Nome e código de barras são obrigatórios' };
      }

      const exists = devices.some((d) => d.barcode === normalizedBarcode);
      if (exists) {
        return { success: false, message: `Código "${normalizedBarcode}" já existe!` };
      }

      const newDevice: Device = {
        id: crypto.randomUUID(),
        name: name.trim(),
        barcode: normalizedBarcode,
        status: 'disponivel',
        currentOwner: null,
        createdAt: new Date(),
      };

      const updated = [...devices, newDevice];
      setDevices(updated);
      saveToStorage(STORAGE_KEY, updated);

      return { success: true, message: `Coletor "${name}" cadastrado com sucesso!` };
    },
    [devices],
  );

  const removeDevice = useCallback(
    (id: string): { success: boolean; message: string } => {
      const device = devices.find((d) => d.id === id);
      if (!device) {
        return { success: false, message: 'Dispositivo não encontrado' };
      }
      if (device.status === 'emprestado') {
        return { success: false, message: 'Não é possível remover um dispositivo emprestado' };
      }

      const updated = devices.filter((d) => d.id !== id);
      setDevices(updated);
      saveToStorage(STORAGE_KEY, updated);

      return { success: true, message: `Coletor "${device.name}" removido!` };
    },
    [devices],
  );

  const scanDevice = useCallback(
    (
      barcode: string,
      ownerName?: string,
    ): {
      success: boolean;
      message: string;
      needsOwner?: boolean;
      device?: Device;
    } => {
      const normalizedBarcode = barcode.toUpperCase().trim();
      const device = devices.find((d) => d.barcode === normalizedBarcode);

      if (!device) {
        return { success: false, message: `Código "${normalizedBarcode}" não encontrado!` };
      }

      const now = new Date();

      if (device.status === 'disponivel') {
        if (!ownerName?.trim()) {
          return { success: false, message: '', needsOwner: true, device };
        }

        const updatedDevices = devices.map((d) =>
          d.id === device.id ? { ...d, status: 'emprestado' as const, currentOwner: ownerName.trim() } : d,
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
          timestamp: now,
        };
        const updatedLogs = [newLog, ...logs].slice(0, 500);
        setLogs(updatedLogs);
        saveToStorage(LOGS_KEY, updatedLogs);

        return { success: true, message: `SAÍDA: ${device.name} → ${ownerName.trim()}` };
      }

      const previousOwner = device.currentOwner || 'Desconhecido';

      const updatedDevices = devices.map((d) =>
        d.id === device.id ? { ...d, status: 'disponivel' as const, currentOwner: null } : d,
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
        timestamp: now,
      };
      const updatedLogs = [newLog, ...logs].slice(0, 500);
      setLogs(updatedLogs);
      saveToStorage(LOGS_KEY, updatedLogs);

      return { success: true, message: `DEVOLVIDO: ${device.name} ← ${previousOwner}` };
    },
    [devices, logs],
  );

  const getStats = useCallback(() => {
    const total = devices.length;
    const emprestados = devices.filter((d) => d.status === 'emprestado').length;
    const disponiveis = total - emprestados;
    return { total, emprestados, disponiveis };
  }, [devices]);

  return { devices, logs, addDevice, removeDevice, scanDevice, getStats };
};

const StatsCard = ({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  variant: 'default' | 'success' | 'destructive';
}) => {
  const variants = {
    default: 'bg-secondary border-border/50 text-foreground',
    success: 'bg-success/8 border-success/25 text-success',
    destructive: 'bg-destructive/8 border-destructive/25 text-destructive',
  };

  const iconBg = {
    default: 'bg-muted',
    success: 'bg-success/15',
    destructive: 'bg-destructive/15',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn('flex items-center gap-3 rounded-2xl border px-5 py-4 backdrop-blur-sm stats-glow', variants[variant])}
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconBg[variant])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-60">{label}</div>
        <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
      </div>
    </motion.div>
  );
};

const Header = ({ total, emprestados }: { total: number; emprestados: number }) => {
  const disponivel = total - emprestados;

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-card/60 backdrop-blur-xl">
      <div className="mx-auto max-w-[1800px] px-5 py-5 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-5 lg:flex-row">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/40 shadow-lg shadow-primary/25"
            >
              <ScanBarcode className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <div>
              <div className="font-display text-2xl font-extrabold tracking-wide">
                <span className="text-foreground">Zona</span>
                <span className="neon-text-cyan">Criativa</span>
              </div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Controle de Equipamentos</p>
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
        'fixed right-5 top-24 z-50 flex max-w-sm items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-sm',
        type === 'success' && 'border-success/50 bg-success/90 text-success-foreground',
        type === 'error' && 'border-destructive/50 bg-destructive/90 text-destructive-foreground',
        type === 'info' && 'border-primary/50 bg-primary/90 text-primary-foreground',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 transition-opacity hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

const DeviceCard = ({
  device,
  onRemove,
  compact = false,
}: {
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
          'group relative rounded-xl border p-4 transition-all duration-200',
          isAvailable ? 'device-card-available border-success/20 bg-success/5' : 'device-card-borrowed border-destructive/20 bg-destructive/5',
        )}
      >
        {onRemove && isAvailable && (
          <button
            onClick={() => onRemove(device.id)}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground opacity-0 shadow-lg transition-all group-hover:opacity-100"
            title="Remover"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', isAvailable ? 'bg-success/15' : 'bg-destructive/15')}>
            <ScanBarcode className={cn('h-5 w-5', isAvailable ? 'text-success' : 'text-destructive')} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{device.name}</div>
            <div className="text-[11px] font-mono tracking-wide text-muted-foreground">{device.barcode}</div>
          </div>

          {!isAvailable && device.currentOwner && (
            <div className="max-w-[90px] truncate rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
              {device.currentOwner}
            </div>
          )}

          {isAvailable && <div className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.6)]" />}
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
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'group relative rounded-2xl border p-5 transition-all duration-300',
        isAvailable
          ? 'device-card-available bg-gradient-to-br from-success/10 to-success/3 border-success/20'
          : 'device-card-borrowed bg-gradient-to-br from-destructive/10 to-destructive/3 border-destructive/20',
      )}
    >
      {onRemove && isAvailable && (
        <button
          onClick={() => onRemove(device.id)}
          className="absolute right-3 top-3 rounded-xl bg-destructive/20 p-2 text-destructive opacity-0 transition-all hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
          title="Remover equipamento"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      <div className="flex flex-col">
        <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-xl', isAvailable ? 'bg-success/15' : 'bg-destructive/15')}>
          <ScanBarcode className={cn('h-6 w-6', isAvailable ? 'text-success' : 'text-destructive')} />
        </div>

        <div className="space-y-1.5">
          <div className="inline-block rounded-lg bg-muted/50 px-2.5 py-1 text-[11px] font-mono tracking-wider text-muted-foreground">
            {device.barcode}
          </div>
          <div className="truncate text-sm font-bold">{device.name}</div>
        </div>

        {isAvailable ? (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-success">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.6)]" />
            Disponível
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-xs text-destructive">
            <User className="h-3.5 w-3.5" />
            <span className="truncate font-semibold">{device.currentOwner}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ScanInput = ({
  onScan,
  onNotification,
}: {
  onScan: (barcode: string, owner?: string) => { success: boolean; message: string; needsOwner?: boolean; device?: Device };
  onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}) => {
  const [barcode, setBarcode] = useState('');
  const [pendingDevice, setPendingDevice] = useState<Device | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

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
      requestAnimationFrame(() => {
        barcodeRef.current?.focus();
      });
    }
  };

  const handleCheckout = () => {
    if (!pendingDevice || !ownerName.trim()) return;
    const result = onScan(pendingDevice.barcode, ownerName);
    onNotification(result.message, result.success ? 'success' : 'error');
    setBarcode('');
    setOwnerName('');
    setPendingDevice(null);
    requestAnimationFrame(() => {
      barcodeRef.current?.focus();
    });
  };

  const cancelCheckout = () => {
    setPendingDevice(null);
    setOwnerName('');
    setBarcode('');
    requestAnimationFrame(() => {
      barcodeRef.current?.focus();
    });
  };

  if (pendingDevice) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-span-1 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 lg:col-span-2"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-base font-bold">Registrar Empréstimo</span>
            <p className="text-xs text-muted-foreground">Informe o responsável pelo equipamento</p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <ScanBarcode className="h-5 w-5 text-muted-foreground" />
            <span className="text-base font-semibold">{pendingDevice.name}</span>
            <span className="ml-auto rounded-lg bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">{pendingDevice.barcode}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Input
            ref={ownerRef}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
            placeholder="Nome do responsável"
            className="h-12 flex-1 rounded-xl border-border bg-input text-sm font-medium focus:border-primary"
          />
          <Button onClick={handleCheckout} className="h-12 rounded-xl bg-success px-6 font-semibold text-success-foreground hover:bg-success/90">
            <Send className="mr-2 h-4 w-4" />
            Confirmar
          </Button>
          <Button onClick={cancelCheckout} variant="outline" className="h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="col-span-1 lg:col-span-2">
      <div className={cn('scanner-input rounded-2xl border bg-card/80 p-6 backdrop-blur-sm transition-all', isScanning ? 'border-primary/60' : 'border-border/50')}>
        <div className="mb-5 flex items-center gap-3">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl transition-all', isScanning ? 'bg-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.3)]' : 'bg-primary/15')}>
            <Scan className={cn('h-5 w-5 text-primary transition-transform', isScanning && 'scale-110')} />
          </div>
          <div>
            <span className="text-lg font-bold">Escanear Código</span>
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
              className="h-14 w-full rounded-xl border-2 border-border bg-input pl-5 pr-14 font-mono text-base uppercase tracking-wider placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30">
              <ScanBarcode className="h-6 w-6" />
            </div>
          </div>
          <Button
            onClick={handleScan}
            className="h-14 rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
          >
            <Scan className="mr-2 h-5 w-5" />
            Escanear
          </Button>
        </div>
      </div>
    </div>
  );
};

const AddDeviceForm = ({
  onAdd,
  onNotification,
}: {
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
      setName('');
      setBarcode('');
      setIsOpen(false);
    } else {
      onNotification(result.message, 'error');
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="group h-full min-h-[100px] w-full rounded-2xl border-2 border-dashed border-border/50 text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
            <Plus className="h-5 w-5" />
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
      className="rounded-2xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15">
          <Package className="h-5 w-5 text-success" />
        </div>
        <div>
          <span className="text-base font-bold">Novo Equipamento</span>
          <p className="text-xs text-muted-foreground">Cadastrar no sistema</p>
        </div>
      </div>
      <div className="space-y-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do equipamento"
          className="h-12 rounded-xl border-border bg-input text-sm focus:border-primary"
        />
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value.toUpperCase())}
          placeholder="Código de barras"
          className="h-12 rounded-xl border-border bg-input font-mono text-sm uppercase focus:border-primary"
        />
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="h-11 flex-1 rounded-xl bg-success font-semibold text-success-foreground hover:bg-success/90">
            <Plus className="mr-1.5 h-4 w-4" />
            Cadastrar
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="h-11 rounded-xl">
            Cancelar
          </Button>
        </div>
      </div>
    </motion.form>
  );
};

const QuickDashboard = ({ logs }: { logs: LogEntry[] }) => {
  const today = new Date();
  const todayLogs = logs.filter((l) => l.timestamp.toDateString() === today.toDateString());
  const saidas = todayLogs.filter((l) => l.action === 'SAÍDA').length;
  const devolucoes = todayLogs.filter((l) => l.action === 'DEVOLUÇÃO').length;
  const lastLog = logs[0];

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Resumo do Dia</h3>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-destructive/8 p-3 text-center">
          <div className="font-mono text-2xl font-bold text-destructive">{saidas}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-destructive/70">Saídas</div>
        </div>
        <div className="rounded-xl bg-success/8 p-3 text-center">
          <div className="font-mono text-2xl font-bold text-success">{devolucoes}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-success/70">Devoluções</div>
        </div>
      </div>

      {lastLog && (
        <div className="rounded-xl bg-muted/30 p-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Última movimentação</div>
          <div className="flex items-center gap-2">
            {lastLog.action === 'SAÍDA' ? <ArrowUpRight className="h-3.5 w-3.5 text-destructive" /> : <ArrowDownLeft className="h-3.5 w-3.5 text-success" />}
            <span className="truncate text-xs font-semibold">{lastLog.deviceName}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(lastLog.timestamp, 'HH:mm', { locale: ptBR })} • {lastLog.owner}
          </div>
        </div>
      )}
    </div>
  );
};

const LogEntryItem = ({ log }: { log: LogEntry }) => {
  const isSaida = log.action === 'SAÍDA';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-start gap-4 rounded-xl border border-transparent p-4 transition-colors hover:border-border/50 hover:bg-muted/30',
        isSaida ? 'bg-destructive/5' : 'bg-success/5',
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', isSaida ? 'bg-destructive/15' : 'bg-success/15')}>
        {isSaida ? <ArrowUpRight className="h-5 w-5 text-destructive" /> : <ArrowDownLeft className="h-5 w-5 text-success" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={cn('text-xs font-bold uppercase tracking-wider', isSaida ? 'text-destructive' : 'text-success')}>{log.action}</span>
        </div>

        <div className="mb-1.5 truncate text-sm font-semibold text-foreground">{log.deviceName}</div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{log.deviceBarcode}</span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{log.owner}</span>
          </div>
        </div>

        <div className="mt-1.5 font-mono text-[10px] text-muted-foreground/60">
          {format(log.timestamp, "dd/MM/yy 'às' HH:mm:ss", { locale: ptBR })}
        </div>
      </div>
    </motion.div>
  );
};

const LogsSidebar = ({ logs }: { logs: LogEntry[] }) => {
  const [filter, setFilter] = useState<'all' | 'SAÍDA' | 'DEVOLUÇÃO'>('all');

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.action === filter);

  const todayLogs = filteredLogs.filter((l) => {
    const today = new Date();
    return l.timestamp.toDateString() === today.toDateString();
  });

  return (
    <aside className="flex h-full w-[340px] flex-col border-l border-border/50 bg-card/40 backdrop-blur-sm">
      <div className="border-b border-border/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Histórico</h3>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-mono font-medium">{logs.length}</span>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'flex-1 rounded-xl py-2 text-[11px] font-semibold transition-all',
              filter === 'all' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('SAÍDA')}
            className={cn(
              'flex-1 rounded-xl py-2 text-[11px] font-semibold transition-all',
              filter === 'SAÍDA'
                ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            Saídas
          </button>
          <button
            onClick={() => setFilter('DEVOLUÇÃO')}
            className={cn(
              'flex-1 rounded-xl py-2 text-[11px] font-semibold transition-all',
              filter === 'DEVOLUÇÃO'
                ? 'bg-success text-success-foreground shadow-lg shadow-success/20'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            Devoluções
          </button>
        </div>
      </div>

      {todayLogs.length > 0 && (
        <div className="border-b border-border/30 bg-muted/20 px-5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Hoje — {todayLogs.length} {todayLogs.length === 1 ? 'movimentação' : 'movimentações'}
          </span>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Clock className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p className="text-xs font-medium">Nenhuma movimentação</p>
            </div>
          ) : (
            filteredLogs.map((log) => <LogEntryItem key={log.id} log={log} />)
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

const LandingKpiCard = ({
  icon: Icon,
  title,
  description,
  value,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  value: number;
  tone: 'primary' | 'success' | 'destructive';
}) => {
  const tones = {
    primary: 'border-primary/20 bg-primary/8',
    success: 'border-success/20 bg-success/8',
    destructive: 'border-destructive/20 bg-destructive/8',
  };

  const iconTones = {
    primary: 'bg-primary/15 text-primary',
    success: 'bg-success/15 text-success',
    destructive: 'bg-destructive/15 text-destructive',
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={cn('rounded-3xl border p-5 backdrop-blur-sm', tones[tone])}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', iconTones[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="font-mono text-3xl font-bold tracking-tight text-foreground">{value}</div>
      </div>
      <h2 className="mb-1 text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
};

const LandingHero = ({
  categoryCards,
}: {
  categoryCards: Array<{
    title: string;
    description: string;
    value: number;
    icon: React.ElementType;
    tone: 'primary' | 'success' | 'destructive';
  }>;
}) => {
  return (
    <section className="border-b border-border/30 bg-card/10">
      <div className="mx-auto max-w-[1800px] px-5 py-8 lg:px-8 lg:py-10">
        <div className="grid items-center gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <TrendingUp className="h-4 w-4" />
              Landing de operação por bipagem
            </div>

            <div className="max-w-3xl space-y-4">
              <h1 className="font-display text-4xl font-extrabold leading-none tracking-[-0.04em] text-foreground sm:text-5xl xl:text-6xl">
                Controle de ativos com <span className="neon-text-cyan">entrada e saída por bipagem</span>.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Uma primeira página mais comercial para destacar coletores de dados, notebooks e máquinas celulares com o mascote como protagonista visual.
              </p>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-border via-border/50 to-transparent" />

            <div className="grid gap-4 md:grid-cols-3">
              {categoryCards.map((card) => (
                <LandingKpiCard key={card.title} {...card} />
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-[2rem] bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="absolute inset-x-10 bottom-0 h-24 rounded-full bg-success/10 blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/70 p-4 shadow-2xl shadow-primary/10 backdrop-blur-xl lg:p-6">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-border/40 bg-background/40 px-4 py-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Mascote oficial</p>
                  <p className="text-sm font-semibold text-foreground">PILLOWTEX em destaque</p>
                </div>
                <div className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">Online</div>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-primary/20 bg-secondary/40">
                <img
                  src={mascotImage}
                  alt="Mascote da operação de equipamentos da Zona Criativa"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Index = () => {
  const { devices, logs, addDevice, removeDevice, scanDevice, getStats } = useDevices();
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('compact');

  const stats = getStats();

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      const result = removeDevice(id);
      showNotification(result.message, result.success ? 'success' : 'error');
    },
    [removeDevice, showNotification],
  );

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.barcode.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.currentOwner?.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const availableDevices = filteredDevices.filter((d) => d.status === 'disponivel');
  const borrowedDevices = filteredDevices.filter((d) => d.status === 'emprestado');

  const countByTerms = (terms: string[]) =>
    devices.filter((device) => {
      const normalizedName = device.name.toLowerCase();
      return terms.some((term) => normalizedName.includes(term));
    }).length;

  const categoryCards = [
    {
      title: 'Coletores de dados',
      description: 'Equipamentos para leitura rápida e fluxo contínuo de bipagem.',
      value: countByTerms(['coletor', 'scanner']),
      icon: ScanBarcode,
      tone: 'success' as const,
    },
    {
      title: 'Notebooks',
      description: 'Máquinas de apoio operacional prontas para empréstimo e devolução.',
      value: countByTerms(['notebook', 'laptop']),
      icon: Laptop,
      tone: 'primary' as const,
    },
    {
      title: 'Máquinas celulares',
      description: 'Celulares e terminais móveis com acompanhamento visual mais claro.',
      value: countByTerms(['celular', 'smartphone', 'telefone', 'máquina']),
      icon: Smartphone,
      tone: 'destructive' as const,
    },
  ];

  return (
    <div className="cyber-grid min-h-screen flex flex-col">
      <AnimatePresence>
        {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      </AnimatePresence>

      <Header total={stats.total} emprestados={stats.emprestados} />
      <LandingHero categoryCards={categoryCards} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border/30 bg-card/20 backdrop-blur-sm">
            <div className="mx-auto max-w-[1800px] p-5 lg:p-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ScanInput onScan={scanDevice} onNotification={showNotification} />
                <AddDeviceForm onAdd={addDevice} onNotification={showNotification} />
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="relative max-w-lg flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, código ou responsável..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border/50 bg-input pl-10 pr-4 text-sm placeholder:text-muted-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </div>

                <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
                  <button
                    onClick={() => setViewMode('compact')}
                    className={cn('rounded-lg p-2.5 transition-all', viewMode === 'compact' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                    title="Visualização compacta"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn('rounded-lg p-2.5 transition-all', viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                    title="Visualização em grade"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>

                {devices.length > 0 && <span className="text-xs font-medium text-muted-foreground">{filteredDevices.length} de {devices.length}</span>}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-[1800px] p-5 lg:p-6">
              {devices.length > 0 && logs.length > 0 && (
                <div className="mb-6 xl:hidden">
                  <QuickDashboard logs={logs} />
                </div>
              )}

              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/50">
                    <ScanBarcode className="h-12 w-12 opacity-30" />
                  </motion.div>
                  <h2 className="mb-2 text-xl font-bold text-foreground">Nenhum Equipamento</h2>
                  <p className="max-w-md text-center text-sm leading-relaxed">
                    Adicione equipamentos para começar a controlar empréstimos e devoluções.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {borrowedDevices.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-3 w-3 animate-pulse rounded-full bg-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.5)]" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-destructive">Em Uso ({borrowedDevices.length})</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-destructive/20 to-transparent" />
                      </div>
                      <div
                        className={cn(
                          'grid gap-3',
                          viewMode === 'compact'
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8',
                        )}
                      >
                        {borrowedDevices.map((device) => (
                          <DeviceCard key={device.id} device={device} compact={viewMode === 'compact'} />
                        ))}
                      </div>
                    </section>
                  )}

                  {availableDevices.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-success">Disponíveis ({availableDevices.length})</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-success/20 to-transparent" />
                      </div>
                      <div
                        className={cn(
                          'grid gap-3',
                          viewMode === 'compact'
                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8',
                        )}
                      >
                        {availableDevices.map((device) => (
                          <DeviceCard key={device.id} device={device} onRemove={handleRemove} compact={viewMode === 'compact'} />
                        ))}
                      </div>
                    </section>
                  )}

                  {filteredDevices.length === 0 && devices.length > 0 && (
                    <div className="py-20 text-center text-muted-foreground">
                      <Search className="mx-auto mb-3 h-10 w-10 opacity-20" />
                      <p className="text-sm font-medium">Nenhum resultado para "{searchFilter}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>

        <div className="hidden xl:flex flex-col">
          <div className="border-b border-border/30 p-4">
            <QuickDashboard logs={logs} />
          </div>
          <LogsSidebar logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default Index;

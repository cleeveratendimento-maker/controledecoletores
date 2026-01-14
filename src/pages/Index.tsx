import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Package, Sparkles, Users, CheckCircle, Clock, 
  ArrowUpRight, ArrowDownLeft, Trash2, User, 
  Scan, Send, Plus, X, XCircle, Info 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  deviceName: string;
  action: 'SAÍDA' | 'DEVOLUÇÃO';
  owner: string;
  timestamp: Date;
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

  return { devices, logs, addDevice, removeDevice, scanDevice, getStats };
};

// ==================== COMPONENTS ====================

// Header
const Header = ({ total, emprestados }: { total: number; emprestados: number }) => {
  const disponivel = total - emprestados;
  
  return (
    <header className="bg-gradient-to-r from-card via-card to-primary/5 border-b border-border px-6 py-5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl tracking-wide">
              <span className="text-foreground">Zona</span>
              <span className="neon-text-cyan">Criativa</span>
            </h1>
            <p className="text-xs text-muted-foreground">Sistema de Controle de Equipamentos</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-card/80 backdrop-blur border border-border rounded-xl px-4 py-3">
            <Package className="w-5 h-5 text-primary" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
              <div className="text-xl font-mono font-bold text-foreground">{total}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-success/10 backdrop-blur border border-success/30 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-success" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-success/80">Disponíveis</div>
              <div className="text-xl font-mono font-bold neon-text-green">{disponivel}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-destructive/10 backdrop-blur border border-destructive/30 rounded-xl px-4 py-3">
            <Users className="w-5 h-5 text-destructive" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-destructive/80">Em Uso</div>
              <div className="text-xl font-mono font-bold neon-text-red">{emprestados}</div>
            </div>
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
      "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg",
      "animate-in slide-in-from-top-2 fade-in duration-300",
      type === 'success' && "bg-success/20 border border-success/50 neon-border-green",
      type === 'error' && "bg-destructive/20 border border-destructive/50 neon-border-red",
      type === 'info' && "bg-primary/20 border border-primary/50 neon-border-cyan"
    )}>
      <Icon className={cn(
        "w-5 h-5",
        type === 'success' && "text-success",
        type === 'error' && "text-destructive",
        type === 'info' && "text-primary"
      )} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// DeviceCard
const DeviceCard = ({ device, onRemove }: { device: Device; onRemove?: (id: string) => void }) => {
  const isAvailable = device.status === 'disponivel';

  return (
    <div className={cn(
      "relative border rounded-2xl p-5 transition-all duration-300 group hover:scale-[1.02] hover:shadow-xl",
      isAvailable 
        ? "border-success/30 bg-gradient-to-br from-success/10 to-success/5 hover:border-success/50" 
        : "border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 hover:border-destructive/50"
    )}>
      {onRemove && isAvailable && (
        <button
          onClick={() => onRemove(device.id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg bg-destructive/20 hover:bg-destructive/40 text-destructive"
          title="Remover equipamento"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <div className="flex flex-col">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
          isAvailable ? "bg-success/20" : "bg-destructive/20"
        )}>
          <Package className={cn("w-6 h-6", isAvailable ? "text-success" : "text-destructive")} />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-mono text-muted-foreground tracking-wider bg-muted/50 px-2 py-1 rounded inline-block">
            {device.barcode}
          </div>
          <div className="font-semibold text-base truncate">{device.name}</div>
        </div>

        {isAvailable ? (
          <div className="flex items-center gap-2 mt-4 text-sm font-medium text-success">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Disponível
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-4 text-sm text-destructive">
            <User className="w-4 h-4" />
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
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="font-display font-bold text-lg">Checkout</span>
            <p className="text-xs text-muted-foreground">Registrar empréstimo</p>
          </div>
        </div>
        
        <div className="bg-card/50 rounded-xl p-4 mb-4">
          <div className="text-sm text-muted-foreground mb-1">Equipamento selecionado</div>
          <div className="text-foreground font-semibold">{pendingDevice.name}</div>
          <div className="text-xs text-muted-foreground font-mono mt-1">{pendingDevice.barcode}</div>
        </div>

        <div className="flex gap-2">
          <Input ref={ownerRef} value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
            placeholder="Nome do responsável" className="flex-1 bg-input border-border focus:border-primary rounded-xl" />
          <Button onClick={handleCheckout} className="bg-success hover:bg-success/80 text-success-foreground rounded-xl px-4">
            <Send className="w-4 h-4" />
          </Button>
          <Button onClick={cancelCheckout} variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-xl">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Scan className="w-5 h-5 text-primary" />
        </div>
        <div>
          <span className="font-display font-semibold">Escanear</span>
          <p className="text-xs text-muted-foreground">Empréstimo ou devolução</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input ref={barcodeRef} value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="Digite ou escaneie o código..." className="flex-1 bg-input border-border focus:border-primary font-mono uppercase rounded-xl" />
        <Button onClick={handleScan} className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-xl px-5">
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
        className="w-full h-full min-h-[120px] border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 rounded-2xl transition-all">
        <Plus className="w-5 h-5 mr-2" />Adicionar Equipamento
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
          <Package className="w-5 h-5 text-success" />
        </div>
        <div>
          <span className="font-display font-semibold">Novo Equipamento</span>
          <p className="text-xs text-muted-foreground">Cadastrar no sistema</p>
        </div>
      </div>
      <div className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do equipamento"
          className="bg-input border-border focus:border-primary rounded-xl" />
        <Input value={barcode} onChange={(e) => setBarcode(e.target.value.toUpperCase())} placeholder="Código de barras único"
          className="bg-input border-border focus:border-primary font-mono uppercase rounded-xl" />
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1 bg-success hover:bg-success/80 text-success-foreground rounded-xl">
            <Plus className="w-4 h-4 mr-2" />Cadastrar
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-muted-foreground/30 rounded-xl">
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
};

// LogsSidebar
const LogsSidebar = ({ logs }: { logs: LogEntry[] }) => {
  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold tracking-wide">HISTÓRICO</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma movimentação registrada</div>
        ) : (
          logs.map((log) => {
            const isSaida = log.action === 'SAÍDA';
            return (
              <div key={log.id} className={cn("border-l-2 pl-3 py-2", isSaida ? "border-destructive" : "border-success")}>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>{format(log.timestamp, "dd/MM HH:mm", { locale: ptBR })}</span>
                </div>
                <div className={cn("flex items-center gap-1.5 font-semibold text-sm", isSaida ? "neon-text-red" : "neon-text-green")}>
                  {isSaida ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                  {log.action}
                </div>
                <div className="text-xs text-foreground mt-0.5">{log.deviceName}</div>
                <div className="text-[10px] text-muted-foreground">{log.owner}</div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

// ==================== MAIN PAGE ====================
const Index = () => {
  const { devices, logs, addDevice, removeDevice, scanDevice, getStats } = useDevices();
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

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
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <Header total={stats.total} emprestados={stats.emprestados} />

      <div className="flex-1 flex">
        <main className="flex-1 flex flex-col">
          <div className="border-b border-border bg-gradient-to-b from-card/80 to-transparent">
            <div className="max-w-7xl mx-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ScanInput onScan={scanDevice} onNotification={showNotification} />
                <AddDeviceForm onAdd={addDevice} onNotification={showNotification} />
              </div>
              <div className="mt-6">
                <input type="text" placeholder="🔍 Buscar por nome, código ou responsável..."
                  value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full max-w-lg bg-input border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Package className="w-12 h-12 text-primary/50" />
                  </div>
                  <h2 className="font-display text-2xl mb-3 text-foreground">Nenhum Equipamento</h2>
                  <p className="text-sm text-center max-w-md leading-relaxed">
                    Adicione equipamentos usando o formulário acima. Escaneie códigos de barras para controlar empréstimos e devoluções.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {borrowedDevices.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">Em Uso ({borrowedDevices.length})</h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {borrowedDevices.map(device => <DeviceCard key={device.id} device={device} />)}
                      </div>
                    </section>
                  )}

                  {availableDevices.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full bg-success" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-success">Disponíveis ({availableDevices.length})</h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {availableDevices.map(device => <DeviceCard key={device.id} device={device} onRemove={handleRemove} />)}
                      </div>
                    </section>
                  )}

                  {filteredDevices.length === 0 && devices.length > 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <p className="text-lg">Nenhum resultado para "{searchFilter}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        <div className="hidden xl:block">
          <LogsSidebar logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default Index;

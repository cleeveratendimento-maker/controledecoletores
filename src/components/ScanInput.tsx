import { useState, useRef, useEffect } from 'react';
import { Scan, User, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Device } from '@/types/device';

interface ScanInputProps {
  onScan: (barcode: string, owner?: string) => { 
    success: boolean; 
    message: string; 
    needsOwner?: boolean; 
    device?: Device;
  };
  onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ScanInput = ({ onScan, onNotification }: ScanInputProps) => {
  const [barcode, setBarcode] = useState('');
  const [pendingDevice, setPendingDevice] = useState<Device | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

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
    
    if (result.success) {
      onNotification(result.message, 'success');
    } else {
      onNotification(result.message, 'error');
    }

    setBarcode('');
    setOwnerName('');
    setPendingDevice(null);
    barcodeRef.current?.focus();
  };

  const cancelCheckout = () => {
    setPendingDevice(null);
    setOwnerName('');
    setBarcode('');
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
          <Input
            ref={ownerRef}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
            placeholder="Nome do responsável"
            className="flex-1 bg-input border-border focus:border-primary rounded-xl"
          />
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
        <Input
          ref={barcodeRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="Digite ou escaneie o código..."
          className="flex-1 bg-input border-border focus:border-primary font-mono uppercase rounded-xl"
        />
        <Button onClick={handleScan} className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-xl px-5">
          <Scan className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

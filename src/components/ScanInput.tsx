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
      <div className="bg-card border border-primary/30 rounded-lg p-6 neon-border-cyan">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <span className="font-display font-bold">CHECKOUT</span>
        </div>
        
        <div className="text-sm text-muted-foreground mb-2">
          Coletor: <span className="text-foreground font-semibold">{pendingDevice.name}</span>
        </div>
        <div className="text-xs text-muted-foreground mb-4 font-mono">
          {pendingDevice.barcode}
        </div>

        <div className="flex gap-2">
          <Input
            ref={ownerRef}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
            placeholder="Nome do responsável"
            className="flex-1 bg-input border-border focus:border-primary"
          />
          <Button onClick={handleCheckout} className="bg-success hover:bg-success/80 text-success-foreground">
            <Send className="w-4 h-4" />
          </Button>
          <Button onClick={cancelCheckout} variant="outline" className="border-destructive text-destructive hover:bg-destructive/20">
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Scan className="w-5 h-5 text-primary" />
        <span className="font-display text-sm font-semibold">ESCANEAR CÓDIGO</span>
      </div>

      <div className="flex gap-2">
        <Input
          ref={barcodeRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          placeholder="Código de barras..."
          className="flex-1 bg-input border-border focus:border-primary font-mono uppercase"
        />
        <Button onClick={handleScan} className="bg-primary hover:bg-primary/80 text-primary-foreground">
          <Scan className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddDeviceFormProps {
  onAdd: (name: string, barcode: string) => { success: boolean; message: string };
  onNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AddDeviceForm = ({ onAdd, onNotification }: AddDeviceFormProps) => {
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
        className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:border-primary"
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Coletor
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary" />
        <span className="font-display text-sm font-semibold">NOVO COLETOR</span>
      </div>

      <div className="space-y-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do coletor (ex: Coletor Zebra 001)"
          className="bg-input border-border focus:border-primary"
        />
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value.toUpperCase())}
          placeholder="Código de barras (ex: AWS-001)"
          className="bg-input border-border focus:border-primary font-mono uppercase"
        />

        <div className="flex gap-2">
          <Button type="submit" className="flex-1 bg-success hover:bg-success/80 text-success-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="border-muted-foreground/30"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
};

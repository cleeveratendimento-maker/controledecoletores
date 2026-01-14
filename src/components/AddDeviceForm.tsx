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
        className="w-full h-full min-h-[120px] border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 rounded-2xl transition-all"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar Equipamento
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
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do equipamento"
          className="bg-input border-border focus:border-primary rounded-xl"
        />
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value.toUpperCase())}
          placeholder="Código de barras único"
          className="bg-input border-border focus:border-primary font-mono uppercase rounded-xl"
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1 bg-success hover:bg-success/80 text-success-foreground rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="border-muted-foreground/30 rounded-xl"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
};

import { User, Package, Trash2 } from 'lucide-react';
import { Device } from '@/types/device';
import { cn } from '@/lib/utils';

interface DeviceCardProps {
  device: Device;
  onRemove?: (id: string) => void;
}

export const DeviceCard = ({ device, onRemove }: DeviceCardProps) => {
  const isAvailable = device.status === 'disponivel';

  return (
    <div
      className={cn(
        "relative border rounded-2xl p-5 transition-all duration-300 group",
        "hover:scale-[1.02] hover:shadow-xl",
        isAvailable 
          ? "border-success/30 bg-gradient-to-br from-success/10 to-success/5 hover:border-success/50" 
          : "border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 hover:border-destructive/50"
      )}
    >
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
          <Package className={cn(
            "w-6 h-6",
            isAvailable ? "text-success" : "text-destructive"
          )} />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-mono text-muted-foreground tracking-wider bg-muted/50 px-2 py-1 rounded inline-block">
            {device.barcode}
          </div>
          <div className="font-semibold text-base truncate">
            {device.name}
          </div>
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

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
        "relative border rounded-lg p-4 transition-all duration-300 group",
        "hover:scale-[1.02] hover:shadow-lg",
        isAvailable 
          ? "border-success/50 bg-success/5 hover:neon-border-green" 
          : "border-destructive/50 bg-destructive/5 hover:neon-border-red"
      )}
    >
      {onRemove && isAvailable && (
        <button
          onClick={() => onRemove(device.id)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-destructive/20 hover:bg-destructive/40 text-destructive"
          title="Remover coletor"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded flex items-center justify-center shrink-0",
          isAvailable ? "bg-success/20" : "bg-destructive/20"
        )}>
          <Package className={cn(
            "w-4 h-4",
            isAvailable ? "text-success" : "text-destructive"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
            {device.barcode}
          </div>
          <div className="font-semibold text-sm truncate">
            {device.name}
          </div>

          {isAvailable ? (
            <div className="flex items-center gap-1.5 mt-2 text-xs neon-text-green">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
              LIVRE
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2 text-xs neon-text-red">
              <User className="w-3 h-3" />
              {device.currentOwner}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

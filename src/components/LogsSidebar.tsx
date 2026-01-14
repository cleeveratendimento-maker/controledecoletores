import { Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { LogEntry } from '@/types/device';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogsSidebarProps {
  logs: LogEntry[];
}

export const LogsSidebar = ({ logs }: LogsSidebarProps) => {
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma movimentação registrada
          </div>
        ) : (
          logs.map((log) => {
            const isSaida = log.action === 'SAÍDA';
            return (
              <div
                key={log.id}
                className={cn(
                  "border-l-2 pl-3 py-2",
                  isSaida ? "border-destructive" : "border-success"
                )}
              >
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>{format(log.timestamp, "dd/MM HH:mm", { locale: ptBR })}</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 font-semibold text-sm",
                  isSaida ? "neon-text-red" : "neon-text-green"
                )}>
                  {isSaida ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownLeft className="w-3 h-3" />
                  )}
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

import { Wifi } from 'lucide-react';

interface HeaderProps {
  total: number;
  emprestados: number;
}

export const Header = ({ total, emprestados }: HeaderProps) => {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Wifi className="w-5 h-5 text-primary" />
        </div>
        <h1 className="font-display font-black text-xl tracking-wider">
          AWS<span className="neon-text-cyan">COMMAND</span>
        </h1>
        <span className="text-xs text-muted-foreground font-mono">v5.0</span>
      </div>

      <div className="flex gap-8">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
          <div className="text-2xl font-mono font-bold text-foreground">{total}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Disponíveis</div>
          <div className="text-2xl font-mono font-bold neon-text-green">{total - emprestados}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-destructive">Em Uso</div>
          <div className="text-2xl font-mono font-bold neon-text-red">{emprestados}</div>
        </div>
      </div>
    </header>
  );
};

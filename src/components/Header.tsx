import { Sparkles, Package, Users, CheckCircle } from 'lucide-react';

interface HeaderProps {
  total: number;
  emprestados: number;
}

export const Header = ({ total, emprestados }: HeaderProps) => {
  const disponivel = total - emprestados;
  
  return (
    <header className="bg-gradient-to-r from-card via-card to-primary/5 border-b border-border px-6 py-5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Logo */}
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

        {/* Stats Cards */}
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

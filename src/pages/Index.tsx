import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { DeviceCard } from '@/components/DeviceCard';
import { ScanInput } from '@/components/ScanInput';
import { AddDeviceForm } from '@/components/AddDeviceForm';
import { LogsSidebar } from '@/components/LogsSidebar';
import { Notification } from '@/components/Notification';
import { useDevices } from '@/hooks/useDevices';
import { Package } from 'lucide-react';

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

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
    <div className="h-screen flex flex-col bg-background cyber-grid overflow-hidden">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Header total={stats.total} emprestados={stats.emprestados} />

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
              <ScanInput onScan={scanDevice} onNotification={showNotification} />
              <AddDeviceForm onAdd={addDevice} onNotification={showNotification} />
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-border">
            <input
              type="text"
              placeholder="Filtrar por nome, código ou responsável..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full max-w-md bg-input border border-border rounded px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Inventory */}
          <div className="flex-1 overflow-y-auto p-6">
            {devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="w-16 h-16 mb-4 opacity-30" />
                <h2 className="font-display text-xl mb-2">Nenhum Coletor Cadastrado</h2>
                <p className="text-sm text-center max-w-md">
                  Use o formulário acima para adicionar seus coletores Zebra ao sistema.
                  Escaneie os códigos de barras para controlar empréstimos e devoluções.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {borrowedDevices.length > 0 && (
                  <section>
                    <h2 className="text-xs uppercase tracking-widest text-destructive mb-3 font-display flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      Em Uso ({borrowedDevices.length})
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {borrowedDevices.map(device => (
                        <DeviceCard key={device.id} device={device} />
                      ))}
                    </div>
                  </section>
                )}

                {availableDevices.length > 0 && (
                  <section>
                    <h2 className="text-xs uppercase tracking-widest text-success mb-3 font-display flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      Disponíveis ({availableDevices.length})
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {availableDevices.map(device => (
                        <DeviceCard 
                          key={device.id} 
                          device={device} 
                          onRemove={handleRemove}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {filteredDevices.length === 0 && devices.length > 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum resultado para "{searchFilter}"
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Logs Sidebar */}
        <div className="hidden lg:block">
          <LogsSidebar logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default Index;

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
    <div className="min-h-screen flex flex-col bg-background">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Header total={stats.total} emprestados={stats.emprestados} />

      <div className="flex-1 flex">
        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Controls Section */}
          <div className="border-b border-border bg-gradient-to-b from-card/80 to-transparent">
            <div className="max-w-7xl mx-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ScanInput onScan={scanDevice} onNotification={showNotification} />
                <AddDeviceForm onAdd={addDevice} onNotification={showNotification} />
              </div>
              
              {/* Search */}
              <div className="mt-6">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nome, código ou responsável..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full max-w-lg bg-input border border-border rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
              {devices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Package className="w-12 h-12 text-primary/50" />
                  </div>
                  <h2 className="font-display text-2xl mb-3 text-foreground">Nenhum Equipamento</h2>
                  <p className="text-sm text-center max-w-md leading-relaxed">
                    Adicione equipamentos usando o formulário acima. 
                    Escaneie códigos de barras para controlar empréstimos e devoluções.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {borrowedDevices.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">
                          Em Uso ({borrowedDevices.length})
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {borrowedDevices.map(device => (
                          <DeviceCard key={device.id} device={device} />
                        ))}
                      </div>
                    </section>
                  )}

                  {availableDevices.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full bg-success" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-success">
                          Disponíveis ({availableDevices.length})
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                    <div className="text-center py-16 text-muted-foreground">
                      <p className="text-lg">Nenhum resultado para "{searchFilter}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Logs Sidebar */}
        <div className="hidden xl:block">
          <LogsSidebar logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default Index;

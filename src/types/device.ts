export interface Device {
  id: string;
  name: string;
  barcode: string;
  status: 'disponivel' | 'emprestado';
  currentOwner: string | null;
  createdAt: Date;
}

export interface LogEntry {
  id: string;
  deviceName: string;
  action: 'SAÍDA' | 'DEVOLUÇÃO';
  owner: string;
  timestamp: Date;
}

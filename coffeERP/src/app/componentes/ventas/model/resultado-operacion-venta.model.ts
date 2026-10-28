// LA CONSULTA PUEDE ENCONTRAR UNA ORDEN SIN APROBAR, EN REVISION, PAGADA O CANCELADA.
export interface ResultadoOperacionVenta {
  idVenta: string;
  estado: 'CREANDO' | 'CREADA' | 'REVISION' | 'PAGADA' | 'CANCELADA';
  mensaje: string;
  estadoCorreo?: string;
}

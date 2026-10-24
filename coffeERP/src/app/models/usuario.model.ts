import { NombreModulo } from './modulo.model';
// PERFIL PUBLICO DE LA CUENTA; NO INCLUYE LA CONTRASENA NI SU HASH.
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: 'ADMIN' | 'CAJERO';
  modulos: NombreModulo[];
}

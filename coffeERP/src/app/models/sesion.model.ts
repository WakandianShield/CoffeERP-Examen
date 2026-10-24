// RESPUESTA DEL ACCESO: TOKEN FIRMADO Y PERFIL PUBLICO.
import { Usuario } from './usuario.model';
export interface Sesion {
  token: string;
  usuario: Usuario;
}

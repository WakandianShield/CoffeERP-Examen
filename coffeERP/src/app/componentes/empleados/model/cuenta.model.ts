// DATOS PARA CREAR UNA CUENTA; LA CONTRASENA SOLO SE ENVIA AL REGISTRARLA.
import { NombreModulo } from '../../../models/modulo.model';
export interface Cuenta {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: string;
  modulos: NombreModulo[];
}

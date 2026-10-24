// CONSERVA LA SESION DE ESTA PESTANA Y CONSULTA AL SERVIDOR PARA VALIDAR AL USUARIO.
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { Sesion } from '../models/sesion.model';
import { NombreModulo, TODOS_LOS_MODULOS } from '../models/modulo.model';
@Injectable({ providedIn: 'root' })
export class ServicioAutenticacion {
  private clienteHttp = inject(HttpClient);
  private restauracion?: Promise<boolean>;
  usuario = signal<Usuario | null>(null);

  // RECUPERA EL TOKEN DE ESTA PESTANA; EL SERVIDOR DEBE VALIDARLO ANTES DE DAR ACCESO.
  token = signal(sessionStorage.getItem('coffe-token') || '');
  // ENVIA CORREO Y CONTRASENA; SI EL SERVIDOR LOS ACEPTA, GUARDA EL TOKEN Y EL PERFIL.
  async iniciarSesion(correo: string, contrasena: string) {
    const resultado = await firstValueFrom(
      this.clienteHttp.post<Sesion>('/api/autenticacion/iniciar-sesion', { correo, contrasena }),
    );
    // GUARDA EL TOKEN PARA CONSERVAR LA SESION AL RECARGAR; NO GUARDA LA CONTRASENA.
    sessionStorage.setItem('coffe-token', resultado.token);
    this.token.set(resultado.token);
    this.usuario.set(resultado.usuario);
  }
  // USA EL TOKEN GUARDADO PARA RECUPERAR EL PERFIL AL RECARGAR LA PAGINA; LO BORRA SI YA NO ES VALIDO.
  async restaurarSesion() {
    if (this.estaAutenticado()) return true;
    if (!this.token()) return false;
    // REUTILIZA LA CONSULTA SI MAS DE UN FILTRO NECESITA RECUPERAR EL PERFIL A LA VEZ.
    if (!this.restauracion) {
      this.restauracion = firstValueFrom(this.clienteHttp.get<Usuario>('/api/autenticacion/perfil'))
        .then((usuario) => {
          this.usuario.set(usuario);
          return true;
        })
        .catch(() => {
          this.cerrarSesion();
          return false;
        })
        .finally(() => {
          this.restauracion = undefined;
        });
    }
    return this.restauracion;
  }
  // BORRA EL TOKEN DE ESTA PESTANA Y LIMPIA LOS DATOS DEL USUARIO EN MEMORIA.
  cerrarSesion() {
    sessionStorage.removeItem('coffe-token');
    this.token.set('');
    this.usuario.set(null);
  }

  // UN TOKEN GUARDADO NECESITA TAMBIEN UN PERFIL RECUPERADO DEL SERVIDOR.
  estaAutenticado() {
    return !!this.token() && !!this.usuario();
  }

  // UNA LISTA VACIA PERMITE CUALQUIER ROL AUTENTICADO; LAS RUTAS DECLARAN SUS ROLES.
  tieneRol(rolesPermitidos: string[]) {
    const usuario = this.usuario();
    return !!usuario && (!rolesPermitidos.length || rolesPermitidos.includes(usuario.rol));
  }

  // ADMIN ACCEDE A TODOS LOS MODULOS; LAS DEMAS CUENTAS NECESITAN EL PERMISO ASIGNADO.
  tieneModulo(modulo: NombreModulo) {
    const usuario = this.usuario();
    return !!usuario && (usuario.rol === 'ADMIN' || usuario.modulos.includes(modulo));
  }

  // ELIGE UNA PANTALLA PERMITIDA PARA EL ACCESO Y LAS REDIRECCIONES DEL MENU.
  inicio() {
    const rutas: Record<NombreModulo, string> = {
      VENTAS: '/ventas',
      COMPRAS: '/compras',
      INVENTARIO: '/inventario',
      RRHH: '/rrhh',
      FINANZAS: '/finanzas',
    };
    const modulo = TODOS_LOS_MODULOS.find((modulo) => this.tieneModulo(modulo));
    return modulo ? rutas[modulo] : '/iniciar-sesion';
  }
}

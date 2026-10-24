import { CuentasService } from './servicios/cuentas.service';
import { NominaService } from './servicios/nomina.service';
import { EmpleadosService } from './servicios/empleados.service';
// PANTALLA DE RECURSOS HUMANOS: EMPLEADOS, SALARIOS PAGADOS Y CUENTAS DE ACCESO AL SISTEMA.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoFormularioService } from '../../services/estado-formulario.service';
import { Empleado } from './model/empleado.model';
import { Nomina } from './model/nomina.model';
import { NombreModulo } from '../../models/modulo.model';
import { TODOS_LOS_MODULOS } from '../../models/modulo.model';
@Component({
  selector: 'app-empleados',
  providers: [EstadoFormularioService],
  imports: [FormsModule],
  templateUrl: './empleados.component.html',
  styleUrl: './empleados.component.css',
})
export class EmpleadosComponent implements OnInit {
  formulario = inject(EstadoFormularioService);
  empleadosService = inject(EmpleadosService);
  nominaService = inject(NominaService);
  cuentasService = inject(CuentasService);
  empleados = signal<Empleado[]>([]);
  nominas = signal<Nomina[]>([]);
  empleado = { nombre: '', puesto: '', correo: '', activo: true };
  salario = 0;
  idEdicion = 0;
  idEmpleado = 0;
  periodo = new Date().toISOString().slice(0, 7);
  // LA CUENTA DE ACCESO ES INDEPENDIENTE DEL EXPEDIENTE LABORAL DEL EMPLEADO.
  usuario = {
    nombre: '',
    correo: '',
    contrasena: '',
    rol: 'CAJERO',
    modulos: ['VENTAS'] as NombreModulo[],
  };
  opcionesModulos: { clave: NombreModulo; etiqueta: string }[] = [
    { clave: 'VENTAS', etiqueta: 'Ventas' },
    { clave: 'COMPRAS', etiqueta: 'Compras y proveedores' },
    { clave: 'INVENTARIO', etiqueta: 'Inventario' },
    { clave: 'RRHH', etiqueta: 'Recursos humanos' },
    { clave: 'FINANZAS', etiqueta: 'Finanzas y contabilidad' },
  ];
  // AL ABRIR LA PANTALLA, CARGA LOS DATOS INICIALES DESDE EL SERVIDOR.
  ngOnInit() {
    void this.formulario.ejecutar(() => this.cargar(), '');
  }
  // RECARGA LOS LISTADOS DEL SERVIDOR PARA MOSTRAR LOS DATOS ACTUALES.
  async cargar() {
    this.empleados.set(await this.empleadosService.listar());
    this.nominas.set(await this.nominaService.listar());
  }
  // VACIA EL FORMULARIO Y QUITA EL ID DE EDICION PARA PODER CREAR UN REGISTRO NUEVO.
  limpiar() {
    this.idEdicion = 0;
    this.salario = 0;
    this.empleado = { nombre: '', puesto: '', correo: '', activo: true };
  }
  // COPIA EL REGISTRO AL FORMULARIO, CONVIERTE CENTAVOS A PESOS Y SUBE LA PAGINA PARA EDITARLO.
  editar(e: Empleado) {
    this.idEdicion = e.id;
    this.salario = e.salarioCentavos / 100;
    this.empleado = { nombre: e.nombre, puesto: e.puesto, correo: e.correo, activo: !!e.activo };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  // CONVIERTE EL IMPORTE A CENTAVOS Y CREA O ACTUALIZA EL REGISTRO; DESPUES RECARGA LOS DATOS.
  guardar() {
    void this.formulario.ejecutar(async () => {
      const datos = { ...this.empleado, salarioCentavos: Math.round(this.salario * 100) };
      if (this.idEdicion) await this.empleadosService.actualizar(this.idEdicion, datos);
      else await this.empleadosService.crear(datos);
      this.limpiar();
      await this.cargar();
    });
  }
  // ENVIA EMPLEADO Y PERIODO; EL SALARIO A PAGAR LO CONSULTA EL SERVIDOR, NO LO FIJA EL FORMULARIO.
  pagar() {
    void this.formulario.ejecutar(async () => {
      await this.nominaService.pagar(this.idEmpleado, this.periodo);
      await this.cargar();
    }, 'Salario registrado en finanzas');
  }
  // AGREGA O QUITA UN MODULO DE LOS PERMISOS ELEGIDOS PARA LA NUEVA CUENTA.
  alternarModulo(clave: NombreModulo) {
    this.usuario.modulos = this.usuario.modulos.includes(clave)
      ? this.usuario.modulos.filter((m) => m !== clave)
      : [...this.usuario.modulos, clave];
  }
  // EXIGE AL MENOS UN MODULO PARA CAJEROS; LOS ADMINISTRADORES TIENEN ACCESO COMPLETO.
  modulosValidos() {
    return this.usuario.rol === 'ADMIN' || this.usuario.modulos.length > 0;
  }
  // ENVIA LA CUENTA Y SUS PERMISOS; EL SERVIDOR VERIFICA QUE QUIEN LA CREA SEA ADMINISTRADOR.
  crearCuenta() {
    void this.formulario.ejecutar(async () => {
      await this.cuentasService.crearCuenta({
        ...this.usuario,
        modulos: this.usuario.rol === 'ADMIN' ? [...TODOS_LOS_MODULOS] : this.usuario.modulos,
      });
      this.usuario = { nombre: '', correo: '', contrasena: '', rol: 'CAJERO', modulos: ['VENTAS'] };
    }, 'Cuenta creada');
  }
}

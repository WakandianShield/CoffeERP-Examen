import { FinanzasService } from './servicios/finanzas.service';
// PANTALLA DE FINANZAS: PRESENTA TOTALES Y PERMITE CAPTURAR INGRESOS O GASTOS ADICIONALES.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoFormularioService } from '../../services/estado-formulario.service';
import { ResumenFinanzas } from './model/resumen-finanzas.model';
@Component({
  selector: 'app-finanzas',
  providers: [EstadoFormularioService],
  imports: [FormsModule],
  templateUrl: './finanzas.component.html',
  styleUrl: './finanzas.component.css',
})
export class FinanzasComponent implements OnInit {
  formulario = inject(EstadoFormularioService);
  finanzasService = inject(FinanzasService);
  datos = signal<ResumenFinanzas>({
    movimientos: [],
    ingresos: 0,
    egresos: 0,
  });
  movimiento = { tipo: 'EGRESO', concepto: '' };
  importe = 0;
  // AL ABRIR LA PANTALLA, CARGA LOS DATOS INICIALES DESDE EL SERVIDOR.
  ngOnInit() {
    void this.formulario.ejecutar(() => this.cargar(), '');
  }
  // RECARGA LOS LISTADOS DEL SERVIDOR PARA MOSTRAR LOS DATOS ACTUALES.
  async cargar() {
    this.datos.set(await this.finanzasService.resumen());
  }
  // CONVIERTE PESOS A CENTAVOS, ENVIA EL MOVIMIENTO MANUAL Y ACTUALIZA LOS TOTALES.
  guardar() {
    void this.formulario.ejecutar(async () => {
      await this.finanzasService.crear({
        ...this.movimiento,
        importeCentavos: Math.round(this.importe * 100),
      });
      this.movimiento.concepto = '';
      this.importe = 0;
      await this.cargar();
    });
  }
}

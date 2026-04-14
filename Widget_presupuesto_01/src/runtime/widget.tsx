import { React, DataSourceManager } from 'jimu-core'
import { type AllWidgetProps } from 'jimu-core'
import { type FeatureLayerDataSource } from 'jimu-arcgis'

const { useState } = React

const CAMPO_PRIORIDAD = 'TOTAL_COE'
const CAMPO_COSTE = 'COSTE_ACT'
const CAMPO_NOMBRE = 'ASSETNUM'
const LIMITE = 2000

export default function Widget (props: AllWidgetProps<any>) {
  const [presupuesto, setPresupuesto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
  const [costeTotal, setCosteTotal] = useState(0)
  const [calculado, setCalculado] = useState(false)
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false)

  const aplicar = async () => {
    const cantidad = parseFloat(presupuesto.replace(',', '.'))

    if (isNaN(cantidad) || cantidad <= 0) {
      setError('Introduce un presupuesto válido.')
      return
    }

    if (!props.useDataSources || props.useDataSources.length === 0) {
      setError('Configura una capa en el widget desde el panel de configuración.')
      return
    }

    setCargando(true)
    setError('')
    setResultados([])
    setCalculado(false)
    setLimiteAlcanzado(false)

    try {
      const ds = DataSourceManager.getInstance().getDataSource(
        props.useDataSources[0].dataSourceId
      ) as FeatureLayerDataSource

      if (!ds) {
        setError('No se pudo obtener la capa. Verifica la configuración.')
        setCargando(false)
        return
      }

      const queryResult = await ds.query({
        where: '1=1',
        outFields: ['*'],
        orderByFields: `${CAMPO_PRIORIDAD} DESC`,
        returnGeometry: false
      })

      if (!queryResult || !queryResult.records || queryResult.records.length === 0) {
        setError('La capa no devolvió registros. Comprueba los filtros y la conexión.')
        setCargando(false)
        return
      }

      let acumulado = 0
      const seleccionados: any[] = []
      const ids: string[] = []

      for (const record of queryResult.records) {
        if (seleccionados.length >= LIMITE) {
          setLimiteAlcanzado(true)
          break
        }

        const data = record.getData()
        const coste = parseFloat(data[CAMPO_COSTE]) || 0

        if (coste > 0 && acumulado + coste <= cantidad) {
          acumulado += coste

          seleccionados.push({
            id: record.getId(),
            nombre: data[CAMPO_NOMBRE] || record.getId(),
            prioridad: data[CAMPO_PRIORIDAD],
            coste
          })

          ids.push(record.getId())
        }
      }

      // Selección real en Experience Builder
      if (ids.length > 0) {
        ds.selectRecordsByIds(ids)
      } else {
        ds.clearSelection()
      }

      setResultados(seleccionados)
      setCosteTotal(acumulado)
      setCalculado(true)

    } catch (e: any) {
      setError('Error al consultar la capa: ' + (e?.message || 'fallo desconocido'))
    }

    setCargando(false)
  }

  const limpiar = () => {
    setPresupuesto('')
    setResultados([])
    setCosteTotal(0)
    setCalculado(false)
    setError('')
    setLimiteAlcanzado(false)

    if (props.useDataSources?.length) {
      const ds = DataSourceManager.getInstance().getDataSource(
        props.useDataSources[0].dataSourceId
      ) as FeatureLayerDataSource

      if (ds) {
        ds.clearSelection()
      }
    }
  }

  const cantidad = parseFloat(presupuesto.replace(',', '.')) || 0
  const restante = cantidad - costeTotal

  return (
    <div style={{ padding: '12px', fontFamily: 'sans-serif', fontSize: '13px' }}>

      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        Presupuesto (€)
      </div>

      <input
        type="number"
        placeholder="Ej: 50000"
        value={presupuesto}
        onChange={(e) => {
          setPresupuesto(e.target.value)
          setError('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') aplicar()
        }}
        style={{ width: '100%', padding: '6px', marginBottom: '8px', boxSizing: 'border-box' }}
      />

      <button
        onClick={aplicar}
        disabled={cargando || !presupuesto}
        style={{ width: '100%', padding: '8px', marginBottom: '4px', cursor: cargando || !presupuesto ? 'not-allowed' : 'pointer' }}
      >
        {cargando ? 'Calculando...' : 'Aplicar'}
      </button>

      {calculado && (
        <button
          onClick={limpiar}
          style={{ width: '100%', padding: '6px', cursor: 'pointer' }}
        >
          Limpiar
        </button>
      )}

      {error && (
        <div style={{ color: 'red', marginTop: '8px' }}>
          {error}
        </div>
      )}

      {calculado && (
        <div style={{ marginTop: '12px' }}>
          <div>
            Elementos seleccionados: <strong>{resultados.length}</strong>
          </div>

          <div>
            Coste total:{' '}
            <strong>
              {costeTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </strong>
          </div>

          <div>
            Restante:{' '}
            <strong>
              {restante.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </strong>
          </div>

          {limiteAlcanzado && (
            <div style={{ color: 'orange', marginTop: '8px' }}>
              ⚠️ Se ha alcanzado el límite de {LIMITE} elementos procesados
            </div>
          )}

          <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {resultados.length === 0
              ? (
              <div style={{ color: '#888' }}>
                Ningún elemento cabe en el presupuesto indicado.
              </div>
                )
              : (
                  resultados.map((item, i) => (
                <div
                  key={item.id}
                  style={{ borderBottom: '1px solid #eee', padding: '4px 0' }}
                >
                  <strong>{i + 1}. {item.nombre}</strong> —{' '}
                  {item.coste.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  <span style={{ color: '#7b1717', marginLeft: '6px' }}>
                    (Coeficiente: {item.prioridad?.toFixed(2) ?? '0.00'})
                  </span>
                </div>
                  ))
                )}
          </div>
        </div>
      )}
    </div>
  )
}

import { React, type AllWidgetProps } from 'jimu-core'
import { loadArcGISJSAPIModules } from 'jimu-arcgis'

const { useState } = React

const CAPA_URL = 'https://services5.arcgis.com/zZdalPw2d0tQx8G1/arcgis/rest/services/MAPA_AILANTO_WFL1/FeatureServer/0'
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

  const getToken = async () => {
    try {
      const [IdentityManager] = await loadArcGISJSAPIModules(['esri/identity/IdentityManager'])
      const credential = await IdentityManager.getCredential(CAPA_URL)
      return credential?.token || ''
    } catch (e) {
      console.warn('No se pudo obtener el token:', e)
      return ''
    }
  }

  const aplicar = async () => {
    const cantidad = parseFloat(presupuesto.replace(',', '.'))
    if (isNaN(cantidad) || cantidad <= 0) {
      setError('Introduce un presupuesto válido.')
      return
    }

    setCargando(true)
    setError('')
    setCalculado(false)
    setResultados([])
    setLimiteAlcanzado(false)

    try {
      const token = await getToken()

      const params = new URLSearchParams({
        where: '1=1',
        outFields: [CAMPO_PRIORIDAD, CAMPO_COSTE, CAMPO_NOMBRE, 'OBJECTID'].join(','),
        orderByFields: CAMPO_PRIORIDAD + ' DESC',
        returnGeometry: 'true',
        f: 'json'
      })

      if (token) params.append('token', token)

      const respuesta = await fetch(`${CAPA_URL}/query?${params.toString()}`)
      const datos = await respuesta.json()

      if (datos.error) {
        setError('Error de la capa: ' + datos.error.message)
        setCargando(false)
        return
      }

      const elementos = datos.features || []
      if (elementos.length === 0) {
        setError('La capa no tiene elementos.')
        setCargando(false)
        return
      }

      let acumulado = 0
      const seleccionados: any[] = []

      for (const el of elementos) {
        if (seleccionados.length >= LIMITE) {
          setLimiteAlcanzado(true)
          break
        }

        const a = el.attributes
        const coste = parseFloat(a[CAMPO_COSTE]) || 0

        if (coste > 0 && acumulado + coste <= cantidad) {
          acumulado += coste
          seleccionados.push({
            id: a.OBJECTID,
            nombre: a[CAMPO_NOMBRE] || a.OBJECTID,
            prioridad: a[CAMPO_PRIORIDAD],
            coste
          })
        }
      }

      setResultados(seleccionados)
      setCosteTotal(acumulado)
      setCalculado(true)

    } catch (e: any) {
      setError('Error al consultar la capa: ' + (e?.message || 'revisa la conexión.'))
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
  }

  const cantidad = parseFloat(presupuesto.replace(',', '.')) || 0
  const restante = cantidad - costeTotal

  return (
    <div style={{ padding: '12px', fontFamily: 'sans-serif', fontSize: '13px' }}>

      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Presupuesto (€)</div>

      <input
        type="number"
        placeholder="Ej: 50000"
        value={presupuesto}
        onChange={(e) => { setPresupuesto(e.target.value); setError('') }}
        onKeyDown={(e) => { if (e.key === 'Enter') aplicar() }}
        style={{ width: '100%', padding: '6px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '8px' }}
      />

      <button
        onClick={aplicar}
        disabled={cargando || !presupuesto}
        style={{ width: '100%', padding: '8px', marginBottom: '4px', cursor: 'pointer' }}
      >
        {cargando ? 'Calculando...' : 'Aplicar'}
      </button>

      {calculado && (
        <button onClick={limpiar} style={{ width: '100%', padding: '6px', cursor: 'pointer' }}>
          Limpiar
        </button>
      )}

      {error && (
        <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>
      )}

      {calculado && (
        <div style={{ marginTop: '12px' }}>
          <div>Elementos seleccionados: <strong>{resultados.length}</strong></div>
          <div>Coste total: <strong>{costeTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>
          <div>Restante: <strong>{restante.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</strong></div>

          {/* Aviso */}
          {limiteAlcanzado && (
            <div style={{ color: 'red', marginTop: '8px' }}>
              ⚠️ Se ha alcanzado el límite máximo de 2000 elementos
            </div>
          )}

          <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {resultados.length === 0
              ? <div style={{ color: '#888' }}>Ningún elemento cabe en el presupuesto.</div>
              : resultados.map((item, i) => (
                <div key={item.id} style={{ borderBottom: '1px solid #eee', padding: '4px 0' }}>
                  <strong>{i + 1}. ID Auditoria {item.nombre}</strong> — {item.coste.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  <span style={{ color: '#7b1717', marginLeft: '6px' }}>
                    (Coeficiente prioridad: {item.prioridad?.toFixed(2) ?? '0.00'})
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

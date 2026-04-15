import { React, type AllWidgetProps } from 'jimu-core' 

import './widget.css' 

 

// uso useState para guardar datos del formulario 

const { useState } = React 

 

// URL de la capa de ArcGIS 

const CAPA_URL = 'https://services5.arcgis.com/zZdalPw2d0tQx8G1/arcgis/rest/services/MAPA_AILANTO_WFL1/FeatureServer/0' 

 

// nombres de los campos que voy a usar 

const CAMPO_PRIORIDAD = 'TOTAL_COE' 

const CAMPO_COSTE = 'COSTE_ACT' 

const CAMPO_NOMBRE = 'ASSETNUM' 

 

// límite de resultados 

const LIMITE = 2000 

 

export default function Widget(props: AllWidgetProps<any>) { 

 

  // estados básicos 

  const [presupuesto, setPresupuesto] = useState('') 

  const [cargando, setCargando] = useState(false) 

  const [error, setError] = useState('') 

  const [resultados, setResultados] = useState<any[]>([]) 

  const [costeTotal, setCosteTotal] = useState(0) 

  const [calculado, setCalculado] = useState(false) 

 

  // función que se ejecuta al pulsar "Aplicar" 

  const aplicar = async () => { 

 

    // convierto el texto a número 

    const cantidad = parseFloat(presupuesto.replace(',', '.')) 

 

    // validación simple 

    if (isNaN(cantidad) || cantidad <= 0) { 

      setError('Introduce un presupuesto válido.') 

      return 

    } 

 

    // preparo estados 

    setCargando(true) 

    setError('') 

    setResultados([]) 

    setCalculado(false) 

 

    try { 

      // preparo la query para ArcGIS 

      const params = new URLSearchParams({ 

        where: '1=1', 

        outFields: `${CAMPO_PRIORIDAD},${CAMPO_COSTE},${CAMPO_NOMBRE},OBJECTID`, 

        orderByFields: `${CAMPO_PRIORIDAD} DESC`, 

        returnGeometry: 'false', 

        resultRecordCount: '2000', 

        f: 'json' 

      }) 

 

      // llamada a la API 

      const response = await fetch(`${CAPA_URL}/query?${params.toString()}`) 

      const data = await response.json() 

 

      if (data.error) throw new Error(data.error.message) 

 

      const elementos = data.features || [] 

 

      let acumulado = 0 

      const seleccionados: any[] = [] 

 

      // recorremos los elementos 

      for (const el of elementos) { 

 

        if (seleccionados.length >= LIMITE) break 

 

        const a = el.attributes 

        const coste = Number(a[CAMPO_COSTE]) || 0 

 

        // si entra en el presupuesto lo añadimos 

        if (coste > 0 && acumulado + coste <= cantidad) { 

 

          acumulado += coste 

 

          seleccionados.push({ 

            id: a.OBJECTID, 

            nombre: a[CAMPO_NOMBRE] || a.OBJECTID, 

            prioridad: a[CAMPO_PRIORIDAD] || 0, 

            coste 

          }) 

        } 

      } 

 

      // guardamos resultados 

      setResultados(seleccionados) 

      setCosteTotal(acumulado) 

      setCalculado(true) 

 

    } catch (e: any) { 

      setError('Error: ' + (e.message || 'Error desconocido')) 

    } 

 

    setCargando(false) 

  } 

 

  // botón limpiar 

  const limpiar = () => { 

    setPresupuesto('') 

    setResultados([]) 

    setCosteTotal(0) 

    setCalculado(false) 

    setError('') 

  } 

 

  // cálculo de dinero restante 

  const restante = (parseFloat(presupuesto) || 0) - costeTotal 

 

  return ( 

    <div className="widget-container"> 

 

      <div className="card"> 

 

        {/* título */} 

        <div className="title"> 

          Calculadora del Presupuesto 

        </div> 

 

        {/* texto */} 

        <div className="label"> 

          Inserte un presupuesto: 

        </div> 

 

        {/* input */} 

        <input 

          type="number" 

          value={presupuesto} 

          onChange={(e) => setPresupuesto(e.target.value)} 

          className="input" 

        /> 

 

        {/* botones */} 

        <div className="buttons"> 

 

          <button onClick={aplicar} className="btn-primary"> 

            {cargando ? 'Calculando...' : 'Aplicar'} 

          </button> 

 

          {calculado && ( 

            <button onClick={limpiar} className="btn-danger"> 

              Limpiar 

            </button> 

          )} 

 

        </div> 

 

        {/* error */} 

        {error && <div className="error">{error}</div>} 

 

        {/* resultados */} 

        {calculado && ( 

          <div className="results"> 

 

            <div className="summary"> 

              <div>Ailantos posibles: <b>{resultados.length}</b></div> 

              <div>Coste total: <b>{costeTotal} €</b></div> 

              <div>Restante: <b>{restante} €</b></div> 

            </div> 

 

            {/* lista */} 

            <div className="list"> 

              {resultados.map((item, i) => ( 

                <div key={item.id} className="list-item"> 

                  <b>{i + 1}. Id: {item.nombre}</b> 

                </div> 

              ))} 

            </div> 

 

          </div> 

        )} 

 

      </div> 

    </div> 

  ) 

} 
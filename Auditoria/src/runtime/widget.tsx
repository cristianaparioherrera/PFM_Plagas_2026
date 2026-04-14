import { React, type AllWidgetProps } from 'jimu-core'
import { JimuMapViewComponent } from 'jimu-arcgis'
import { useState, useEffect } from 'react'
import './widget.css'

// este es el componente principal del widget
export default function Widget(props: AllWidgetProps<any>) {

  // aquí guardo la vista del mapa
  const [view, setView] = useState<any>(null)

  // aquí guardo la info del árbol cuando hago clic
  const [info, setInfo] = useState<any>(null)

  useEffect(() => {

    // si todavía no hay mapa, no hago nada
    if (!view) return

    // quito el popup típico del mapa porque quiero hacer el mío
    view.popup.autoOpenEnabled = false

    // cuando hago click en el mapa...
    const handler = view.on("click", async (event) => {

      // intento ver si he pinchado algo
      const res = await view.hitTest(event)

      // si no hay resultados, salgo
      if (!res.results.length) return

      const graphic = res.results[0].graphic
      const layer = graphic.layer

      console.log("CAPA:", layer.title)

      // compruebo que es la capa que me interesa (AILANTO)
      if (!layer.title.includes("AILANTO")) return

      // hago una query para sacar los datos completos
      const query = layer.createQuery()
      query.objectIds = [graphic.attributes.OBJECTID]
      query.outFields = ["*"]

      const data = await layer.queryFeatures(query)

      // si no hay datos, salgo
      if (!data.features.length) return

      const attr = data.features[0].attributes

      // guardo los datos en el estado
      setInfo({
        codigo: attr.ASSETNUM,
        especie: attr.NBRE_ESP,
        perimetro: attr.PERIMETRO,
        altura: attr.ALTURA_TOT,
        distrito: attr.NBRE_DTO,
        barrio: attr.NUM_BARRIO,
        x: attr.X,
        y: attr.Y,
        coef: attr.TOTAL_COE
      })

      // hago zoom al punto que he clicado
      view.goTo({
        target: data.features[0].geometry,
        zoom: 18
      })

    })

    // limpio el evento cuando cambie algo
    return () => handler.remove()

  }, [view])

  return (
    <>
      <div className="widget-container">

        <div className="card">

          <div className="title">
            INFORMACIÓN DEL AILANTO
          </div>

          
          {!info ? (
            <div className="empty">
              Haz clic en un punto del mapa
            </div>
          ) : (
            // si hay info, la muestro
            <div className="summary">

              <div><b>CÓDIGO AUDITORÍA:</b> {info.codigo}</div>
              <div><b>NOMBRE ESPECIE:</b> {info.especie}</div>
              <div><b>PERÍMETRO:</b> {info.perimetro}</div>
              <div><b>ALTURA TOTAL:</b> {info.altura}</div>
              <div><b>DISTRITO:</b> {info.distrito}</div>
              <div><b>BARRIO:</b> {info.barrio}</div>
              <div><b>COORDENADAS X:</b> {info.x}</div>
              <div><b>COORDENADAS Y:</b> {info.y}</div>
              <div><b>COEFICIENTE TOTAL:</b> {info.coef}</div>

            </div>
          )}

        </div>
      </div>

      
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={(jmv) => setView(jmv.view)}
      />
    </>
  )
}
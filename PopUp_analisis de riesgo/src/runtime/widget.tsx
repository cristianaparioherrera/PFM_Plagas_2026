import { React, type AllWidgetProps } from 'jimu-core'; 

import { JimuMapViewComponent } from 'jimu-arcgis'; 

import { useState, useEffect } from 'react'; 

import './widget.css'; 

 

const Widget = (props: AllWidgetProps<any>) => { 

 

  const [view, setView] = useState<any>(null); 

 

  const [info, setInfo] = useState({ 

    tipo: null, 

    nombre: "Selecciona un equipamiento", 

    direccion: "", 

    web: "" 

  }); 

 

  useEffect(() => { 

 

    if (!view) return; 

 

    view.popup.autoOpenEnabled = false; 

 

    const handler = view.on("click", async (event) => { 

 

      const res = await view.hitTest(event); 

 

      if (!res.results.length) return; 

 

      const graphic = res.results[0].graphic; 

      const layer = graphic.layer; 

 

      let tipo = ""; 

 

      if (layer.title === "Hospitales") tipo = "hospital"; 

      if (layer.title === "Centros de Salud") tipo = "centro"; 

      if (layer.title === "Parques Infantiles") tipo = "parque"; 

      if (layer.title === "Colegios") tipo = "colegio"; 

 

      if (!tipo) return; 

 

      

      const query = layer.createQuery(); 

      query.objectIds = [graphic.attributes.OBJECTID]; 

      query.outFields = ["*"]; 

 

      const data = await layer.queryFeatures(query); 

 

      if (!data.features.length) return; 

 

      const attr = data.features[0].attributes; 

 

      let nombre = ""; 

      let direccion = ""; 

      let web = ""; 

 

      if (tipo === "hospital") { 

        nombre = attr.DESCR || attr.NOMBRE || ""; 

        direccion = attr.DIRECCION || ""; 

        web = attr.URL || ""; 

      } 

 

      if (tipo === "centro") { 

        nombre = attr.ETIQUETA || attr.NOMBRE || ""; 

      } 

 

      if (tipo === "parque") { 

        nombre = `PARQUE INFANTIL DE ${attr.TIPO_VIA || ""} ${attr.NOM_VIA || ""}`; 

      } 

 

      if (tipo === "colegio") { 

        nombre = attr.NOMBRE || ""; 

      } 

 

      setInfo({ 

        tipo, 

        nombre, 

        direccion, 

        web 

      }); 

 

      view.goTo({ 

        target: data.features[0].geometry, 

        zoom: 17 

      }); 

 

    }); 

 

    return () => handler.remove(); 

 

  }, [view]); 

 

  return ( 

    <> 

      <Popup {...info} /> 

 

      <JimuMapViewComponent 

        useMapWidgetId={props.useMapWidgetIds?.[0]} 

        onActiveViewChange={(jmv) => setView(jmv.view)} 

      /> 

    </> 

  ); 

}; 

 

export default Widget; 

 

// Creación Pop up 

 

const Popup = ({ tipo, nombre, direccion, web }) => { 

 

  let img = ""; 

 

  if (tipo === "hospital") img = "https://www.comunidad.madrid/sites/default/files/styles/image_style_16_9/public/doc/sanidad/comu/2020_12_02_fotos_entrada_doctor_esquerdo_4_0.jpg"; 

  if (tipo === "centro") img = "https://tse4.mm.bing.net/th/id/OIP.0zxtvEMWeiwkBKVxVtfhowHaEK"; 

  if (tipo === "parque") img = "https://offloadmedia.feverup.com/madridsecreto.co/wp-content/uploads/2018/12/08102201/parques-infantiles-alcobendas-oceano-1024x597.jpg"; 

  if (tipo === "colegio") img = "https://i.pinimg.com/736x/84/7b/64/847b64300e9589976cfcf33bc76107be--centre.jpg"; 

 

  return ( 

    <div className="popupBox"> 

      {img && <img src={img} className="popupImg" />} 

 

      <div className={tipo ? "popupContent" : "popupContentCentered"}> 

        <div className="popupTitle">{nombre}</div> 

 

        {direccion && <div>{direccion}</div>} 

 

        {web && ( 

          <a href={web} target="_blank" className="popupLink"> 

             Web 

          </a> 

        )} 

      </div> 

    </div> 

  ); 

}; 
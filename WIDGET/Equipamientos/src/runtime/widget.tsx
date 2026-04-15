import React, { useState, useEffect, useRef } from 'react';
import { type AllWidgetProps } from 'jimu-core';
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis';

import './widget.css';

import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import * as projection from "@arcgis/core/geometry/projection";
import Graphic from "@arcgis/core/Graphic";

const Widget = (props: AllWidgetProps<any>) => {

  const [jimuMapView, setJimuMapView] = useState<JimuMapView | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("Hospitales");
  const [numeroRatas, setNumeroRatas] = useState(0);
  const [riesgo, setRiesgo] = useState("BAJO");

  const clickHandlerRef = useRef<any>(null);

  const activeViewChangeHandler = (view: JimuMapView) => {
    setJimuMapView(view);
  };

  const recorrerCapas = (layers: any, callback: (layer: any) => void) => {
    layers.forEach((layer) => {
      if (!layer) return;

      if (layer.type === "feature") {
        callback(layer);
      }

      if (layer.layers) {
        recorrerCapas(layer.layers, callback);
      }
    });
  };

  useEffect(() => {
    if (!jimuMapView) return;

    const map = jimuMapView.view.map;

    recorrerCapas(map.layers, (layer) => {
      if (!layer.title) return;

      if (layer.title === "Avisos Ratas") {
        layer.visible = true;
      }

      if (
        layer.title === "Hospitales" ||
        layer.title === "Centros de Salud" ||
        layer.title === "Colegios" ||
        layer.title === "Parques Infantiles"
      ) {
        layer.visible = (layer.title === tipoSeleccionado);
      }
    });

  }, [tipoSeleccionado, jimuMapView]);

  useEffect(() => {
    if (!jimuMapView) return;

    const view = jimuMapView.view;
    view.graphics.removeAll();

  }, [tipoSeleccionado, jimuMapView]);

  const calcularRiesgo = (num: number, tipo: string) => {
    if (tipo === "Hospitales") {
      if (num === 0) return "BAJO";
      if (num <= 3) return "MEDIO";
      if (num <= 7) return "ALTO";
      return "MUY ALTO";
    } else {
      if (num === 0) return "BAJO";
      if (num <= 10) return "MEDIO";
      if (num <= 20) return "ALTO";
      return "MUY ALTO";
    }
  };

  useEffect(() => {
    if (!jimuMapView) return;

    const view = jimuMapView.view;

    if (clickHandlerRef.current) {
      clickHandlerRef.current.remove();
    }

    view.when(() => {
      clickHandlerRef.current = view.on("click", async (event) => {

        const map = view.map;

        let capaEquipamiento: any = null;
        let capaRatas: any = null;

        recorrerCapas(map.layers, (layer) => {
          if (layer.title === tipoSeleccionado) capaEquipamiento = layer;
          if (layer.title === "Avisos Ratas") capaRatas = layer;
        });

        if (!capaEquipamiento || !capaRatas) return;

        const response = await view.hitTest(event);

        const resultado = response.results.find(r =>
          r.type === "graphic" &&
          r.graphic?.layer === capaEquipamiento
        );

        if (!resultado) return;

        const feature = resultado.graphic;

        if (feature.geometry.type === "point") {
          view.goTo({ target: feature.geometry, zoom: 18 });
        }

        const distancia = tipoSeleccionado === "Colegios" ? 150 : 100;

        let geom = feature.geometry;

        if (view.type === "3d") {
          geom = projection.project(geom, view.spatialReference);
        }

        const buffer = geometryEngine.buffer(geom, distancia, "meters");

        view.graphics.removeAll();

        view.graphics.add(new Graphic({
          geometry: feature.geometry,
          symbol: {
            type: "simple-marker",
            color: "#00ffff",
            size: 8
          }
        }));

        const query = capaRatas.createQuery();
        query.geometry = buffer;
        query.spatialRelationship = "intersects";

        const result = await capaRatas.queryFeatures(query);

        const num = result.features.length;
        setNumeroRatas(num);

        const nivel = calcularRiesgo(num, tipoSeleccionado);
        setRiesgo(nivel);

        const color =
          nivel === "BAJO" ? [0, 255, 0, 0.3] :
          nivel === "MEDIO" ? [255, 255, 0, 0.35] :
          [255, 0, 0, 0.4];

        view.graphics.add(new Graphic({
          geometry: buffer,
          symbol: {
            type: "simple-fill",
            color: color
          }
        }));

        result.features.forEach(f => {
          f.symbol = {
            type: "simple-marker",
            color: "#CB542A",
            size: 5
          };
          view.graphics.add(f);
        });

      });
    });

    return () => {
      if (clickHandlerRef.current) {
        clickHandlerRef.current.remove();
      }
    };

  }, [jimuMapView, tipoSeleccionado]);

  const colorUI =
    riesgo === "BAJO" ? "#00ff00" :
    riesgo === "MEDIO" ? "#ffff00" :
    "#ff0000";

  if (!props.useMapWidgetIds?.length) {
    return <div style={{ padding: "20px" }}>Selecciona un mapa</div>;
  }

  return (
    <div className="widget-container">

      <div className="panel">
        <h2 className="panel-title">Análisis del riesgo</h2>

        <select
          value={tipoSeleccionado}
          onChange={(e) => setTipoSeleccionado(e.target.value)}
          className="select"
        >
          <option value="Hospitales">Hospitales</option>
          <option value="Centros de Salud">Centros de Salud</option>
          <option value="Colegios">Colegios</option>
          <option value="Parques Infantiles">Parques Infantiles</option>
        </select>

        <div className="card">
          <h3>Nº de ratas</h3>
          <div className="ratas-num">{numeroRatas}</div>
        </div>

        <div className="card">
          <h3>Riesgo</h3>
          <div className="riesgo-text" style={{ color: colorUI }}>
            {riesgo}
          </div>
        </div>
      </div>

      <div className="map-container">
        <JimuMapViewComponent
          useMapWidgetId={props.useMapWidgetIds[0]}
          onActiveViewChange={activeViewChangeHandler}
        />
      </div>

    </div>
  );
};

export default Widget;
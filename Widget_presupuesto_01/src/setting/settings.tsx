import { React, DataSourceTypes } from 'jimu-core'
import { DataSourceSelector, type AllWidgetSettingProps } from 'jimu-ui/advanced/data-source-selector'

export default function Setting (props: AllWidgetSettingProps<any>) {
  return (
    <div style={{ padding: '12px' }}>
      <h4>Selecciona la capa</h4>
      <DataSourceSelector
        types={[DataSourceTypes.FeatureLayer]}
        useDataSources={props.useDataSources}
        useDataSourcesEnabled={true}
        onChange={(useDataSources) => {
          props.onSettingChange({
            id: props.id,
            useDataSources
          })
        }}
        widgetId={props.id}
      />
    </div>
  )
}
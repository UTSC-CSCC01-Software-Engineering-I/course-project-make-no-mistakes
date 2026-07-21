import { act, render } from '@testing-library/react'

const mockMapInstances = []

const mockTerraDraw = {
  getMode: jest.fn(() => 'select'),
  getSnapshot: jest.fn(() => []),
  on: jest.fn(),
  updateFeatureGeometry: jest.fn(),
  removeFeatures: jest.fn(),
  addFeatures: jest.fn(),
}

const mockDrawControl = {
  getTerraDrawInstance: jest.fn(() => mockTerraDraw),
}

jest.mock('../config/mapData', () => ({
  __esModule: true,
  PROVINCE_MAP_DATA: {
    ab: {
      label: 'Alberta',
      center: [-114.5, 53.5],
      zoom: 5,
      populationCentres: '/map-data/ab/ab_population_centres.geojson',
      designatedPlaces: '/map-data/ab/ab_designated_places.geojson',
      pollingDistricts:
        '/map-data/ab/fed2021_ab_polling_districts.geojson',
    },
    bc: {
      label: 'British Columbia',
      center: [-123.1, 49.8],
      zoom: 5,
      populationCentres: '/map-data/bc/bc_population_centres.geojson',
      designatedPlaces: '/map-data/bc/bc_designated_places.geojson',
      pollingDistricts:
        '/map-data/bc/fed2021_bc_polling_districts.geojson',
    },
    on: {
      label: 'Ontario',
      center: [-79.3832, 43.6532],
      zoom: 6,
      populationCentres: '/map-data/on/on_population_centres.geojson',
      designatedPlaces: '/map-data/on/on_designated_places.geojson',
      pollingDistricts: null,
    },
  },
}))

jest.mock(
  '@watergis/maplibre-gl-terradraw',
  () => ({
    __esModule: true,
    MaplibreTerradrawControl: jest.fn(() => mockDrawControl),
    getDefaultModeOptions: jest.fn(() => ({
      polygon: {},
      linestring: {},
    })),
  })
)

jest.mock('maplibre-gl', () => {
  function createMapInstance(options) {
    const eventHandlers = {}
    const sources = {}
    const layers = {}

    const instance = {
      __options: options,
      __sources: sources,
      __layers: layers,

      addControl: jest.fn(),
      remove: jest.fn(),
      easeTo: jest.fn(),
      setFeatureState: jest.fn(),
      queryRenderedFeatures: jest.fn(() => []),
      isStyleLoaded: jest.fn(() => true),

      once: jest.fn((eventName, handler) => {
        if (eventName === 'load') {
          handler()
        }
      }),

      on: jest.fn((eventName, handler) => {
        eventHandlers[eventName] = handler
      }),

      off: jest.fn((eventName, handler) => {
        if (eventHandlers[eventName] === handler) {
          delete eventHandlers[eventName]
        }
      }),

      __emit(eventName, event) {
        eventHandlers[eventName]?.(event)
      },

      addSource: jest.fn((sourceId, source) => {
        sources[sourceId] = source
      }),

      getSource: jest.fn((sourceId) => sources[sourceId]),

      addLayer: jest.fn((layer) => {
        layers[layer.id] = layer
      }),

      getLayer: jest.fn((layerId) => layers[layerId]),

      getStyle: jest.fn(() => ({
        layers: Object.values(layers),
      })),

      setLayoutProperty: jest.fn((layerId, property, value) => {
        const layer = layers[layerId]

        if (layer) {
          layer.layout = {
            ...(layer.layout || {}),
            [property]: value,
          }
        }
      }),
    }

    mockMapInstances.push(instance)
    return instance
  }

  const MockMap = jest.fn((options) => createMapInstance(options))

  const MockMarker = jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
  }))

  return {
    __esModule: true,
    default: {
      Map: MockMap,
      Marker: MockMarker,
      NavigationControl: jest.fn(),
    },
  }
})

jest.mock(
  '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css',
  () => ({})
)
jest.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))
jest.mock('./Map.css', () => ({}))

const Map = require('./Map').default

function latestMap() {
  return mockMapInstances[mockMapInstances.length - 1]
}

let consoleLogSpy

beforeEach(() => {
  consoleLogSpy = jest
    .spyOn(console, 'log')
    .mockImplementation(() => {})

  mockMapInstances.length = 0

  mockTerraDraw.getMode.mockReset()
  mockTerraDraw.getMode.mockReturnValue('select')

  mockTerraDraw.getSnapshot.mockReset()
  mockTerraDraw.getSnapshot.mockReturnValue([])

  jest.clearAllMocks()
})

afterEach(() => {
  consoleLogSpy.mockRestore()
})

describe('Map statistical layers', () => {
  test('uses the selected province center and loads population centres', () => {
    render(
      <Map
        mode="objection"
        province="ab"
        boundaryLayer="populationCentres"
      />
    )

    const map = latestMap()

    expect(map.__options.center).toEqual([-114.5, 53.5])
    expect(map.__options.zoom).toBe(5)

    expect(map.addSource).toHaveBeenCalledWith(
      'ab-population-centres',
      expect.objectContaining({
        type: 'geojson',
        data: '/map-data/ab/ab_population_centres.geojson',
        promoteId: 'DGUID',
        maxzoom: 14,
        buffer: 32,
      })
    )

    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ab-population-centres-fill',
        type: 'fill',
        source: 'ab-population-centres',
      })
    )

    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ab-population-centres-outline',
        type: 'line',
        source: 'ab-population-centres',
      })
    )

    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      'ab-population-centres-fill',
      'visibility',
      'visible'
    )

    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      'ab-population-centres-outline',
      'visibility',
      'visible'
    )
  })

  test('hides the previous layer when another layer is selected', () => {
    const { rerender } = render(
      <Map
        mode="objection"
        province="ab"
        boundaryLayer="populationCentres"
      />
    )

    const map = latestMap()
    map.setLayoutProperty.mockClear()

    rerender(
      <Map
        mode="objection"
        province="ab"
        boundaryLayer="designatedPlaces"
      />
    )

    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      'ab-population-centres-fill',
      'visibility',
      'none'
    )

    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      'ab-population-centres-outline',
      'visibility',
      'none'
    )

    expect(map.addSource).toHaveBeenCalledWith(
      'ab-designated-places',
      expect.objectContaining({
        data: '/map-data/ab/ab_designated_places.geojson',
      })
    )

    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      'ab-designated-places-fill',
      'visibility',
      'visible'
    )
  })

  test('recenters and loads a province-specific source after province changes', () => {
    const { rerender } = render(
      <Map
        mode="objection"
        province="ab"
        boundaryLayer="pollingDistricts"
      />
    )

    const map = latestMap()
    map.easeTo.mockClear()
    map.addSource.mockClear()

    rerender(
      <Map
        mode="objection"
        province="bc"
        boundaryLayer="pollingDistricts"
      />
    )

    expect(map.easeTo).toHaveBeenCalledWith({
      center: [-123.1, 49.8],
      zoom: 5,
      duration: 500,
    })

    expect(map.addSource).toHaveBeenCalledWith(
      'bc-polling-districts',
      expect.objectContaining({
        data: '/map-data/bc/fed2021_bc_polling_districts.geojson',
      })
    )
  })

  test('uses lighter styling for dense polling-district layers', () => {
    render(
      <Map
        mode="objection"
        province="ab"
        boundaryLayer="pollingDistricts"
      />
    )

    const map = latestMap()
    const fillLayer = map.__layers['ab-polling-districts-fill']
    const outlineLayer = map.__layers['ab-polling-districts-outline']

    expect(fillLayer.paint['fill-opacity']).toEqual([
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      0.45,
      0.06,
    ])

    expect(outlineLayer.paint['line-width']).toEqual([
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      3,
      0.6,
    ])
  })

  test('does not load polling districts when the province has no URL', () => {
    const warning = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {})

    render(
      <Map
        mode="objection"
        province="on"
        boundaryLayer="pollingDistricts"
      />
    )

    const map = latestMap()

    expect(map.addSource).not.toHaveBeenCalledWith(
      'on-polling-districts',
      expect.anything()
    )

    expect(warning).toHaveBeenCalledWith(
      '[BOUNDARY] pollingDistricts is unavailable for on'
    )

    warning.mockRestore()
  })

  test('returns population-centre statistics after clicking a feature', () => {
    const onRegionSelect = jest.fn()

    render(
      <Map
        mode="objection"
        province="ab"
        boundaryLayer="populationCentres"
        onRegionSelect={onRegionSelect}
      />
    )

    const map = latestMap()
    onRegionSelect.mockClear()

    const properties = {
      DGUID: '2021S051000480',
      PCNAME: 'Calgary',
      PCCLASS: 'Large urban population centre',
      PCTYPE: 'Population centre',
      LANDAREA: '123.45',
    }

    map.queryRenderedFeatures.mockReturnValue([
      {
        id: 17,
        properties,
      },
    ])

    act(() => {
      map.__emit('click', {
        point: { x: 100, y: 100 },
        lngLat: { lng: -114.07, lat: 51.05 },
      })
    })

    expect(map.queryRenderedFeatures).toHaveBeenCalledWith(
      { x: 100, y: 100 },
      {
        layers: ['ab-population-centres-fill'],
      }
    )

    expect(map.setFeatureState).toHaveBeenCalledWith(
      {
        source: 'ab-population-centres',
        id: 17,
      },
      { selected: true }
    )

    expect(onRegionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 17,
        provinceLabel: 'Alberta',
        geographyLabel: 'Population centre',
        name: 'Calgary',
        identifierLabel: 'DGUID',
        identifier: '2021S051000480',
        classification: 'Large urban population centre',
        regionType: 'Population centre',
        landArea: 123.45,
        properties,
      })
    )
  })

  test('returns polling-district statistics after clicking a feature', () => {
    const onRegionSelect = jest.fn()

    render(
      <Map
        mode="objection"
        province="ab"
        boundaryLayer="pollingDistricts"
        onRegionSelect={onRegionSelect}
      />
    )

    const map = latestMap()
    onRegionSelect.mockClear()

    const properties = {
      pd_id: '48001-001',
      PD_NUM: 1,
      ed_name: 'Banff—Airdrie',
      electors_est: 1234,
      total_votes: 987,
    }

    map.queryRenderedFeatures.mockReturnValue([
      {
        id: 31,
        properties,
      },
    ])

    act(() => {
      map.__emit('click', {
        point: { x: 50, y: 75 },
        lngLat: { lng: -114.2, lat: 51.1 },
      })
    })

    expect(onRegionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 31,
        provinceLabel: 'Alberta',
        geographyLabel: 'Federal polling district',
        name: 'Banff—Airdrie — Poll 1',
        identifierLabel: 'Polling district ID',
        identifier: '48001-001',
        classificationLabel: 'Electoral district',
        classification: 'Banff—Airdrie',
        typeLabel: 'Polling district number',
        regionType: 1,
        extraDetails: [
          {
            label: 'Estimated electors',
            value: '1,234',
          },
          {
            label: 'Total votes',
            value: '987',
          },
        ],
        properties,
      })
    )
  })

  test('does not open a statistics popup while polygon drawing is active', () => {
    const onRegionSelect = jest.fn()

    render(
      <Map
        mode="objection"
        province="ab"
        boundaryLayer="populationCentres"
        onRegionSelect={onRegionSelect}
      />
    )

    const map = latestMap()
    onRegionSelect.mockClear()
    map.queryRenderedFeatures.mockClear()
    mockTerraDraw.getMode.mockReturnValue('polygon')

    act(() => {
      map.__emit('click', {
        point: { x: 25, y: 25 },
        lngLat: { lng: -114, lat: 51 },
      })
    })

    expect(map.queryRenderedFeatures).not.toHaveBeenCalled()
    expect(onRegionSelect).not.toHaveBeenCalled()
  })
})
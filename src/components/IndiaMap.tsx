import React, { useEffect, useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { fetchStateWiseAnalytics } from '../services/api';
import { AggregatedMetrics } from '../types';

const INDIA_TOPO_JSON = "/india-states-fixed.json";

interface IndiaMapProps {
  onStateHover?: (metrics: AggregatedMetrics | null) => void;
}

const stateNameMapping: Record<string, string> = {
  "arunanchal pradesh": "arunachal pradesh",
  "jammu & kashmir": "jammu and kashmir",
  "andaman & nicobar island": "andaman & nicobar",
  "nct of delhi": "delhi",
  "dadara & nagar havelli": "dadra & nagar haveli and daman & diu"
};

const normalizeName = (name: string) => {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  return stateNameMapping[lower] || lower;
};

export const IndiaMap: React.FC<IndiaMapProps> = ({ onStateHover }) => {
  const [data, setData] = useState<AggregatedMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  useEffect(() => {
    fetchStateWiseAnalytics().then(res => {
      setData(res);
      setLoading(false);
      if (onStateHover) {
        const defaultState = res.find(d => normalizeName(d.name) === 'uttar pradesh');
        if (defaultState) onStateHover(defaultState);
      }
    }).catch(err => {
      console.error(err);
      setError(err.message || 'Unknown error');
      setLoading(false);
    });
  }, []);

  const colorScale = useMemo(() => {
    const maxVal = Math.max(...data.map(d => d.projectCount), 1);
    return scaleLinear<string>()
      .domain([0, maxVal])
      .range(["#ffedea", "#ff5233"]);
  }, [data]);

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center text-slate-500">Loading map...</div>;
  }
  
  if (error) {
    return <div className="h-[400px] flex flex-col items-center justify-center text-red-500">
      <p>Error loading map data:</p>
      <pre className="text-xs mt-2">{error}</pre>
    </div>;
  }

  return (
    <div className="relative w-full h-[500px]">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 950,
          center: [82.5, 23]
        }}
        width={600}
        height={500}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={INDIA_TOPO_JSON}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const rawName = geo.properties.st_nm || geo.properties.name || '';
              const normalizedGeoName = normalizeName(rawName);
              const stateData = normalizedGeoName ? data.find(d => normalizeName(d.name) === normalizedGeoName) : undefined;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={stateData ? colorScale(stateData.projectCount) : "#EEE"}
                  stroke="#FFF"
                  strokeWidth={0.75}
                  onMouseEnter={() => {
                    setHoveredState(geo.rsmKey);
                    if (onStateHover) {
                      onStateHover(stateData || {
                        name: stateName,
                        projectCount: 0,
                        originalCost: 0,
                        revisedCost: 0,
                        expenditure: 0,
                        completedDuringMonth: 0,
                        newlyAdded: 0
                      });
                    }
                  }}
                  style={{ outline: "none", cursor: "pointer" }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
};

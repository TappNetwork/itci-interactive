import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'gatsby';
import axios from 'axios';
import { geoPath } from 'd3-geo';
import { geoRobinson } from 'd3-geo-projection';
import { scaleLinear } from 'd3-scale';
import {
  interpolateGnBu,
  interpolatePuBuGn,
  interpolateYlGn,
  interpolateYlOrBr,
  interpolateYlOrRd,
  interpolateYlGnBu,
} from 'd3-scale-chromatic';
import { feature } from 'topojson-client';
import { kebabCase } from 'lodash';

import ranks from '../data/ranks.json';
import useIndexRankings from '../data/useIndexRankings';
import Divider from './Divider';
import Loader from './Loader';
import RankSelector from './world-map/RankSelector';
import MapLegend from './world-map/MapLegend';
import RankingsTable from './world-map/RankingsTable';
import RegionSelector from './world-map/RegionSelector';

const Container = styled.div`
  display: block;
  margin: 1rem 0 0;

  @media screen and (min-width: 800px) {
    display: grid;
    grid-gap: 1rem;
    grid-template: 330px auto / minmax(600px, 2fr) 1fr;
    grid-template-areas:
      'map data'
      'map region';
  }
`;

const WorldMap = () => {
  const [mapData, setMapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [region, setRegion] = useState('europe');
  const [ranking, setRanking] = useState('final_rank');
  const [activeCountry, setActiveCountry] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const result = await axios('/world.json');
      const { features } = feature(result.data, result.data.objects.countries);
      setMapData(features);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const regions = {
    europe: {
      name: 'Europe',
      scale: 600,
      translation: [600 / 2 - 100, 600 / 2 + 600],
    },
    northAmerica: {
      name: 'North America',
      scale: 350,
      translation: [600 / 2 + 500, 600 / 2 + 300],
    },
    southAmerica: {
      name: 'South America',
      scale: 350,
      translation: [600 / 2 + 350, 600 / 2 - 100],
    },
    world: {
      name: 'World',
      scale: 110,
      translation: [600 / 2 - 30, 600 / 2],
    },
  };
  const gradients = {
    final_rank: interpolateYlOrRd,
    corporate_rank: interpolateYlOrBr,
    income_rank: interpolateYlGn,
    consumption_rank: interpolatePuBuGn,
    property_rank: interpolateGnBu,
    international_rank: interpolateYlGnBu,
  };

  const rankings = useIndexRankings();

  const projection = geoRobinson()
    .scale(regions[region].scale)
    .translate(regions[region].translation);
  const path = geoPath(projection);
  const scaleRanks = scaleLinear()
    .domain([1, rankings.length])
    .range([0, 1]);

  const countries = mapData.map((c, i) => {
    const country = rankings.find(r => r.ISO_3 === c.id);
    const Path = () => (
      <path
        d={path(c)}
        id={`country-${c.id}`}
        onMouseEnter={() => country && setActiveCountry(country)}
        stroke="#ffffff"
        strokeWidth={
          country && activeCountry && country.ISO_3 === activeCountry.ISO_3
            ? 2
            : 1
        }
        strokeLinejoin="bevel"
        fill={
          country ? gradients[ranking](scaleRanks(country[ranking])) : '#bbb'
        }
      />
    );
    const Country = () =>
      country ? (
        <Link to={`/${kebabCase(country.country)}`}>
          <Path />
        </Link>
      ) : (
        <Path />
      );
    return c.id !== 'ATA' && <Country key={`country-${c.id}-${i}`} />;
  });

  return (
    <>
      <RankSelector
        activeRank={ranking}
        ranks={ranks}
        setRanking={setRanking}
      />
      <Container>
        {isLoading ? (
          <Loader style={{ border: '1px solid #bbb', gridArea: 'map' }}>
            Map is Loading...
          </Loader>
        ) : (
          <div
            style={{
              border: '1px solid #bbb',
              gridArea: 'map',
              position: 'relative',
            }}
          >
            <svg
              height="100%"
              width="100%"
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 600 600"
            >
              <g>{countries}</g>
            </svg>
            <MapLegend
              style={{ position: 'absolute', bottom: '0' }}
              interpolator={gradients[ranking]}
              steps={20}
            ></MapLegend>
          </div>
        )}
        <RankingsTable activeCountry={activeCountry} ranks={ranks} />
        <RegionSelector
          area="region"
          regions={regions}
          region={region}
          setRegion={setRegion}
        />
      </Container>
      <Divider />
    </>
  );
};

export default WorldMap;

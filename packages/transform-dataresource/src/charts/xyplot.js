/* @flow */
import * as React from "react";
import { scaleLinear, scaleThreshold } from "d3-scale";
import { heatmapping, hexbinning } from "semiotic";

import { numeralFormatting } from "../utilities";
import HTMLLegend from "../HTMLLegend";
import TooltipContent from "../tooltip-content";

import { sortByOrdinalRange } from "./shared";

const binHash = {
  heatmap: heatmapping,
  hexbin: hexbinning
};

const steps = ["none", "#FBEEEC", "#f3c8c2", "#e39787", "#ce6751", "#b3331d"];
const thresholds = scaleThreshold()
  .domain([0.01, 0.2, 0.4, 0.6, 0.8])
  .range(steps);

function combineTopAnnotations(
  topQ: Array<Object>,
  topSecondQ: Array<Object>,
  dim2: string
): any[] {
  const combinedAnnotations = [];
  const combinedHash = {};
  [...topQ, ...topSecondQ].forEach(d => {
    const hashD = combinedHash[d[dim2]];

    if (hashD) {
      const newCoordinates = (hashD.coordinates && [
        ...hashD.coordinates,
        d
      ]) || [d, hashD];
      Object.keys(combinedHash[d[dim2]]).forEach(k => {
        delete combinedHash[d[dim2]][k];
      });
      combinedHash[d[dim2]].id = d[dim2];
      combinedHash[d[dim2]].label = d[dim2];
      combinedHash[d[dim2]].type = "react-annotation";
      combinedHash[d[dim2]].coordinates = newCoordinates;
    } else {
      combinedHash[d[dim2]] = {
        type: "react-annotation",
        label: d[dim2],
        id: d[dim2],
        ...d
      };
      combinedAnnotations.push(combinedHash[d[dim2]]);
    }
  });
  return combinedAnnotations;
}

export const semioticHexbin = (
  data: Array<Object>,
  schema: Object,
  options: Object
) => {
  return semioticScatterplot(data, schema, options, options.areaType);
};

export const semioticScatterplot = (
  data: Array<Object>,
  schema: Object,
  options: Object,
  type: string = "scatterplot"
) => {
  const height = options.height - 150 || 500;

  const { chart, primaryKey, colors, setColor, dimensions } = options;

  const { dim1, dim2, dim3, metric1, metric2, metric3 } = chart;
  const filteredData: Array<Object> = data.filter(
    (d: Object) =>
      d[metric1] && d[metric2] && (!metric3 || metric3 === "none" || d[metric3])
  );

  const pointTooltip = (d: Object) => {
    return (
      <TooltipContent x={d.x} y={d.y}>
        <h3>{primaryKey.map(p => d[p]).join(", ")}</h3>
        {dimensions.map(dim => (
          <p key={`tooltip-dim-${dim.name}`}>
            {dim.name}:{" "}
            {(d[dim.name].toString && d[dim.name].toString()) || d[dim.name]}
          </p>
        ))}
        <p>
          {metric1}: {d[metric1]}
        </p>
        <p>
          {metric2}: {d[metric2]}
        </p>
        {metric3 &&
          metric3 !== "none" && (
            <p>
              {metric3}: {d[metric3]}
            </p>
          )}
      </TooltipContent>
    );
  };

  const areaTooltip = (d: Object) => {
    if (d.binItems.length === 0) return null;
    return (
      <TooltipContent x={d.x} y={d.y}>
        <h3
          style={{
            fontSize: "14px",
            textTransform: "uppercase",
            margin: "5px",
            fontWeight: 900
          }}
        >
          ID, {metric1}, {metric2}
        </h3>
        {d.binItems.map(d => {
          const id = dimensions
            .map(
              dim =>
                (d[dim.name].toString && d[dim.name].toString()) || d[dim.name]
            )
            .join(",");
          return (
            <p
              key={id}
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                margin: "5px"
              }}
            >
              {id}, {d[metric1]}, {d[metric2]}
            </p>
          );
        })}
      </TooltipContent>
    );
  };

  let sizeScale = e => 5; // eslint-disable-line no-unused-vars
  const colorHash = { Other: "grey" };
  const additionalSettings = {};

  let annotations;

  if (dim2 && dim2 !== "none") {
    const topQ = [...filteredData]
      .sort((a, b) => b[metric1] - a[metric1])
      .filter((d, i) => i < 3);
    const topSecondQ = [...filteredData]
      .sort((a, b) => b[metric2] - a[metric2])
      .filter(d => topQ.indexOf(d) === -1)
      .filter((d, i) => i < 3);

    annotations = combineTopAnnotations(topQ, topSecondQ, dim2);
  }

  if (metric3 && metric3 !== "none") {
    const dataMin = Math.min(...filteredData.map(d => d[metric3]));
    const dataMax = Math.max(...filteredData.map(d => d[metric3]));
    sizeScale = scaleLinear()
      .domain([dataMin, dataMax])
      .range([2, 20]);
  }
  const sortedData = sortByOrdinalRange(
    metric1,
    (metric3 !== "none" && metric3) || metric2,
    "none",
    data
  );

  if (
    (type === "scatterplot" || type === "contour") &&
    dim1 &&
    dim1 !== "none"
  ) {
    const uniqueValues = sortedData.reduce(
      (p, c) =>
        (!p.find(d => d === c[dim1].toString()) && [
          ...p,
          c[dim1].toString()
        ]) ||
        p,
      []
    );

    uniqueValues.forEach((d, i) => {
      colorHash[d] = i > 18 ? "grey" : colors[i % colors.length];
    });

    additionalSettings.afterElements = (
      <HTMLLegend
        valueHash={{}}
        values={uniqueValues}
        colorHash={colorHash}
        setColor={setColor}
        colors={colors}
      />
    );
  }

  let areas;

  if (
    type === "heatmap" ||
    type === "hexbin" ||
    (type === "contour" && dim3 === "none")
  ) {
    areas = [{ coordinates: filteredData }];

    if (type !== "contour") {
      areas = binHash[type]({
        areaType: { type, bins: 10 },
        data: {
          coordinates: filteredData.map(d => ({
            ...d,
            x: d[metric1],
            y: d[metric2]
          }))
        },
        size: [height, height]
      });
      const thresholdSteps = [0.2, 0.4, 0.6, 0.8, 1]
        .map(d => Math.floor(areas.binMax * d))
        .reduce((p, c) => (c === 0 || p.indexOf(c) !== -1 ? p : [...p, c]), []);

      const withZeroThresholdSteps = [0, ...thresholdSteps];

      const hexValues = [];

      withZeroThresholdSteps.forEach((t, i) => {
        const nextValue = withZeroThresholdSteps[i + 1];
        if (nextValue) {
          hexValues.push(`${t + 1} - ${nextValue}`);
        }
      });

      const thresholdColors = [
        "#FBEEEC",
        "#f3c8c2",
        "#e39787",
        "#ce6751",
        "#b3331d"
      ];
      const hexHash = {};

      hexValues.forEach((binLabel, i) => {
        hexHash[binLabel] = thresholdColors[i];
      });

      thresholds
        .domain([0.01, ...thresholdSteps])
        .range([
          "none",
          ...thresholdColors.filter((d, i) => i < thresholdSteps.length)
        ]);

      additionalSettings.afterElements = (
        <HTMLLegend
          valueHash={{}}
          values={hexValues}
          colorHash={hexHash}
          colors={colors}
        />
      );
    }
  } else if (type === "contour") {
    const multiclassHash = {};
    areas = [];
    filteredData.forEach(d => {
      if (!multiclassHash[d[dim1]]) {
        multiclassHash[d[dim1]] = {
          label: d[dim1],
          color: colorHash[d[dim1]],
          coordinates: []
        };
        areas.push(multiclassHash[d[dim1]]);
      }
      multiclassHash[d[dim1]].coordinates.push(d);
    });
  }

  const renderInCanvas =
    (type === "scatterplot" || type === "contour") && data.length > 999;

  return {
    xAccessor: type === "hexbin" || type === "heatmap" ? "x" : metric1,
    yAccessor: type === "hexbin" || type === "heatmap" ? "y" : metric2,
    axes: [
      {
        orient: "left",
        ticks: 6,
        label: metric2,
        tickFormat: numeralFormatting,
        footer: type === "heatmap"
      },
      {
        orient: "bottom",
        ticks: 6,
        label: metric1,
        tickFormat: numeralFormatting,
        footer: type === "heatmap"
      }
    ],
    points: (type === "scatterplot" || type === "contour") && data,
    canvasPoints: renderInCanvas,
    areas: areas,
    areaType: { type, bins: 10, thresholds: dim3 === "none" ? 6 : 3 },
    areaStyle: (d: Object) => {
      return {
        fill:
          type === "contour"
            ? "none"
            : thresholds((d.binItems || d.data.binItems).length),
        stroke:
          type !== "contour"
            ? undefined
            : dim3 === "none"
              ? "#BBB"
              : d.parentArea.color,
        strokeWidth: type === "contour" ? 2 : 1
      };
    },
    pointStyle: (d: Object) => ({
      r: renderInCanvas ? 2 : type === "contour" ? 3 : sizeScale(d[metric3]),
      fill: colorHash[d[dim1]] || "black",
      fillOpacity: 0.75,
      stroke: renderInCanvas ? "none" : type === "contour" ? "white" : "black",
      strokeWidth: type === "contour" ? 0.5 : 1,
      strokeOpacity: 0.9
    }),
    hoverAnnotation: true,
    responsiveWidth: false,
    size: [height + 225, height + 80],
    margin: { left: 75, bottom: 50, right: 150, top: 30 },
    annotations: (type === "scatterplot" && annotations) || undefined,
    annotationSettings: {
      layout: { type: "marginalia", orient: "right", marginOffset: 30 }
    },
    tooltipContent:
      ((type === "hexbin" || type === "heatmap") && areaTooltip) ||
      pointTooltip,
    ...additionalSettings
  };
};

import * as Babylon from "babylonjs";
import { renderLabel } from "../rendering/billboards";

export enum Axis {
  X = "X",
  Y = "Y",
  Z = "Z",
}

export interface AxisRenderOptions {
  axisLabel?: string | undefined;
  floatPoint?: number;
  markers?: number;
  markerSize?: number;
  markerVector?: Babylon.Vector3;
  max?: number;
  min?: number;
  scalarMax?: number;
  scalarMin?: number;
  opacity?: number;
}

// function which will render axis normals, markers and labels related
// to that axis. Requires an axis, options and a scene object as arguments.
export function renderAxis(
  axis: Axis,
  {
    axisLabel,
    floatPoint = 2,
    markers = 3,
    markerSize = 0.03,
    markerVector = new Babylon.Vector3(0, 0, 1),
    max = 1,
    min = 0,
    scalarMax = 1,
    scalarMin = 0,
    opacity = 0.5,
  }: AxisRenderOptions,
  scene: Babylon.Scene
) {
  // based on min/max props, calculate delta for markers along the axis line
  const nodeDelta: number = (max - min) / markers;

  // based on scalarMin/scalarMax props, calculate delta to use for marker labels
  const nodeLabelDelta: number = (scalarMax - scalarMin) / markers;

  // A list of vectors to construct a path to represent the axis.
  // markers will be inserted along every point in the path.
  const axisVectors: Array<Babylon.Vector3> = [];

  // create segments to construct the line and use as reference for creating
  // additional markers for measurement reference
  for (let i = 0; i < markers + 1; i++) {
    const iterationOffset: number = nodeDelta * i;
    const vX: number = axis === Axis.X ? iterationOffset : 0;
    const vY: number = axis === Axis.Y ? iterationOffset : 0;
    const vZ: number = axis === Axis.Z ? iterationOffset : 0;
    // push new vector to the vector list
    axisVectors.push(new Babylon.Vector3(vX, vY, vZ));
  }

  // render the main axis line into scene
  const axisLine: Babylon.LinesMesh = Babylon.MeshBuilder.CreateLines(
    `${Axis[axis]}-axis-normal`,
    { points: axisVectors },
    scene
  );

  // set the line opacity based on prop value
  axisLine.alpha = opacity;

  // create Path3D object from point segments
  const axisPath: Babylon.Path3D = new Babylon.Path3D(axisVectors);

  // render axis label to scene
  renderLabel(
    axisLabel || Axis[axis],
    new Babylon.Vector3(
      axis === Axis.X ? max * 1.05 : 0,
      axis === Axis.Y ? max * 1.05 : 0,
      axis === Axis.Z ? max * 1.05 : 0
    ),
    {
      color: "white",
      fontSize: 180,
      fontWeight: "bold",
      labelWidth: 0.08,
      labelHeight: 0.08,
      textureWidth: 320,
      textureHeight: 320,
    },
    scene
  );

  // loop through the axis path to render markers & marker labels along the axis.
  // takes into account a normal as Babylon.Vector3 constant for which to use in order
  // to position the marker's endpoint relative tot he reference vector along the path.
  axisPath.getCurve().forEach((vector: Babylon.Vector3, index: number) => {
    if (index) {
      // calculate marker endpoint vector
      const normalPoint: Babylon.Vector3 = vector.add(
        markerVector.scale(markerSize)
      );

      // create marker line instance and have it render into scene
      const marker: Babylon.LinesMesh = Babylon.MeshBuilder.CreateLines(
        `${Axis[axis]}-axis-tick-${index}`,
        { points: [vector, normalPoint] },
        scene
      );

      // set the opacity of marker line
      marker.alpha = opacity;

      // render marker label to scenee
      renderLabel(
        Number(nodeLabelDelta * index).toFixed(floatPoint),
        normalPoint.add(markerVector.scale(markerSize * 2)),
        {
          fontSize: 180,
          labelWidth: 0.08,
          labelHeight: 0.04,
          textureWidth: 640,
          textureHeight: 320,
        },
        scene
      );
    }
  });
}

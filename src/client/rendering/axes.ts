import * as Babylon from "babylonjs";
import { renderLabel } from "@rendering/billboards";
import { FloatArray } from "babylonjs";
import { GraphType } from "@components/graph-3d";

// render base axial guidelines
const axisMarkerVectorX: Babylon.Vector3 = new Babylon.Vector3(0, 0, 1);
const axisMarkerVectorY: Babylon.Vector3 = new Babylon.Vector3(0, 0, 1);
const axisMarkerVectorZ: Babylon.Vector3 = new Babylon.Vector3(1, 0, 0);

export enum Axis {
  X = "X",
  Y = "Y",
  Z = "Z",
}

export interface AxisRenderOptions {
  axisLabel?: string | undefined;
  axisOrigin?: Babylon.Vector3;
  floatPoint?: number;
  markers?: number;
  markerSize?: number;
  markerVector?: Babylon.Vector3;
  max?: number;
  min?: number;
  radius?: number;
  scalarMax?: number;
  scalarMin?: number;
  opacity?: number;
}

export interface AxesOptions {
  axisOptionsX?: AxisRenderOptions;
  axisOptionsY?: AxisRenderOptions;
  axisOptionsZ?: AxisRenderOptions;
}
// function which will render axis normals, markers and labels related
// to that axis. Requires an axis, options and a scene object as arguments.
export function renderAxis(
  axis: Axis,
  {
    axisLabel,
    axisOrigin = new Babylon.Vector3(0, 0, 0),
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
  scene: Babylon.Scene,
  parentNode: Babylon.Nullable<Babylon.Node> = null
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
    const iterationOffset: number = axisOrigin.x + nodeDelta * i;
    const vX: number = axis === Axis.X ? iterationOffset : axisOrigin.x;
    const vY: number = axis === Axis.Y ? iterationOffset : axisOrigin.y;
    const vZ: number = axis === Axis.Z ? iterationOffset : axisOrigin.z;
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
  axisLine.parent = parentNode;

  // render axis label to scene
  renderLabel(
    axisLabel || Axis[axis],
    new Babylon.Vector3(
      axis === Axis.X ? axisOrigin.x + max * 1.05 : axisOrigin.x,
      axis === Axis.Y ? axisOrigin.y + max * 1.05 : axisOrigin.y,
      axis === Axis.Z ? axisOrigin.z + max * 1.05 : axisOrigin.z
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
    scene,
    parentNode
  );

  // create Path3D object from point segments
  const axisPath: Babylon.Path3D = new Babylon.Path3D(axisVectors);

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
      marker.parent = parentNode;

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
        scene,
        parentNode
      );
    }
  });
}

export function renderCylinderAxis(
  axis: Axis,
  options: AxisRenderOptions,
  scene: Babylon.Scene,
  parentNode: Babylon.Nullable<Babylon.Node> = null
) {
  const names: any = {
    transform: `transform.${axis}-axis-cylinder`,
    marker: `marker.${axis}-axis`,
    axis: `${axis}-axis-cylinder`,
  };
  const { opacity = 0.5, radius = 1, markers = 12 } = options;

  const vertexData: Babylon.VertexData = Babylon.VertexData.CreateDisc({
    arc: Math.PI,
    radius,
    tessellation: 360,
  });

  const linePoints: Babylon.Vector3[] = [];
  const vpoints: Babylon.Nullable<FloatArray> = vertexData.positions;
  for (let i: number = 1; i < (vpoints?.length || 0) / 3; i++) {
    linePoints.push(
      new Babylon.Vector3(
        vpoints ? vpoints[i * 3] : 0,
        vpoints ? vpoints[i * 3 + 2] : 0,
        vpoints ? vpoints[i * 3 + 1] : 0
      )
    );
  }

  // create axis mesh or get the existing mesh from the scene
  const circle: Babylon.LinesMesh =
    (scene.getMeshByName(names.axis) as Babylon.LinesMesh) ||
    Babylon.MeshBuilder.CreateLines(names.axis, { points: linePoints }, scene);

  // set the circle parent to optional nullable parent node parameter
  circle.parent = parentNode;
  circle.alpha = opacity;

  // marker constants
  const markerAngleDelta: number = (linePoints.length - 2 || 360) / markers;
  const markerVector: Babylon.Vector3 = new Babylon.Vector3(0, 0.03, 0);

  // loop through points and render markers & labels
  for (let i = 0; i < markers; i++) {
    const markerDegree: number = i * markerAngleDelta;
    const degreeVector: Babylon.Vector3 = linePoints[markerDegree];
    const marker: Babylon.LinesMesh = Babylon.MeshBuilder.CreateLines(
      `cylinder-marker-${i}`,
      { points: [degreeVector, degreeVector.add(markerVector)] },
      scene
    );
    marker.alpha = opacity;
    marker.parent = circle;

    renderLabel(
      String(markerDegree),
      degreeVector.add(markerVector).add(markerVector),
      {
        fontSize: 180,
        labelWidth: 0.08,
        labelHeight: 0.04,
        textureWidth: 640,
        textureHeight: 320,
      },
      scene,
      circle
    );
  }
}

export function renderAxes(
  type: GraphType,
  scene: Babylon.Scene,
  parentNode: Babylon.Nullable<Babylon.Node>,
  options: AxesOptions = {}
) {
  const { axisOptionsX = {}, axisOptionsY = {}, axisOptionsZ = {} } = options;

  // mix in axis specific options to the shared option parameters
  const combinedAxisOptionsX: AxisRenderOptions = {
    ...axisOptionsX,
    markerVector: axisMarkerVectorX,
  };

  const combinedAxisOptionsY: AxisRenderOptions = {
    ...axisOptionsY,
    markerVector: axisMarkerVectorY,
  };

  const combinedAxisOptionsZ: AxisRenderOptions = {
    ...axisOptionsZ,
    markerVector: axisMarkerVectorZ,
  };

  type === GraphType.box
    ? renderAxis(Axis.X, combinedAxisOptionsX, scene, parentNode)
    : renderCylinderAxis(Axis.X, combinedAxisOptionsX, scene, parentNode);
  renderAxis(Axis.Y, combinedAxisOptionsY, scene, parentNode);
  renderAxis(Axis.Z, combinedAxisOptionsZ, scene, parentNode);
}

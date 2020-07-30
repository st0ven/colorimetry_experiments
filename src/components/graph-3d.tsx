import React, { useRef, useEffect, useLayoutEffect } from "react";
import cx from "classnames";
import styles from "./graph-3d.module.scss";
import * as Babylon from "babylonjs";
import { renderLabel } from "../helper/babylon-render";

// render base axial guidelines
const axisMarkerVectorX: Babylon.Vector3 = new Babylon.Vector3(0, 0, 1);
const axisMarkerVectorY: Babylon.Vector3 = new Babylon.Vector3(0, 0, 1);
const axisMarkerVectorZ: Babylon.Vector3 = new Babylon.Vector3(1, 0, 0);

enum Axis {
  X = "X",
  Y = "Y",
  Z = "Z",
}

interface AxisBaseRenderOptions {
  axisLabel?: string | undefined;
  markers: number;
  markerSize?: number;
  max?: number;
  min?: number;
  opacity?: number;
}
interface AxisRenderOptions extends AxisBaseRenderOptions {
  markerVector: Babylon.Vector3;
}

// function which will render axis normals, markers and labels related
// to that axis. Requires an axis, options and a scene object as arguments.
function renderAxis(
  axis: Axis,
  {
    axisLabel,
    markers = 1,
    markerSize = 0.02,
    markerVector,
    max = 1,
    min = 0,
    opacity = 0.5,
  }: AxisRenderOptions,
  scene: Babylon.Scene
) {
  const nodeDelta: number = (max - min) / markers;
  const axisVectors: Array<Babylon.Vector3> = [];

  // create segments to construct the line and use as reference for creating
  // additional markers for measurement reference
  for (let i = 0; i < markers + 1; i++) {
    const iterationOffset: number = nodeDelta * i;
    const vX: number = axis === Axis.X ? iterationOffset : 0;
    const vY: number = axis === Axis.Y ? iterationOffset : 0;
    const vZ: number = axis === Axis.Z ? iterationOffset : 0;
    axisVectors.push(new Babylon.Vector3(vX, vY, vZ));
  }

  // render the main axis line into scene
  const axisLine: Babylon.LinesMesh = Babylon.MeshBuilder.CreateLines(
    `${Axis[axis]}-axis-normal`,
    { points: axisVectors },
    scene
  );
  axisLine.alpha = opacity;

  // create Path3D object from point segments
  const axisPath: Babylon.Path3D = new Babylon.Path3D(axisVectors);

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

      renderLabel(
        Number(nodeDelta * index).toFixed(2),
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

  // render axis label
  renderLabel(
    axisLabel || Axis[axis],
    new Babylon.Vector3(
      axis === Axis.X ? max * 1.05 : 0,
      axis === Axis.Y ? max * 1.05 : 0,
      axis === Axis.Z ? max * 1.05 : 0
    ),
    {
      //color: axis === Axis.X ? "red" : axis === Axis.Y ? "green" : "blue",
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
}

type RenderMethod = (scene: Babylon.Scene) => void;

interface Graph3dProps {
  axisLabels?: Array<string>;
  className?: string;
  renderMethods: RenderMethod[];
}

export function Graph3d({
  axisLabels = [],
  className,
  renderMethods,
}: Graph3dProps) {
  // component references
  const canvasRef: React.RefObject<HTMLCanvasElement> = useRef(null);
  const cameraRef: React.MutableRefObject<
    Babylon.ArcRotateCamera | undefined
  > = useRef();
  const engineRef: React.MutableRefObject<
    Babylon.Engine | undefined
  > = useRef();
  const sceneRef: React.MutableRefObject<Babylon.Scene | undefined> = useRef();

  // label destructuring for axes
  const [labelX, labelY, labelZ] = axisLabels;

  // define axis label options to be used for rendering
  const axisOptions: AxisBaseRenderOptions = {
    markers: 3,
    markerSize: 0.03,
    max: 1,
    opacity: 0.5,
  };

  // mix in axis specific options to the shared option parameters
  const axisOptionsX: AxisRenderOptions = Object.assign({}, axisOptions, {
    axisLabel: labelX,
    markerVector: axisMarkerVectorX,
  });
  const axisOptionsY: AxisRenderOptions = Object.assign({}, axisOptions, {
    axisLabel: labelY,
    markerVector: axisMarkerVectorY,
  });
  const axisOptionsZ: AxisRenderOptions = Object.assign({}, axisOptions, {
    axisLabel: labelZ,
    markerVector: axisMarkerVectorZ,
  });

  // apply a classname optionally to the graph wrapper
  const graphCx: string = cx(styles.graph3d, className);

  // when canvasRef.current value is set, execute initial canvas statements
  useLayoutEffect(function initCanvas() {
    if (
      canvasRef.current &&
      !engineRef.current &&
      !sceneRef.current &&
      !cameraRef.current
    ) {
      console.log("initial");
      // initialize all Babylon related refs required to render a scene
      engineRef.current = new Babylon.Engine(canvasRef.current, true, {}, true);

      sceneRef.current = new Babylon.Scene(engineRef.current);
      sceneRef.current.shadowsEnabled = false;
      sceneRef.current.clearColor = new Babylon.Color4(0.06, 0.04, 0.14, 1);

      cameraRef.current = new Babylon.ArcRotateCamera(
        "camera",
        Math.PI / 4,
        Math.PI / 3,
        22.5,
        new Babylon.Vector3(0.5, 0.5, 0.5),
        sceneRef.current
      );
      // set camera constraints to limit/lock on relevant visualization space
      cameraRef.current.allowUpsideDown = false;

      // set control limits to the camera
      cameraRef.current.lowerBetaLimit = Math.PI / 4;
      cameraRef.current.upperBetaLimit = (Math.PI / 3) * 2;
      cameraRef.current.lowerRadiusLimit = 2;
      cameraRef.current.upperRadiusLimit = 2;

      // attach camera controls to the canvas
      cameraRef.current.attachControl(canvasRef.current, true);

      renderAxis(Axis.X, axisOptionsX, sceneRef.current);
      renderAxis(Axis.Y, axisOptionsY, sceneRef.current);
      renderAxis(Axis.Z, axisOptionsZ, sceneRef.current);

      // render loop to allow interactivity
      engineRef.current.runRenderLoop(() => {
        sceneRef.current?.render(true);
      });
    }
  });

  // Loop through the renderMethods prop array to invoke rendering functions which
  // offload the individual rendering responsibilities each function. Pass along
  // the Babylon.Scene instance to allow those functions to draw items directly within it.
  useEffect(
    function renderGraph() {
      if (sceneRef.current) {
        // assign reference to current scene to disambiguate potentiall undefined typing
        const scene: Babylon.Scene = sceneRef.current;
        // loop through methods and invoke them, passing along the scene reference
        renderMethods.forEach((renderMethod: RenderMethod) => {
          renderMethod(scene);
        });
      }
    },
    [sceneRef, renderMethods]
  );

  return (
    <canvas
      className={graphCx}
      ref={canvasRef}
      width={960}
      height={640}
    ></canvas>
  );
}

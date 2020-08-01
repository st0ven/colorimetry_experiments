import React, { useRef, useEffect, useLayoutEffect } from "react";
import cx from "classnames";
import styles from "./graph-3d.module.scss";
import * as Babylon from "babylonjs";
import {
  Axis,
  AxisRenderOptions,
  renderAxis,
} from "../rendering/axes";

// render base axial guidelines
const axisMarkerVectorX: Babylon.Vector3 = new Babylon.Vector3(0, 0, 1);
const axisMarkerVectorY: Babylon.Vector3 = new Babylon.Vector3(0, 0, 1);
const axisMarkerVectorZ: Babylon.Vector3 = new Babylon.Vector3(1, 0, 0);

type RenderMethod = (scene: Babylon.Scene) => void;

// 3D Graph Component Props
interface Graph3dProps {
  className?: string;
  renderMethods: RenderMethod[];
  axisOptionsX?: AxisRenderOptions;
  axisOptionsY?: AxisRenderOptions;
  axisOptionsZ?: AxisRenderOptions;
}

export function Graph3d({
  axisOptionsX = {},
  axisOptionsY = {},
  axisOptionsZ = {},
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
      // initialize all Babylon related refs required to render a scene
      engineRef.current = new Babylon.Engine(canvasRef.current, true, {}, true);

      sceneRef.current = new Babylon.Scene(engineRef.current);
      sceneRef.current.shadowsEnabled = false;
      sceneRef.current.clearColor = new Babylon.Color4(0.05, 0.03, 0.15, 1);

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

      renderAxis(Axis.X, combinedAxisOptionsX, sceneRef.current);
      renderAxis(Axis.Y, combinedAxisOptionsY, sceneRef.current);
      renderAxis(Axis.Z, combinedAxisOptionsZ, sceneRef.current);

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

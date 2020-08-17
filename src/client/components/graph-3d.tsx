import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import cx from "classnames";
import styles from "./graph-3d.module.scss";
import * as Babylon from "babylonjs";
import {
  AxisRenderOptions,
  renderAxes,
} from "../rendering/axes";

type RenderMethod = (scene: Babylon.Scene) => void;

export enum GraphType {
  box = "box",
  cylindrical = "cylindrical",
}

export interface GraphAxisOptions {
  axisOptionsX?: AxisRenderOptions;
  axisOptionsY?: AxisRenderOptions;
  axisOptionsZ?: AxisRenderOptions;
}

// 3D Graph Component Props
interface Graph3dProps {
  className?: string;
  renderMethods: RenderMethod[];
  axisOptions?: GraphAxisOptions;
  type: GraphType;
}

export function Graph3d({
  className,
  renderMethods,
  type,
  axisOptions,
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

  const [axesParentNode, setAxesParentNode] = useState<
    Babylon.Nullable<Babylon.Node>
  >(null);

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

      // create scene instance and set some initial properties
      sceneRef.current = new Babylon.Scene(engineRef.current);
      sceneRef.current.shadowsEnabled = false;
      sceneRef.current.clearColor = new Babylon.Color4(0.05, 0.03, 0.15, 1);

      // create scene camera and point it to origin/center
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

      // render loop to allow interactivity
      engineRef.current.runRenderLoop(() => {
        sceneRef.current?.render(true);
      });
    }
  });

  useEffect(() => {
    const scene: Babylon.Scene | undefined = sceneRef.current;
    const camera: Babylon.ArcRotateCamera | undefined = cameraRef.current;

    if (scene && camera) {
      const parentNode: Babylon.Node =
        axesParentNode || new Babylon.Node("axes-parent-node", scene);

      parentNode.dispose();

      renderAxes(type, scene, parentNode, axisOptions)

      setAxesParentNode(parentNode);
    }
  }, [axisOptions, type, cameraRef, sceneRef]);

  // Loop through the renderMethods prop array to invoke rendering functions which
  // offload the individual rendering responsibilities each function. Pass along
  // the Babylon.Scene instance to allow those functions to draw items directly within it.
  useEffect(
    function renderEntities() {
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

// set component default props
Graph3d.defaultProps = {
  type: GraphType.box,
};

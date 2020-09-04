import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import cx from "classnames";
import styles from "./graph-3d.module.scss";
import * as Babylon from "babylonjs";
import { AxisRenderOptions, renderAxes } from "@rendering/axes";

const canvasBackgroundColor: Babylon.Color4 = new Babylon.Color4(
  0.06,
  0.07,
  0.21,
  1
);

type RenderMethod = (scene: Babylon.Scene) => void;

// 3D Graph Component Props
interface Graph3dProps {
  className?: string;
  renderMethods: RenderMethod[];
  axisOptions?: (AxisRenderOptions | undefined)[];
}

function resizeEngine(engine: Babylon.Engine, canvas: HTMLCanvasElement) {
  const { width, height }: DOMRect = (
    canvas.parentElement || canvas
  ).getBoundingClientRect();
  canvas.width = width;
  canvas.height = height;

  engine.resize();
}

export function Graph3d({
  className,
  renderMethods,
  axisOptions,
}: Graph3dProps) {
  // component references
  const canvasRef: React.RefObject<HTMLCanvasElement> = useRef(null);

  // reference to a camera entity from Babylon
  const cameraRef: React.MutableRefObject<
    Babylon.ArcRotateCamera | undefined
  > = useRef();

  // reference to the engine required for Babylon scene to run
  const engineRef: React.MutableRefObject<
    Babylon.Engine | undefined
  > = useRef();

  // renference to a Scene entity to contain all rendered entities from Babylon
  const sceneRef: React.MutableRefObject<Babylon.Scene | undefined> = useRef();

  // create a parent node reference for which to attach axial rendered elements to.
  // this allows for easy manipulation of all axes entities by targeting a common parent node.
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
      // a handler function invoked when the browser window is resized
      function handleWindowResize() {
        if (engineRef.current && canvasRef.current)
          resizeEngine(engineRef.current, canvasRef.current);
      }

      // initialize all Babylon related refs required to render a scene
      engineRef.current = new Babylon.Engine(canvasRef.current, true, {}, true);

      // create scene instance and set some initial properties
      sceneRef.current = new Babylon.Scene(engineRef.current);
      sceneRef.current.shadowsEnabled = false;
      sceneRef.current.clearColor = canvasBackgroundColor;

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
      cameraRef.current.upperRadiusLimit = 3;

      // attach camera controls to the canvas
      cameraRef.current.attachControl(canvasRef.current, true);

      // initially resize the engine to fit current canvas dimensions.
      // given flexible nature of the layout, its initial size is unknown until
      // the cnanvas is initially rendered and the client knows its bounding box details.
      handleWindowResize();

      // render loop to allow interactivity
      engineRef.current.runRenderLoop(() => {
        sceneRef.current?.render(true);
      });

      // update engine to scale with the browser window on resize
      window.addEventListener("resize", handleWindowResize);
    }
  });

  // update axial rendering based on the 'type' of graph space that needs to be displayed.
  // these options are typically defined under the GraphType enum.
  useEffect(() => {
    const scene: Babylon.Scene | undefined = sceneRef.current;
    const camera: Babylon.ArcRotateCamera | undefined = cameraRef.current;

    if (scene && camera) {
      // create a new parent node reference for new axis elements
      const parentNode: Babylon.Node =
        axesParentNode || new Babylon.Node("axes-parent-node", scene);

      // dispose of the ezisitng elements under the parent node
      parentNode.dispose();

      // render new axes
      renderAxes(axisOptions, scene, parentNode);

      // set the parent node reference if a new node was created
      setAxesParentNode(parentNode);
    }
  }, [axisOptions, axesParentNode, cameraRef, sceneRef]);

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

  // render graph to canvas
  return (
    <canvas
      className={graphCx}
      ref={canvasRef}
      width={960}
      height={640}
    ></canvas>
  );
}

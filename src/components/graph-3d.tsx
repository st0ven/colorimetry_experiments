import React, { useRef, useEffect } from "react";
import styles from "./graph-3d.module.scss";
import * as Babylon from "babylonjs";
import { renderLabel } from "../helper/babylon-render";

enum Axis {
  X,
  Y,
  Z,
}

interface AxisBaseRenderOptions {
  markers: number;
  markerSize?: number;
  max?: number;
  min?: number;
  opacity?: number;
}
interface AxisRenderOptions extends AxisBaseRenderOptions {
  markerVector: Babylon.Vector3;
}

// render base axial guidelines
const axisMarkerVectorX: Babylon.Vector3 = new Babylon.Vector3(0, 0, 1);
const axisMarkerVectorY: Babylon.Vector3 = new Babylon.Vector3(0, 0, 1);
const axisMarkerVectorZ: Babylon.Vector3 = new Babylon.Vector3(1, 0, 0);

/*
  Draw axis marks for a main axis which conveys repeating grid marks
  along that axis. Returns an array of vectors which represent line
  segments to be drawn by Babylon.
  ---
  REQUIRES:
    -Babylon.js
*/
function createAxisGuidelines(
  numOfLines: number
): Array<Array<Babylon.Vector3>> {
  const pointCollection: Array<Array<Babylon.Vector3>> = [];
  for (var z = 0; z < numOfLines + 2; z++) {
    const Z = z / (numOfLines + 1);
    for (var y = 0; y < numOfLines + 2; y++) {
      const Y = y / (numOfLines + 1);
      pointCollection.push([
        new Babylon.Vector3(0, Y, Z),
        new Babylon.Vector3(1, Y, Z),
      ]);
    }
  }
  return pointCollection;
}

//
function createVolumetricGuidelines(
  vectors: Array<Array<Babylon.Vector3>>,
  scene: Babylon.Scene
) {
  const axisGuidelinesX = Babylon.MeshBuilder.CreateLineSystem(
    "axisMarksX",
    { lines: vectors },
    scene
  );
  axisGuidelinesX.alpha = 0.2;
  // create instance and transform into position for Y axis
  const axisGuidelinesY = axisGuidelinesX.createInstance("axisMarksY");
  axisGuidelinesY.rotate(new Babylon.Vector3(-1, -1, 0), Math.PI);
  axisGuidelinesY.translate(Babylon.Axis.Z, -1, Babylon.Space.LOCAL);
  // do so similarly for Z axis
  const axisGuidelinesZ = axisGuidelinesX.createInstance("axisMarksZ");
  axisGuidelinesZ.rotate(Babylon.Axis.Y, Math.PI / 2);
  axisGuidelinesZ.translate(Babylon.Axis.X, -1, Babylon.Space.LOCAL);
}

// function which will render axis normals, markers and labels related
// to that axis. Requires an axis, options and a scene object as arguments.
function renderAxis(
  axis: Axis,
  {
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
        `${Axis[axis]}-axis-tick=${index}`,
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
    axis === Axis.X ? "R" : axis === Axis.Y ? "G" : "B",
    new Babylon.Vector3(
      axis === Axis.X ? max * 1.05 : 0,
      axis === Axis.Y ? max * 1.05 : 0,
      axis === Axis.Z ? max * 1.05 : 0
    ),
    {
      color: axis === Axis.X ? "red" : axis === Axis.Y ? "green" : "blue",
      fontSize: 180,
      fontWeight: "bold",
      labelWidth: 0.06,
      labelHeight: 0.06,
      textureWidth: 320,
      textureHeight: 320,
    },
    scene
  );
}

interface Graph3dProps {
  lights?: Array<(scene: Babylon.Scene) => void>;
  meshes?: Array<(scene: Babylon.Scene) => void>;
}

export function Graph3d({ lights = [], meshes = [] }: Graph3dProps) {
  // component references
  const canvasRef: React.RefObject<HTMLCanvasElement> = useRef(null);
  const cameraRef: React.MutableRefObject<
    Babylon.ArcRotateCamera | undefined
  > = useRef();
  const engineRef: React.MutableRefObject<
    Babylon.Engine | undefined
  > = useRef();
  const sceneRef: React.MutableRefObject<Babylon.Scene | undefined> = useRef();

  // when canvasRef.current value is set, execute initial canvas statements
  useEffect(
    function initCanvas() {
      if (canvasRef.current) {
        // initialize all Babylon related refs required to render a scene
        engineRef.current = new Babylon.Engine(
          canvasRef.current,
          true,
          {},
          true
        );

        sceneRef.current = new Babylon.Scene(engineRef.current);
        sceneRef.current.shadowsEnabled = false;

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
        //cameraRef.current.lowerAlphaLimit = 0;
        //cameraRef.current.upperAlphaLimit = Math.PI / 2;
        cameraRef.current.lowerBetaLimit = Math.PI / 4;
        cameraRef.current.upperBetaLimit = (Math.PI / 3) * 2;
        cameraRef.current.lowerRadiusLimit = 2;
        cameraRef.current.upperRadiusLimit = 2;

        const axisOptions: AxisBaseRenderOptions = {
          markers: 3,
          markerSize: 0.03,
          max: 1,
          opacity: 0.5,
        };
        const axisOptionsX: AxisRenderOptions = Object.assign({}, axisOptions, {
          markerVector: axisMarkerVectorX,
        });
        const axisOptionsY: AxisRenderOptions = Object.assign({}, axisOptions, {
          markerVector: axisMarkerVectorY,
        });
        const axisOptionsZ: AxisRenderOptions = Object.assign({}, axisOptions, {
          markerVector: axisMarkerVectorZ,
        });

        renderAxis(Axis.X, axisOptionsX, sceneRef.current);
        renderAxis(Axis.Y, axisOptionsY, sceneRef.current);
        renderAxis(Axis.Z, axisOptionsZ, sceneRef.current);

        // gather guide vectors and create volume guides
        /*const guidelineVectors: Array<Array<
          Babylon.Vector3
        >> = createAxisGuidelines(2);
        createVolumetricGuidelines(guidelineVectors, sceneRef.current);
        */
      }
    },
    [canvasRef, cameraRef, engineRef, sceneRef]
  );

  useEffect(
    function renderGraph() {
      if (
        sceneRef.current &&
        engineRef.current &&
        cameraRef.current &&
        canvasRef.current &&
        meshes.length
      ) {
        // this should be extracted from this component scope altogether
        meshes?.forEach((mesh: any, index: number) => {
          if (mesh && sceneRef.current) {
            mesh(sceneRef.current);
          }
        });

        lights?.forEach((light: (scene: Babylon.Scene) => void) => {
          if (light && sceneRef.current) {
            light(sceneRef.current);
          }
        });

        // attach camera controls to the canvas
        cameraRef.current.attachControl(canvasRef.current, true);

        // render loop to allow interactivity
        engineRef.current.runRenderLoop(() => {
          sceneRef.current?.render();
        });
      }
    },
    [lights, meshes, sceneRef, engineRef, cameraRef, canvasRef]
  );

  return <canvas className={styles.graph3d} ref={canvasRef}></canvas>;
}

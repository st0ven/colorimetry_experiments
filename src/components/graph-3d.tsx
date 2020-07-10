import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import styles from "./graph-3d.module.scss";
import * as Babylon from "babylonjs";

/*
  Draw axis marks for a main axis which conveys repeating grid marks
  along that axis. Returns an array of vectors which represent line
  segments to be drawn by Babylon.
  ---
  REQUIRES:
    -Babylon.js
*/
function createAxisGuidelines(
  pointCollection: Array<Array<Babylon.Vector3>>,
  markCount: number,
  mainAxis: string = "x"
) {
  for (var z = 0; z < markCount; z++) {
    let vZ = z / (markCount - 1);
    for (var y = 0; y < markCount; y++) {
      let vX1: number = mainAxis === "x" ? 0 : y / (markCount - 1);
      let vX2: number = mainAxis === "x" ? 1 : y / (markCount - 1);
      let vY1: number = mainAxis === "y" ? 0 : y / (markCount - 1);
      let vY2: number = mainAxis === "y" ? 1 : y / (markCount - 1);
      pointCollection.push([
        new Babylon.Vector3(vX1, vY1, vZ),
        new Babylon.Vector3(vX2, vY2, vZ),
      ]);
    }
  }
  return pointCollection;
}

function createVolumetricGuidelines(
  vectors: Array<Array<Babylon.Vector3>>,
  scene: Babylon.Scene
) {
  const axisGuidelinesX = Babylon.MeshBuilder.CreateLineSystem(
    "axisMarksX",
    { lines: vectors },
    scene
  );
  axisGuidelinesX.alpha = 0.1;
  // create instance and transform into position for Y axis
  const axisGuidelinesY = axisGuidelinesX.createInstance("axisMarksY");
  axisGuidelinesY.rotate(new Babylon.Vector3(-1, -1, 0), Math.PI);
  axisGuidelinesY.translate(Babylon.Axis.Z, -1, Babylon.Space.LOCAL);
  // do so similarly for Z axis
  const axisGuidelinesZ = axisGuidelinesX.createInstance("axisMarksZ");
  axisGuidelinesZ.rotate(Babylon.Axis.Y, Math.PI / 2);
  axisGuidelinesZ.translate(Babylon.Axis.X, -1, Babylon.Space.LOCAL);
}

function createAxialGuidelines(scene: Babylon.Scene) {
  const axisX: Babylon.LinesMesh = Babylon.MeshBuilder.CreateLines(
    "axisX",
    {
      points: [new Babylon.Vector3(0, 0, 0), new Babylon.Vector3(1, 0, 0)],
    },
    scene
  );
  axisX.alpha = 0.5;
  const axisY: Babylon.LinesMesh = Babylon.MeshBuilder.CreateLines(
    "axisY",
    {
      points: [new Babylon.Vector3(0, 0, 0), new Babylon.Vector3(0, 1, 0)],
    },
    scene
  );
  axisY.alpha = 0.5;
  const axisZ: Babylon.LinesMesh = Babylon.MeshBuilder.CreateLines(
    "axisZ",
    {
      points: [new Babylon.Vector3(0, 0, 0), new Babylon.Vector3(0, 0, 1)],
    },
    scene
  );
  axisZ.alpha = 0.5;
}

export function Graph3d(props: any) {
  const { map } = props;

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
  useLayoutEffect(
    function initCanvas() {
      if (canvasRef.current) {
        let canvas = canvasRef.current;
        let engine = engineRef.current;
        let camera = cameraRef.current;
        let scene = sceneRef.current;

        // initialize all Babylon related refs required to render a scene
        engine = new Babylon.Engine(canvas, true, {}, true);
        scene = new Babylon.Scene(engine);
        camera = new Babylon.ArcRotateCamera(
          "camera",
          Math.PI / 4,
          Math.PI / 3,
          22.5,
          new Babylon.Vector3(0.5, 0.5, 0.5),
          scene
        );

        // set camera constraints to limit/lock on relevant visualization space
        camera.allowUpsideDown = false;
        camera.lowerAlphaLimit = 0;
        camera.upperAlphaLimit = Math.PI / 2;
        camera.lowerBetaLimit = Math.PI / 4;
        camera.upperBetaLimit = Math.PI / 2;
        camera.lowerRadiusLimit = 2;
        camera.upperRadiusLimit = 2;

        // attach camera controls to the canvas
        camera.attachControl(canvas, true);

        // lighting instantitation
        new Babylon.HemisphericLight(
          "hemi1",
          new Babylon.Vector3(0, 20, 0),
          scene
        );

        // render base axial guidelines
        createAxialGuidelines(scene);

        // gather guide vectors and create volume guides
        const guidelineVectors: Array<Array<
          Babylon.Vector3
        >> = createAxisGuidelines([], 3, "x");
        createVolumetricGuidelines(guidelineVectors, scene);

        // this should be extracted from this component scope altogether
        if (map) {
          const vectors = map.map(
            (point: Array<number>) =>
              new Babylon.Vector3(point[0], point[1], point[2])
          );

          const material = new Babylon.StandardMaterial("locusMaterial", scene);
          material.diffuseColor = new Babylon.Color3(0, 0.5, 0.75);

          const locusOutline = Babylon.MeshBuilder.CreateLines(
            "locust",
            { points: vectors },
            sceneRef.current
          );
          locusOutline.material = material;
        }

        // render the scene and update interactively
        engine.runRenderLoop(() => {
          if (scene) {
            scene.render();
          }
        });
      }
    },
    [canvasRef, cameraRef, engineRef, map, sceneRef]
  );

  return <canvas className={styles.graph3d} ref={canvasRef}></canvas>;
}

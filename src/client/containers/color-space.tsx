import React, { useState, useCallback, useEffect, useContext } from "react";
import * as Babylon from "babylonjs";
import styles from "./color-space.module.scss";
import { Graph3d } from "@components/graph-3d";
import { GraphType } from "@lib/enums";
import { renderHemiLight } from "@rendering/lights";
import { renderColorSpace } from "@rendering/rgb-color-space";
import { renderColorIndicator } from "@rendering/color-indicator";
import { adjustCameraTarget } from "@rendering/camera";
import { colorModelMap } from "@lib/constants.color";
import { axisOptionsMap } from "@lib/constants.axes";
import { StoreContext } from "@hooks/store-context";
import { AxisRenderOptions } from "@client/rendering/axes";
import { renderFloor } from "@rendering/floor";

interface RgbVisualizationProps {
  geometry: Babylon.VertexData | undefined;
}

export function RGBVisualization({ geometry }: RgbVisualizationProps) {
  // hold state for RGB color inputs
  const [redComponent, setRedComponent] = useState<number>(1);
  const [greenComponent, setGreenComponent] = useState<number>(1);
  const [blueComponent, setBlueComponent] = useState<number>(1);

  const { store } = useContext(StoreContext);

  const { colorSpace, targetColorModel, whitepoint, waiting } = store;

  const [useGraphType, setGraphType] = useState<GraphType>(GraphType.box);
  const [useAxisOptions, setAxisOptions] = useState<
    Array<AxisRenderOptions | undefined>
  >(axisOptionsMap.get(targetColorModel) || []);

  // update data with API fetch on dependency change
  // NOTE: this may be moved out of scope of this component entirely in a UI re-configuration
  useEffect(() => {
    const graphType: GraphType | undefined = colorModelMap.get(targetColorModel)
      ?.graphType;
    if (!waiting && graphType && geometry) {
      setGraphType(graphType);
      setAxisOptions(axisOptionsMap.get(targetColorModel) || []);
    }
  }, [geometry, waiting]);

  // update of component callbacks for red
  const handleRedComponentChange = useCallback((value: number) => {
    setRedComponent(value / 255);
  }, []);
  // update of component callbacks for green
  const handleGreenComponentChange = useCallback((value: number) => {
    setGreenComponent(value / 255);
  }, []);
  // update of component callbacks for blue
  const handleBlueComponentChange = useCallback((value: number) => {
    setBlueComponent(value / 255);
  }, []);

  const renderFloorMesh = useCallback(
    (scene: Babylon.Scene) => {
      const graphType: GraphType | undefined = colorModelMap.get(
        targetColorModel
      )?.graphType;

      if (graphType) renderFloor(graphType, scene);
    },
    [geometry]
  );

  // render a single point as a sphere within the visualization
  const renderPointMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderColorIndicator(
        [redComponent, greenComponent, blueComponent],
        colorSpace,
        targetColorModel,
        whitepoint,
        scene
      );
    },
    [redComponent, greenComponent, blueComponent, geometry]
  );

  // render the color space mesh given a selected color space
  const renderMesh = useCallback(
    (scene: Babylon.Scene) => {
      if (geometry && !waiting) {
        //adjust camera
        {
          // get reference to the in-scene camera
          const camera: Babylon.Nullable<Babylon.ArcRotateCamera> = scene.getCameraByName(
            "camera"
          ) as Babylon.ArcRotateCamera;

          // determine camera target vectors based on target color model
          const cameraVectors: number[] =
            useGraphType === GraphType.cylindrical
              ? [0, 0.5, 0]
              : [0.5, 0.5, 0.5];

          // determine zoom lock limit based on euclidean vs polar coordinates
          const limitLock: number =
            useGraphType === GraphType.cylindrical ? 2.25 : 2;

          // adjust the camera
          adjustCameraTarget(
            camera,
            new Babylon.Vector3(...cameraVectors),
            limitLock
          );
        }

        // render the mesh representing color space volume
        renderColorSpace(geometry, scene);
      }
    },
    [geometry, useGraphType, waiting]
  );

  // render the container
  return (
    <React.Fragment>
      <Graph3d
        axisOptions={useAxisOptions}
        className={styles.graph}
        renderMethods={[
          renderHemiLight,
          renderMesh,
          renderPointMesh,
          renderFloorMesh,
        ]}
      ></Graph3d>
      {/*
      <ColorComponent
        className={styles.colorComponent}
        initialValue={Math.round(redComponent * 255)}
        onChange={handleRedComponentChange}
      ></ColorComponent>
      <ColorComponent
        className={styles.colorComponent}
        initialValue={Math.round(greenComponent * 255)}
        onChange={handleGreenComponentChange}
      ></ColorComponent>
      <ColorComponent
        className={styles.colorComponent}
        initialValue={Math.round(blueComponent * 255)}
        onChange={handleBlueComponentChange}
      ></ColorComponent>
      */}
    </React.Fragment>
  );
}

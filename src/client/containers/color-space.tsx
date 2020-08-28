import React, { useState, useCallback, useEffect } from "react";
import * as Babylon from "babylonjs";
import styles from "./color-space.module.scss";
import { Graph3d } from "@components/graph-3d";
import { Select } from "@components/select";
import {
  ColorSpaceOptions,
  ColorModelOptions,
  IlluminantOptions,
} from "@components/color-space-options";
import { ColorComponent } from "@components/color-component-input";
import { fetchColorSpaceGeometry } from "@api/geometry.api";
import { ColorSpace, GraphType, Illuminant, ColorModel } from "@lib/enums";
import { renderHemiLight } from "@rendering/lights";
import { renderColorSpace } from "@rendering/rgb-color-space";
import { renderColorIndicator } from "@rendering/color-indicator";
import { adjustCameraTarget } from "@rendering/camera";
import { colorModelMap } from "@lib/constants.color";
import { axisOptionsMap } from "@lib/constants.axes";

const fidelity: any = {
  low: Math.pow(2, 3),
  med: Math.pow(2, 4),
  high: Math.pow(2, 5),
};

export function RGBVisualization() {
  // hold state for RGB color inputs
  const [redComponent, setRedComponent] = useState<number>(1);
  const [greenComponent, setGreenComponent] = useState<number>(1);
  const [blueComponent, setBlueComponent] = useState<number>(1);

  // hold state for source & reference color space / illuminant options
  const [toColorSpace, setColorSpace] = useState<ColorSpace>(ColorSpace.sRGB);
  const [toColorModel, setColorModel] = useState<ColorModel>(ColorModel.XYZ);
  const [referenceIlluminant, setReferenceIlluminant] = useState<Illuminant>(
    Illuminant.D65
  );

  // other controls to store in state
  const [meshDivisions, setMeshDivisions] = useState<number>(fidelity.low);
  const [useGeometry, setGeometry] = useState<Babylon.VertexData | undefined>();
  const [useGraphType, setGraphType] = useState<GraphType | undefined>(
    GraphType.box
  );

  // async/loading state
  const [awaitingResponse, setAwaitingResponse] = useState<boolean>(true);

  // update data with API fetch on dependency change
  // NOTE: this may be moved out of scope of this component entirely in a UI re-configuration
  useEffect(() => {
    (async function getApiResult() {
      const result = await fetchColorSpaceGeometry(
        meshDivisions,
        toColorSpace,
        ColorModel.RGB,
        toColorModel,
        referenceIlluminant
      );
      setGraphType(colorModelMap.get(toColorModel)?.graphType);
      setGeometry(result);
      setAwaitingResponse(false);
    })();
  }, [meshDivisions, toColorSpace, toColorModel, referenceIlluminant]);

  // update the state to reflect the selection of which color profile to visualize
  const changeSourceSpace = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setColorSpace(Object(ColorSpace)[value]);
      setAwaitingResponse(true);
    },
    []
  );

  // update the reference illuminant to be used to calculate color transforms
  // to the reference space
  const changeReferenceIlluminant = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setReferenceIlluminant(Object(Illuminant)[value]);
      setAwaitingResponse(true);
    },
    []
  );

  // update the reference space to the user selected space
  const changeColorModel = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setColorModel(Object(ColorModel)[value]);
      setAwaitingResponse(true);
    },
    []
  );

  // change the fidelity for which to render the meshes
  const changeFidelity = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setMeshDivisions(Number(value));
      setAwaitingResponse(true);
    },
    []
  );

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

  // render a single point as a sphere within the visualization
  const renderPointMesh = useCallback(
    (scene: Babylon.Scene) => {
      if (!awaitingResponse) {
        renderColorIndicator(
          [redComponent, greenComponent, blueComponent],
          toColorSpace,
          toColorModel,
          referenceIlluminant,
          scene
        );
      }
    },
    [
      awaitingResponse,
      redComponent,
      greenComponent,
      blueComponent,
      toColorSpace,
      toColorModel,
      referenceIlluminant,
    ]
  );

  // render the color space mesh given a selected color space
  const renderMesh = useCallback(
    (scene: Babylon.Scene) => {
      if (useGeometry && !awaitingResponse) {
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
        renderColorSpace(useGeometry, scene);
      }
    },
    [awaitingResponse, useGeometry]
  );

  // render the container
  return (
    <React.Fragment>
      <header className={styles.header}>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeSourceSpace}
          id="space options"
          label="Color space"
          initialValue={toColorSpace}
        >
          <ColorSpaceOptions />
        </Select>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeReferenceIlluminant}
          id="illuminant options"
          label="Reference illuminant"
          initialValue={referenceIlluminant}
        >
          <IlluminantOptions />
        </Select>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeColorModel}
          id="destination space"
          label="Reference model"
          initialValue={toColorModel}
        >
          <ColorModelOptions />
        </Select>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeFidelity}
          id="mesh fidelity"
          label="Mesh fidelity"
          initialValue={String(meshDivisions)}
        >
          <option value={fidelity.low}>low</option>
          <option value={fidelity.med}>medium</option>
          <option value={fidelity.high}>high</option>
        </Select>
      </header>

      <Graph3d
        type={useGraphType}
        axisOptions={axisOptionsMap.get(toColorModel)}
        className={styles.bottomSpacer}
        renderMethods={[renderHemiLight, renderMesh, renderPointMesh]}
      ></Graph3d>

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
    </React.Fragment>
  );
}

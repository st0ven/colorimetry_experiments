import React, { useState, useMemo, useCallback, useEffect } from "react";
import * as Babylon from "babylonjs";
import styles from "./rgb-visualization.module.scss";
import { Graph3d, GraphType, GraphAxisOptions } from "../components/graph-3d";
import { Select } from "../components/select";
import {
  ColorSpaceOptions,
  ReferenceSpaceOptions,
} from "../components/color-space-options";
import { IlluminantOptions } from "../components/illuminant-options";
import { ColorComponent } from "../components/color-component-input";
import { ColorSpace, Illuminant, ReferenceSpace } from "../helper/color-space";
import { renderHemiLight } from "../rendering/lights";
import {
  renderColorSpace,
  renderRGBPoint,
  renderRGBinLUV,
} from "../rendering/rgb-color-space";
import {
  getBoxGeometry,
  mapPositionFromVertex,
  getPolarCoordinatesFor,
  mapFacetsFromVertex,
  mapColorFromVertex,
} from "../helper/vertices";
import { AxisRenderOptions } from "src/rendering/axes";
import { normalizeLchColor, expandRgbColor } from "../helper/transformations";

const axisOptionsL: AxisRenderOptions = {
  scalarMin: 0,
  scalarMax: 100,
  markers: 4,
  floatPoint: 0,
  axisLabel: "L",
  axisOrigin: new Babylon.Vector3(0, 0, 1),
};

const axisOptionsC: AxisRenderOptions = {
  axisLabel: "C",
  markers: 4,
  max: 1,
  floatPoint: 0,
  scalarMin: 0,
  scalarMax: 200,
};

const axisOptionsH: AxisRenderOptions = {
  axisLabel: "h",
  markers: 18,
  radius: 1,
};

const cylindricalAxesOptions: GraphAxisOptions = {
  axisOptionsX: axisOptionsH,
  axisOptionsY: axisOptionsL,
  axisOptionsZ: axisOptionsC,
};

export function RGBVisualization() {
  (async function asyncTest() {
    const response = await fetch("/transform/");
    //const body = await response.json();
    console.log(response);
    if (response.status === 200) {
      //onsole.log(response.body);
    } else {
      //throw Error(response);
    }
  })();
  // hold state for RGB color inputs
  const [redComponent, setRedComponent] = useState<number>(1);
  const [greenComponent, setGreenComponent] = useState<number>(1);
  const [blueComponent, setBlueComponent] = useState<number>(1);

  // hold state for source & reference color space / illuminant options
  const [toColorSpace, setColorSpace] = useState<ColorSpace>(ColorSpace.sRGB);
  const [toReferenceSpace, setReferenceSpace] = useState<ReferenceSpace>(
    ReferenceSpace.XYZ
  );
  const [referenceIlluminant, setReferenceIlluminant] = useState<Illuminant>(
    Illuminant.D65
  );

  // other controls to store in state
  const [meshDivisions, setMeshDivisions] = useState<number>(16);
  const [useGeometry, setGeometry] = useState<Babylon.VertexData>(
    new Babylon.VertexData()
  );

  // gather vertices representing perimeter points of a color space represented
  // as rgb pairs segmented into paths.
  const meshGeometryVertices: number[][][] = useMemo((): number[][][] => {
    return getBoxGeometry(meshDivisions);
  }, [meshDivisions]);

  // memoize the geometry in the form of vertex data to be passed to each
  // render function. This data is dependent on a number of user-defined variables.
  const meshVertexData: Babylon.VertexData = useMemo(() => {
    // create vertex data and subsequent lists to store necessary data.
    const vertexData: Babylon.VertexData = new Babylon.VertexData();
    const positions: number[][] = [];
    const indices: number[][] = [];
    const colors: number[][] = [];

    // quick alias to the total vert count of the geometry.
    const totalVerts: number = meshGeometryVertices.length;

    // determine what params to push along with the trannsformation method
    const transformParams: any[] =
      toReferenceSpace === ReferenceSpace.LCHuv
        ? [toColorSpace, referenceIlluminant]
        : [toColorSpace, { referenceIlluminant }];

    for (let i: number = 0; i < totalVerts; i++) {
      // set reference to the path within the vertex data
      let plane: number[][] = meshGeometryVertices[i];
      let pathLength: number = Math.sqrt(plane.length);

      for (let j: number = 0; j < plane.length; j++) {
        // reference to this vertex to transform
        let vertex: number[] = plane[j];

        // expand range from normalized geometry data to RGB
        let rgbColor: number[] = expandRgbColor(vertex);

        // transforms the vertex to a position in XYZ space
        let position: number[] = mapPositionFromVertex(
          rgbColor,
          ReferenceSpace.RGB,
          toReferenceSpace,
          transformParams
        );

        // polar coordinate color spaces need an additional mapping transformation
        positions.push(
          toReferenceSpace === ReferenceSpace.LCHuv
            ? getPolarCoordinatesFor(normalizeLchColor(position))
            : position
        );

        // calculate indices algorithmically and push to list
        if (plane[j + pathLength] && j % pathLength < pathLength - 1) {
          indices.push(mapFacetsFromVertex(i * plane.length + j, pathLength));
        }

        // map colors to positions and push to list
        colors.push(
          mapColorFromVertex(rgbColor, toColorSpace, referenceIlluminant)
        );
      }
    }

    // append all lists to the vertexData object, flattened
    vertexData.positions = positions.flat();
    vertexData.indices = indices.flat();
    vertexData.colors = colors.flat();

    // assign the vertex data to be memoized
    return vertexData;
  }, [
    meshGeometryVertices,
    toColorSpace,
    toReferenceSpace,
    referenceIlluminant,
  ]);

  // update the state to reflect the selection of which color profile to visualize
  const changeSourceSpace = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setColorSpace(Object(ColorSpace)[value]);
    },
    []
  );

  // update the reference illuminant to be used to calculate color transforms
  // to the reference space
  const changeReferenceIlluminant = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setReferenceIlluminant(Object(Illuminant)[value]);
    },
    []
  );

  // update the reference space to the user selected space
  const changeReferenceSpace = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setReferenceSpace(Object(ReferenceSpace)[value]);
    },
    []
  );

  // change the fidelity for which to render the meshes
  const changeFidelity = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      setMeshDivisions(Number(value));
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
      renderRGBPoint(
        [redComponent, greenComponent, blueComponent],
        toColorSpace,
        toReferenceSpace,
        referenceIlluminant,
        scene
      );
    },
    [
      redComponent,
      greenComponent,
      blueComponent,
      toColorSpace,
      toReferenceSpace,
      referenceIlluminant,
    ]
  );

  const renderLchhMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderRGBinLUV(meshVertexData, scene);
    },
    [meshVertexData]
  );

  // render the color space mesh given a selected color space
  const renderXyzMesh = useCallback(
    (scene: Babylon.Scene) => {
      renderColorSpace(meshVertexData, scene);
    },
    [meshVertexData]
  );

  // render the container
  return (
    <React.Fragment>
      <header className={styles.header}>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeSourceSpace}
          id="space options"
          label="color space"
          initialValue={toColorSpace}
        >
          <ColorSpaceOptions />
        </Select>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeReferenceIlluminant}
          id="illuminant options"
          label="reference illuminant"
          initialValue={referenceIlluminant}
        >
          <IlluminantOptions />
        </Select>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeReferenceSpace}
          id="destination space"
          label="render space"
          initialValue={toReferenceSpace}
        >
          <ReferenceSpaceOptions />
        </Select>
        <Select
          className={styles.colorSpaceSelector}
          onChange={changeFidelity}
          id="mesh fidelity"
          label="fidelity"
          initialValue={String(meshDivisions)}
        >
          <option value="2">2 segments</option>
          <option value="4">4 segments</option>
          <option value="8">8 segments</option>
          <option value="16">16 segments</option>
          <option value="24">24 segments</option>
          <option value="48">48 segments</option>
        </Select>
      </header>

      <Graph3d
        type={
          toReferenceSpace === ReferenceSpace.LCHuv
            ? GraphType.cylindrical
            : GraphType.box
        }
        axisOptions={
          toReferenceSpace === ReferenceSpace.LCHuv
            ? cylindricalAxesOptions
            : undefined
        }
        className={styles.bottomSpacer}
        renderMethods={[
          renderHemiLight,
          toReferenceSpace === ReferenceSpace.LCHuv
            ? renderLchhMesh
            : renderXyzMesh,
          renderPointMesh,
        ]}
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

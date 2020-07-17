import React, { useRef, useState, useEffect } from "react";
import * as Earcut from "earcut";
import "./App.css";
import { Graph3d } from "./components/graph-3d";
import { renderLabel } from "./helper/babylon-render";
import {
  convert_sRGB_to_XYZ_space,
  convert_XYZ_to_xyY,
} from "./helper/color-profile-conversion";
import * as Babylon from "babylonjs";

const XYZ_data = require("./data/cmf_1931_XYZ_0.1nm.csv");
//const RGB_whitepoint = convert_component_xy_to_xyz(sRGB_w_xyY);

function renderHemiLight(scene: Babylon.Scene) {
  // lighting instantitation
  const light: Babylon.HemisphericLight = new Babylon.HemisphericLight(
    "hemi1",
    new Babylon.Vector3(0, 20, 0),
    scene
  );
  light.diffuse = new Babylon.Color3(1, 1, 1);
  light.groundColor = new Babylon.Color3(1, 1, 1);
  light.specular = new Babylon.Color3(0, 0, 0);
}

function render_XYZ_locus(scene: Babylon.Scene) {
  const XYZ_locus_vertexData = XYZ_data
    // extract wavelength info
    .map((datum: Array<string>) =>
      datum.slice(1).map((point: string) => Number(point))
    )
    // normalize to a 3d plane
    .map((datum: Array<number>) => {
      const sum = datum[0] + datum[1] + datum[2];
      return new Babylon.Vector3(
        datum[0] / sum,
        datum[1] / sum,
        datum[2] / sum
      );
    });

  const XYZ_locus_curve: Babylon.Path3D = new Babylon.Path3D(
    XYZ_locus_vertexData
  );

  const normals: Array<Babylon.Vector3> = XYZ_locus_curve.getNormals();
  const binormals: Array<Babylon.Vector3> = XYZ_locus_curve.getBinormals();
  const markerScale: number = 0.02;
  const labelSize: number = 0.08;

  XYZ_locus_curve.getCurve().forEach(
    (vector: Babylon.Vector3, index: number) => {
      if (!(index % 100)) {
        // calculate the marker endpoint vector
        const normalVector: Babylon.Vector3 = normals[index];
        const binormalVector: Babylon.Vector3 = binormals[index];
        const markerVector: Babylon.Vector3 = vector
          .add(normalVector.scale(markerScale))
          .add(binormalVector.scale(markerScale));

        // render marker line
        Babylon.MeshBuilder.CreateLines(
          `XYZ-locus-mark-${index}`,
          { points: [vector, markerVector] },
          scene
        );

        renderLabel(
          `${Number(XYZ_data[index][0])}nm`,
          markerVector,
          {
            fontSize: 160,
            fontWeight: "normal",
            fontFamily: "Arial",
            labelWidth: labelSize * 2,
            labelHeight: labelSize,
            positionScale: 1.04,
            scale: 0.75,
            textureWidth: 640,
            textureHeight: 320,
          },
          scene
        );
      }
    }
  );

  Babylon.MeshBuilder.CreateLines(
    "xyz-locus",
    {
      points: XYZ_locus_vertexData,
    },
    scene
  );
}

function render_sRGB_chromaticity(scene: Babylon.Scene) {
  const primaries: number[][] = [
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];

  const facetIndices: number[] = [
    [0, 6, 1],
    [6, 2, 1],
    [3, 2, 6],
    [6, 4, 3],
    [6, 5, 4],
    [0, 5, 6],
  ].flat();

  const positions: Array<number> = primaries
    .map((primary: number[]) =>
      primary.map((component: number) => component * 255)
    )
    .map((primary: number[]) => convert_sRGB_to_XYZ_space(primary))
    .map((XYZ_primary: number[]) => convert_XYZ_to_xyY(XYZ_primary))
    .flat();

  const colors: number[] = primaries
    .map((primary: number[]) => primary.concat([1]))
    .flat();

  const vertexData: Babylon.VertexData = new Babylon.VertexData();
  vertexData.positions = positions;
  vertexData.colors = colors;
  vertexData.indices = facetIndices;

  const mat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
    "mat1",
    scene
  );
  mat.backFaceCulling = false;

  const mesh: Babylon.Mesh = new Babylon.Mesh("sRGB_color_space", scene);
  mesh.material = mat;

  vertexData.applyToMesh(mesh);
}

function renderRedPrimaryCurve(scene: Babylon.Scene) {
  const primaries: number[][] = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];

  const facetIndices: number[] = [
    [3, 0, 1],
    [3, 1, 2],
    [4, 3, 2],
    [7, 4, 2],
    [7, 2, 1],
    [6, 7, 1],
    [7, 5, 4],
    [6, 5, 7],
    [4, 5, 0],
    [0, 3, 4],
    [6, 1, 0],
    [0, 5, 6],
  ].flat();

  const positions: number[] = primaries
    .map((primary: number[]) =>
      primary.map((component: number) => component * 255)
    )
    .map((color: number[]) => convert_sRGB_to_XYZ_space(color))
    //.map((color: number[]) => new Babylon.Vector3(...color))
    .flat();

  const colors: number[] = primaries
    .map((primary: number[]) => primary.concat([1]))
    .flat();

  const vertexData: Babylon.VertexData = new Babylon.VertexData();
  vertexData.positions = positions;
  vertexData.colors = colors;
  vertexData.indices = facetIndices;

  const mat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
    "emissive",
    scene
  );
  mat.diffuseColor = new Babylon.Color3(1, 1, 0);
  mat.emissiveColor = new Babylon.Color3(1, 1, 1);
  mat.useEmissiveAsIllumination = true;

  const mesh: Babylon.Mesh = new Babylon.Mesh("srgb_in_XYZ", scene);
  vertexData.applyToMesh(mesh);

  /*Babylon.MeshBuilder.CreateLines(
    "lines",
    {
      points: primaries
        .map((primary: number[]) =>
          primary.map((component: number) => component * 255)
        )
        .map((color: number[]) => convert_sRGB_to_XYZ_space(color))
        .map((color: number[]) => new Babylon.Vector3(...color)),
    },
    scene
  );*/
}

function App() {
  return (
    <div className="App">
      <Graph3d
        lights={[renderHemiLight]}
        meshes={[render_XYZ_locus, render_sRGB_chromaticity]}
      ></Graph3d>
      <Graph3d
        lights={[renderHemiLight]}
        meshes={[renderRedPrimaryCurve]}
      ></Graph3d>
    </div>
  );
}

export default App;

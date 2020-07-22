import * as Babylon from "babylonjs";
import {
  ColorSpace,
  gammaCorrect_linearRGB_to_sRGB,
  transfer_gammaRGB_to_linearRGB,
  profiles,
} from "./color-profile-conversion";

// defines primary color points for red, green, blue, yellow, cyan, magenta
// as represented in scale from 0 - 1.
const XYZ_primaries: number[][] = [
  [1, 0, 0], // red
  [1, 1, 0], // orange
  [0, 1, 0], // green
  [0, 1, 1], // magenta
  [0, 0, 1], // blue
  [1, 0, 1], // cyan
];

// itereate through scene meshes and return the mesh instance that matches
// the provided name, or undefined if none are found
export function findMeshByName(
  name: string,
  scene: Babylon.Scene
): Babylon.AbstractMesh | undefined {
  for (let mesh of scene.meshes) {
    if (mesh.name === name) {
      return mesh;
    }
  }
  return undefined;
}

// takes a coordinate in RGB refernce space and projects onto a
// 3d plane for easier visualization of the chromaticity plot
function project_XYZ_to_3D_plane([X, Y, Z]: number[]): number[] {
  const sum: number = X + Y + Z;
  return [X / sum, Y / sum, Z / sum];
}

/*
Render color profile planes projected into xyY space
*/
export function renderProfileChromaticityPlane(
  name: string,
  colorSpace: ColorSpace,
  scene: Babylon.Scene
) {
  if (scene) {
    const { convertToReferenceSpace, primaries } = profiles[colorSpace];

    // used to define facet triangles to manually render primary points as a polygon
    const facetIndices: number[] = [2, 1, 0]; //[0, 5, 2];

    // get vector positions array in xyY space for all primaries, given a
    // particular color profile array of xyY primaries and xyY whitepoint
    const positions: Array<number> = primaries
      .map(([x, y]: number[]) => [x, y, 1 - x - y])
      .flat();

    // gathers an array of numbers representing a 4 number pair representing
    // r, g, b & a values of a Babylon.Color4 object.
    const colors: number[] = [
      XYZ_primaries[0],
      XYZ_primaries[2],
      XYZ_primaries[4],
    ]
      .map((primary: number[]) =>
        gammaCorrect_linearRGB_to_sRGB(primary, colorSpace)
      )
      // convert XYZ primaries to gamma corrected values reflecting proper
      // color space value and flatten all results.
      .map((primary: number[]) =>
        convertToReferenceSpace(primary, colorSpace).concat([1])
      )
      .flat();

    // create reference to a mesh instance. We want to update exisitng meshes
    // if they exist rather than destroying/recreating them.
    let existingMesh: Babylon.AbstractMesh | undefined = findMeshByName(
      name,
      scene
    );

    // if an existing mesh has been found, update its vertexData
    // which includes both positions and color range
    if (existingMesh) {
      existingMesh.setVerticesData(
        Babylon.VertexBuffer.PositionKind,
        positions,
        true
      );
      existingMesh.setVerticesData(
        Babylon.VertexBuffer.ColorKind,
        colors,
        true
      );
    } else {
      // instantiate vertexData which will map to a mesh to manually build Babylon polygon
      const vertexData: Babylon.VertexData = new Babylon.VertexData();
      vertexData.positions = positions;
      vertexData.colors = colors;
      vertexData.indices = facetIndices;

      // instantiate material for rendering effect
      const mat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
        `${name}-material`,
        scene
      );
      mat.backFaceCulling = false;

      // createa a new mesh as none with this name have been found
      const newMesh = new Babylon.Mesh(name, scene);
      newMesh.material = mat;

      // apply vertextData to mesh to render polygon
      vertexData.applyToMesh(newMesh, true);
    }
  }
}

/*
Render spectral locus of tristimulus values in XYZ space
*/
export function renderSpectralLocusXYZ(
  name: string = "spectral_locus",
  rawSpectralData: string[][],
  scene: Babylon.Scene
) {
  // The spectral locus is a static element and only needs to be rendered once.
  // Only proceed to render if an instance cannot be found in the scene.
  if (!findMeshByName(name, scene)) {
    // mutate the rawSpectral data to extract an array of Babylon.Vector3
    // objects representing the coordinates at each wavelength in the LUT.
    const spectralPoints_xyY: Babylon.Vector3[] = rawSpectralData
      // extract wavelength info and coerce into numeric form
      .map((datum: Array<string>) =>
        datum.slice(1).map((point: string) => Number(point))
      )
      // normalize to a 3d plane as a vector3 array
      .map((datum: Array<number>) => {
        return new Babylon.Vector3(...project_XYZ_to_3D_plane(datum));
      });

    // create a Babylon.Path3D object out of the extracted vector arary
    const XYZ_locus_curve: Babylon.Path3D = new Babylon.Path3D(
      spectralPoints_xyY
    );

    // constants to be used while painting the locus details
    const normals: Array<Babylon.Vector3> = XYZ_locus_curve.getNormals();
    const binormals: Array<Babylon.Vector3> = XYZ_locus_curve.getBinormals();
    const markerScale: number = 0.02;
    const labelSize: number = 0.08;
    const labelOptions: RenderLabelOptions = {
      fontSize: 160,
      fontWeight: "normal",
      fontFamily: "Arial",
      labelWidth: labelSize * 2,
      labelHeight: labelSize,
      positionScale: 1.04,
      scale: 0.75,
      textureWidth: 640,
      textureHeight: 320,
    };

    // iterate through each curve point to render wavelength markers
    // along the path. Markers are placed with prejudice for legibility.
    XYZ_locus_curve.getCurve().forEach(
      (vector: Babylon.Vector3, index: number) => {
        if (
          !(index % 100) &&
          !(index > 0 && index < 700) &&
          !(
            index < spectralPoints_xyY.length - 1 &&
            index > spectralPoints_xyY.length - 1902
          )
        ) {
          // calculate the marker endpoint vector
          const markerVector: Babylon.Vector3 = vector
            .add(normals[index].scale(markerScale))
            .add(binormals[index].scale(markerScale));

          // render marker line
          Babylon.MeshBuilder.CreateLines(
            `XYZ-locus-mark-${index}`,
            { points: [vector, markerVector] },
            scene
          );

          // render the marker label relative to the marker with rendering options.
          renderLabel(
            `${Number(rawSpectralData[index][0])}nm`,
            markerVector,
            labelOptions,
            scene
          );
        }
      }
    );

    // Build the main locus curve mesh into the scene
    Babylon.MeshBuilder.CreateLines(
      name,
      {
        points: spectralPoints_xyY,
      },
      scene
    );
  }
}

/*
Render profile color space in XYZ space
*/
export function renderColorSpace(
  name: string,
  colorSpace: ColorSpace,
  scene: Babylon.Scene
) {
  const { convertToReferenceSpace } = profiles[colorSpace];

  const XYZ_positions: number[][] = [[0, 0, 0], ...XYZ_primaries, [1, 1, 1]];

  const positions: number[] = XYZ_positions.map((color: number[]) =>
    convertToReferenceSpace(color, colorSpace)
  ).flat();

  const colors: number[] = XYZ_positions.map((primary: number[]) =>
    gammaCorrect_linearRGB_to_sRGB(primary, colorSpace)
  )
    .map((primary: number[]) =>
      convertToReferenceSpace(primary, colorSpace).concat([1])
    )
    .flat();

  const vertexData: Babylon.VertexData = new Babylon.VertexData();
  vertexData.positions = positions;
  vertexData.colors = colors;

  let existingMesh: Babylon.AbstractMesh | undefined = findMeshByName(
    name,
    scene
  );

  if (existingMesh) {
    existingMesh.setVerticesData(
      Babylon.VertexBuffer.PositionKind,
      vertexData.positions,
      true
    );
    existingMesh.setVerticesData(Babylon.VertexBuffer.ColorKind, colors, true);
  } else {
    vertexData.indices = [
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

    const mat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
      "emissive",
      scene
    );
    mat.diffuseColor = new Babylon.Color3(1, 1, 0);
    mat.emissiveColor = new Babylon.Color3(1, 1, 1);
    mat.useEmissiveAsIllumination = true;

    const mesh: Babylon.Mesh = new Babylon.Mesh(name, scene);
    vertexData.applyToMesh(mesh);
  }
}

/*
render billboard text labels
*/
interface RenderLabelOptions {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  labelWidth?: number;
  labelHeight?: number;
  opacity?: number;
  positionScale?: number;
  scale?: number;
  textureWidth?: number;
  textureHeight?: number;
}

export function renderLabel(
  label: string,
  position: Babylon.Vector3,
  {
    backgroundColor = "rgba(0,0,0,0)",
    color = "white",
    fontSize = 128,
    fontWeight = "normal",
    fontFamily = "Arial",
    labelWidth = 0.25,
    labelHeight = 0.125,
    opacity = 1,
    positionScale = 1,
    scale = 1,
    textureWidth = 240,
    textureHeight = 240,
  }: RenderLabelOptions,
  scene: Babylon.Scene
) {
  // construct label mesh
  const mesh = Babylon.MeshBuilder.CreatePlane(
    `label-plane-${label}`,
    {
      width: labelWidth,
      height: labelHeight,
      sideOrientation: Babylon.Mesh.DOUBLESIDE,
    },
    scene
  );

  // construct texture instance for label
  const texture = new Babylon.DynamicTexture(
    `label-texture-${label}`,
    { width: textureWidth, height: textureHeight },
    scene,
    false
  );

  // construct material instance for label
  const material = new Babylon.StandardMaterial(`label-mat-${label}`, scene);

  // assign texture to material
  material.diffuseTexture = texture;

  // transformations to mesh to anchor to marker endpoint
  mesh.position = position.scale(positionScale);
  mesh.scaling = new Babylon.Vector3(scale, scale, scale);
  mesh.billboardMode = Babylon.Mesh.BILLBOARDMODE_ALL;
  mesh.material = material;

  // set texture properties and render text
  texture.hasAlpha = true;
  texture.drawText(
    label,
    null,
    null,
    `${fontWeight} ${fontSize}px ${fontFamily}`,
    color,
    backgroundColor,
    true
  );
}

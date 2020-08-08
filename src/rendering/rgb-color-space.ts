import * as Babylon from "babylonjs";
import {
  expandRgbColor,
  transformRGBtoXYZ,
  transformXYZtoLUV,
  normalizeRGBColor,
  normalizeLchColor,
  transformLuvToLch,
  transformLchToRgb,
  transformRgbToLch,
} from "../helper/color-space-conversion";
import {
  ColorSpace,
  RenderSpace,
  XYZ_primaries,
  Illuminant,
} from "../helper/color-space";
import { rgbEdgePoints } from "../helper/points-helper";

// Render profile color space in XYZ space
export function renderColorSpace(
  colorSpaceName: ColorSpace,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene
) {
  // entity names used in this function
  const entityNames: any = {
    alphaMaterial: "mat.color-space",
    wfMaterial: "mat.color-space-wireframe",
    mesh: "mesh.color-space",
    clone: "mesh.color-space-wireframe",
  };

  // include black & white points with the 6 primaries
  const XYZ_positions: number[][] = [[0, 0, 0], ...XYZ_primaries, [1, 1, 1]];

  // positions are calculated by mapping primary points + whitepoint & blackpoint
  // as they are companded from their source color space into reference space
  const positions: number[] = XYZ_positions.map((color: number[]) =>
    transformRGBtoXYZ(expandRgbColor(color), colorSpaceName, {
      referenceIlluminant,
    })
  ).flat();

  // colors must also compand values from source space to reference space but also
  // should apply gamma correction relevant to the profile for accurate color representation
  const colors: number[] = XYZ_positions.map((color: number[]) =>
    transformRGBtoXYZ(expandRgbColor(color), colorSpaceName, {
      compand: true,
      referenceIlluminant,
    }).concat([1])
  ).flat();

  // define babylon VertexData to be applied to the 3d box mesh
  const vertexData: Babylon.VertexData = new Babylon.VertexData();
  vertexData.positions = positions;
  vertexData.colors = colors;
  // which will require facets to be defined through indices property in VertexData
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

  // create a material for alpha transparency to be applied to colored mesh
  const alphaMaterial: Babylon.StandardMaterial =
    (scene.getMaterialByName(
      entityNames.alphaMaterial
    ) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(entityNames.alphaMaterial, scene);

  // set material properties
  alphaMaterial.alpha = 0.05;

  // creation of material for wireframe effect
  const wfMaterial: Babylon.StandardMaterial =
    (scene.getMaterialByName(
      entityNames.wireframe
    ) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(entityNames.wireframe, scene);

  // set material properties
  wfMaterial.emissiveColor = new Babylon.Color3(1, 1, 1);
  wfMaterial.useEmissiveAsIllumination = true;
  wfMaterial.alpha = 0.05;
  wfMaterial.wireframe = true;

  // search for the existing mesh name if any controls have been updated
  const mesh: Babylon.Mesh =
    (scene.getMeshByName(entityNames.mesh) as Babylon.Mesh) ||
    new Babylon.Mesh(entityNames.mesh, scene);

  mesh.material = alphaMaterial;

  // apply vertex data to base mesh
  vertexData.applyToMesh(mesh);

  // clone the base mesh and apply material for the additional wireframe effect
  const wireframeMesh: Babylon.Mesh =
    (scene.getMeshByName(entityNames.clone) as Babylon.Mesh) ||
    mesh.clone(entityNames.clone, null, true);

  // apply the material to the wireframe clone
  wireframeMesh.material = wfMaterial;
}

// Renders an indicator within 3d space which utilizes a sphere. This sphere
// represents position of a given color mapped to a reference space as well as
// mapping a gamma corrected color to simulate chroma/value given a reference illuminant.
export function renderRGBPoint(
  rgb_color: number[],
  currentSpace: ColorSpace,
  toColorSpace: RenderSpace = RenderSpace.XYZ,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene
) {
  // hold a reference ot entity names to ne used in this render function
  const baseEntityName: string = "rgb-value-indicator";
  const entityNames: any = {
    transform: `transform.${baseEntityName}`,
    material: `material.${baseEntityName}`,
    mesh: `mesh.${baseEntityName}`,
  };

  // derive location in XYZ space of point center
  let pointPosition: number[] = transformRGBtoXYZ(
    expandRgbColor(rgb_color),
    currentSpace,
    {
      referenceIlluminant,
    }
  );

  // locate position coordinates
  pointPosition =
    toColorSpace === RenderSpace.LCHuv
      ? [
          transformLuvToLch(
            transformXYZtoLUV(pointPosition, referenceIlluminant)
          ),
        ]
          .map((Lch_color: number[]) => normalizeLchColor(Lch_color))
          .map((normalizedColor: number[]) =>
            plotCylindricalCoords(normalizedColor)
          )
          .flat()
      : pointPosition;

  // derive normalized RGB color for the point within the current space
  // add companding flag to ensure proper gamma correction is applied
  const pointColor: number[] = transformRGBtoXYZ(
    expandRgbColor(rgb_color),
    currentSpace,
    {
      compand: true,
      referenceIlluminant,
    }
  );

  // Create a transform node, or reference one from a provided entity list.
  // set the transform position based on derived pointPosition.
  // This ultimately moves the sphere to the proper location within XYZ space
  // create new transform node
  const transformNode: Babylon.TransformNode =
    scene.getTransformNodeByName(entityNames.transform) ||
    new Babylon.TransformNode(entityNames.transform);

  // move the transformation node to align with the updated position
  transformNode.position.x = pointPosition[0];
  transformNode.position.y = pointPosition[1];
  transformNode.position.z = pointPosition[2];

  // find the material within the scene if it hasnt yet been created
  const material: Babylon.StandardMaterial =
    (scene.getMaterialByName(
      entityNames.material
    ) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(entityNames.material, scene);

  // apply the converted color as the material diffuse color
  material.diffuseColor = new Babylon.Color3(...pointColor);

  // search for the existing mesh name if any controls have been updated
  // or create a new one if none are found
  let mesh: Babylon.Mesh =
    (scene.getMeshByName(entityNames.mesh) as Babylon.Mesh) ||
    Babylon.SphereBuilder.CreateSphere(
      entityNames.mesh,
      { diameter: 0.04 },
      scene
    );

  // set mesh properties
  mesh.parent = transformNode;
  mesh.material = material;
  mesh.useVertexColors = true;
}

const expandedPositions: number[][] = [];
for (let i = 0; i <= Math.pow(2, 8); i += 64) {
  for (let j = 0; j <= Math.pow(2, 8); j += 64) {
    for (let k = 0; k <= Math.pow(2, 8); k += 64) {
      if (
        !i ||
        !j ||
        !k ||
        i === Math.pow(2, 8) ||
        j === Math.pow(2, 8) ||
        k === Math.pow(2, 8)
      )
        expandedPositions.push([i ? i - 1 : i, j ? j - 1 : j, k ? k - 1 : k]);
    }
  }
}

function transformPointsRgbToLch(
  path: number[][],
  cSpace: ColorSpace,
  rIll: Illuminant
) {
  return path
    .map((position: number[]) => transformRgbToLch(position, cSpace, rIll))
    .map((lch_color: number[]) => normalizeLchColor(lch_color))
    .map(plotCylindricalCoords);
}

function generateIndicesMapFromPaths(path: number[][], p: number) {
  return path.map((point: number[], i: number) => {
    let p0: number = p * path.length + i;
    let p1: number | undefined = p0 + 1;
    let adj_p0: number | undefined = p0 + path.length - 1;
    let adj_p1: number | undefined = p0 + path.length;
    let facetA: number[] = p1 ? [p0, adj_p1, adj_p0] : [];
    let facetB: number[] = p1 ? [p0, p1, adj_p1] : [];
    return [facetA, facetB].flat();
  });
}

function generateColorPointsFromPaths(
  path: number[][],
  cSpace: ColorSpace
): number[][] {
  return path.map((position: number[]) =>
    transformRGBtoXYZ(position, cSpace).concat([1])
  );
}

// render a color space given a source space into LUV space. Requires a scene
// and a reference illuminant. Illuminant is configurable from the UI.
export function renderRGBinLUV(
  sourceColorSpace: ColorSpace,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene
) {
  // entity names
  const baseEntityName: string = "color-space-in-LCHuv";
  const entityNames: any = {
    mesh: `mesh.${baseEntityName}`,
    material: `material.${baseEntityName}`,
    wireframeMesh: `mesh.${baseEntityName}-wireframe`,
    wireframeMaterial: `material.${baseEntityName}-wireframe`,
  };

  const primaryPaths: number[][][] = rgbEdgePoints.map((path: number[][]) =>
    transformPointsRgbToLch(path, sourceColorSpace, referenceIlluminant)
  );

  const capPaths: number[][][] = rgbEdgePoints
    .filter((path: number[][], i: number) => {
      return !i || i >= primaryPaths.length - 1 ? Array.from(path) : null;
    })
    .map((path: number[][]) =>
      transformPointsRgbToLch(path, sourceColorSpace, referenceIlluminant)
    );

  const vindices: number[][][] = primaryPaths.map(
    (path: number[][], p: number) => {
      return p < primaryPaths.length - 1
        ? generateIndicesMapFromPaths(path, p)
        : [];
    }
  );

  const capindices: number[][][] = capPaths.map(
    (path: number[][], i: number) => {
      const pSum: number[] = path.reduce((acc: number[], p: number[]) => {
        const { x, y, z } = new Babylon.Vector3(...acc).add(
          new Babylon.Vector3(...p)
        );
        return [x, y, z];
      });
      const pCenter: number[] = pSum.map((c: number) => c / path.length);
      //const newPath: number[][] = Array.from(path);
      path.unshift(pCenter);
      return path.map((p: number[], j: number) => {
        return j > 0 ? [0, j, j - 1] : [];
      });
    }
  );

  const colorpointsB: number[] = rgbEdgePoints
    .map((path: number[][]) =>
      generateColorPointsFromPaths(path, sourceColorSpace)
    )
    .flat(2);

  const colorpointsC: number[] = [[0, 0, 0, 1]]
    .concat(generateColorPointsFromPaths(rgbEdgePoints[0], sourceColorSpace))
    .flat(2);

  const testMat: Babylon.StandardMaterial =
    (scene.getMaterialByName("testribbonmat") as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial("testribbonmat", scene);
  //testMat.emissiveColor = new Babylon.Color3(1, 1, 1);
  //testMat.useEmissiveAsIllumination = true;
  testMat.wireframe = true;
  //testMat.alpha = 0.5;
  testMat.backFaceCulling = false;

  const vData: Babylon.VertexData = new Babylon.VertexData();
  vData.positions = primaryPaths.flat(2);
  vData.colors = colorpointsB;
  vData.indices = vindices.flat(2);

  const testmesh: Babylon.Mesh =
    (scene.getMeshByName("testMesh") as Babylon.Mesh) ||
    new Babylon.Mesh("testMesh", scene);

  testmesh.material = testMat;

  vData.applyToMesh(testmesh);

  const capmesh: Babylon.Mesh =
    (scene.getMeshByName("capMesh1") as Babylon.Mesh) ||
    new Babylon.Mesh("capMesh1", scene);
  capmesh.material = testMat;

  const vDataCapA: Babylon.VertexData = new Babylon.VertexData();
  vDataCapA.positions = capPaths[0].flat(2);
  vDataCapA.colors = colorpointsC;
  vDataCapA.indices = capindices[0].flat(2);
  vDataCapA.applyToMesh(capmesh);


  // construct array of position points to apply to VertexData object.
  /*const positions: number[][] = XYZ_positions.map((position: number[]) =>
    transformRgbToLch(
      expandRgbColor(position),
      sourceColorSpace,
      referenceIlluminant
    )
  )
    .map((Lch_color: number[]) => normalizeLchColor(Lch_color))
    .map(plotCylindricalCoords);

  // derive normalized RGB color for the point within the current space
  const colors: number[][] = XYZ_positions.map((color: number[]) =>
    transformRGBtoXYZ(expandRgbColor(color), sourceColorSpace, {
      compand: true,
      referenceIlluminant,
    }).concat([1])
  ); //.flat();

  // define vertex data instance and apply properties for geometry & color
  const vertexData: Babylon.VertexData = new Babylon.VertexData();
  vertexData.positions = positions.flat();
  vertexData.colors = colors.flat();
  vertexData.indices = [
    [0, 1, 6],
    [0, 6, 5],
    [0, 5, 4],
    [0, 4, 3],
    [0, 1, 2],
    [0, 2, 3],
    [7, 3, 4],
    [7, 4, 5],
    [7, 5, 6],
    [7, 6, 1],
    [7, 1, 2],
    [7, 2, 3],
  ].flat();

  // grab reference to the existing material if it is already in the scene.
  // create a new one if it cannot be found.
  const material: Babylon.StandardMaterial =
    (scene.getMaterialByName(
      entityNames.material
    ) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(entityNames.material, scene);

  // construct material to ensure facets can be viewable from all angles
  material.backFaceCulling = false;
  material.alpha = 0.1;

  const wireframeMaterial: Babylon.StandardMaterial =
    (scene.getMaterialByName(
      entityNames.wireframeMaterial
    ) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(entityNames.wireframeMaterial, scene);

  // set material properties
  wireframeMaterial.emissiveColor = new Babylon.Color3(1, 1, 1);
  wireframeMaterial.useEmissiveAsIllumination = true;
  wireframeMaterial.alpha = 0.05;
  wireframeMaterial.wireframe = true;

  // construct the color space mesh. Look first to see if it is already in the scene.
  const mesh: Babylon.Mesh =
    (scene.getMeshByName(entityNames.mesh) as Babylon.Mesh) ||
    new Babylon.Mesh(entityNames.mesh, scene);

  // apply material to mesh
  mesh.material = material;

  // apply vertex data to mesh to shape it
  vertexData.applyToMesh(mesh);

  const wireframe: Babylon.Mesh =
    (scene.getMeshByName(entityNames.wireframeMesh) as Babylon.Mesh) ||
    mesh.clone(entityNames.wireframeMesh);
  wireframe.material = wireframeMaterial;
      */
  const camera: Babylon.Nullable<Babylon.ArcRotateCamera> = scene.getCameraByName(
    "camera"
  ) as Babylon.ArcRotateCamera;

  camera.setTarget(new Babylon.Vector3(0, 0.5, 0));
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 3;
}

function plotCylindricalCoords(colorNormalized: number[]): number[] {
  //const colorNormalized: number[] = normalizeLchColor(color);
  const hue: number = colorNormalized[2] * 2 * Math.PI;
  const chroma: number = colorNormalized[1];
  const lightness: number = colorNormalized[0];

  // calculate cartesian coordinates of polar space
  const x: number = chroma * Math.cos(hue);
  const y: number = lightness;
  const z: number = chroma * Math.sin(hue);

  // return the new constructed point
  return [x, y, z];
}

import * as Babylon from "babylonjs";
import { transformRGBtoXYZ } from "../helper/color-space-conversion";
import { findEntityInList } from "../helper/babylon-entities";
import { findMeshByName } from "../helper/babylon-entities";
import {
  ColorSpace,
  XYZ_primaries,
  illuminant,
  Illuminant,
} from "../helper/color-space";

/*
Render profile color space in XYZ space
*/
export function renderColorSpace(
  name: string,
  colorSpaceName: ColorSpace,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene
) {
  // include black & white points with the 6 primaries
  const XYZ_positions: number[][] = [[0, 0, 0], ...XYZ_primaries, [1, 1, 1]];

  // positions are calculated by mapping primary points + whitepoint & blackpoint
  // as they are companded from their source color space into reference space
  const positions: number[] = XYZ_positions.map((color: number[]) =>
    transformRGBtoXYZ(color, colorSpaceName, {
      referenceIlluminant: illuminant[referenceIlluminant],
    })
  ).flat();

  // colors must also compand values from source space to reference space but also
  // should apply gamma correction relevant to the profile for accurate color representation
  const colors: number[] = XYZ_positions.map((color: number[]) =>
    transformRGBtoXYZ(color, colorSpaceName, {
      compand: true,
      referenceIlluminant: illuminant[referenceIlluminant],
    }).concat([1])
  ).flat();

  // define babylon VertexData to be applied to the 3d box mesh
  const vertexData: Babylon.VertexData = new Babylon.VertexData();
  vertexData.positions = positions;
  vertexData.colors = colors;

  // search for the existing mesh name if any controls have been updated
  let existingMesh: Babylon.AbstractMesh | undefined = findMeshByName(
    name,
    scene
  );

  // update the mesh if this is a re-render by applying the new positions/color data
  if (existingMesh) {
    existingMesh.setVerticesData(
      Babylon.VertexBuffer.PositionKind,
      positions,
      true
    );
    existingMesh.setVerticesData(Babylon.VertexBuffer.ColorKind, colors, true);
  }
  // otherwise we are creating a fresh/new mesh
  else {
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

    // creation of material for wireframe effect
    const mat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
      "emissive",
      scene
    );
    mat.emissiveColor = new Babylon.Color3(1, 1, 1);
    mat.useEmissiveAsIllumination = true;
    mat.alpha = 0.05;
    mat.wireframe = true;

    const invisMat: Babylon.StandardMaterial = new Babylon.StandardMaterial(
      "alpha-mat",
      scene
    );
    invisMat.alpha = 0.1;

    // base mesh with vertex data applied
    const mesh: Babylon.Mesh = new Babylon.Mesh(name, scene);
    mesh.overlayAlpha = 0;
    mesh.material = invisMat;
    vertexData.applyToMesh(mesh);

    // clone the base mesh and apply material for the additional wireframe effect
    const wireframe: Babylon.Mesh = mesh.clone(`${name}_wireframe`);
    wireframe.material = mat;
  }
}

export function renderRGBPoint(
  rgb_color: number[],
  currentSpace: ColorSpace,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene,
  entityRefs?: Array<
    Babylon.StandardMaterial | Babylon.AbstractMesh | Babylon.TransformNode
  >
): Array<
  Babylon.StandardMaterial | Babylon.AbstractMesh | Babylon.TransformNode
> {
  // hold a reference ot entity names to ne used in this render function
  const entityNames: any = {
    transform: "rgb-point-transform",
    material: "rgb-point-material",
    mesh: "rgb-point-mesh",
  };
  // derive location in XYZ space of point center
  const pointPosition: number[] = transformRGBtoXYZ(rgb_color, currentSpace, {
    referenceIlluminant: illuminant[referenceIlluminant],
  });

  // derive normalized RGB color for the point within the current space
  const pointColor: number[] = transformRGBtoXYZ(rgb_color, currentSpace, {
    compand: true,
    referenceIlluminant: illuminant[referenceIlluminant],
  });

  // Create a transform node, or reference one from a provided entity list.
  // set the transform position based on derived pointPosition.
  // This ultimately moves the sphere to the proper location within XYZ space
  // create new transform node
  const transformNode: Babylon.TransformNode =
    (entityRefs
      ? findEntityInList(entityRefs, entityNames.transform)
      : undefined) || new Babylon.TransformNode(entityNames.transform);

  // move the transformation node to align with the updated position
  transformNode.position.x = pointPosition[0];
  transformNode.position.y = pointPosition[1];
  transformNode.position.z = pointPosition[2];

  // find the material within the scene if it hasnt yet been created
  const material: Babylon.StandardMaterial =
    (entityRefs
      ? findEntityInList(entityRefs, entityNames.material)
      : undefined) || new Babylon.StandardMaterial(entityNames.material, scene);

  // apply the converted color as the material diffuse color
  material.diffuseColor = new Babylon.Color3(...pointColor);

  // search for the existing mesh name if any controls have been updated
  // or create a new one if none are found
  let mesh: Babylon.AbstractMesh | Babylon.Mesh =
    (entityRefs ? findEntityInList(entityRefs, entityNames.mesh) : undefined) || //findMeshByName(entityNames.mesh, scene) ||
    Babylon.SphereBuilder.CreateSphere(
      entityNames.mesh,
      { diameter: 0.04 },
      scene
    );

  // set mesh properties
  mesh.parent = transformNode;
  mesh.material = material;
  mesh.useVertexColors = true;

  // return entities for reference in successive calls
  return [material, mesh, transformNode];
}

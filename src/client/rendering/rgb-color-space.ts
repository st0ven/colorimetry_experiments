import * as Babylon from "babylonjs";
import {
  expandRgbColor,
  normalizeLchColor,
  Transform,
} from "../../lib/color-transformations";
import { ColorSpace, ReferenceSpace, Illuminant } from "../../lib/color-space";
import { sceneEntityNames } from "../data/rendering-constants";

// Render profile color space in XYZ space
export function renderColorSpace(
  vertexData: Babylon.VertexData,
  scene: Babylon.Scene
) {
  // cache scene entity name references for simple aliasing
  const { material, mesh } = sceneEntityNames.colorSpace;

  // base material to provide backface visibility and apply any opacity
  const materialSpectrum: Babylon.StandardMaterial =
    (scene.getMaterialByName(material.geometry) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(material.geometry, scene);

  // set material properties
  materialSpectrum.backFaceCulling = false;
  materialSpectrum.alpha = 1;

  // creation of material for wireframe effect
  const materialWireframe: Babylon.StandardMaterial =
    (scene.getMaterialByName(material.wireframe) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(material.wireframe, scene);

  // set material properties
  materialWireframe.emissiveColor = new Babylon.Color3(1, 1, 1);
  materialWireframe.useEmissiveAsIllumination = true;
  materialWireframe.alpha = 0.15;
  materialWireframe.wireframe = true;

  // search for the existing mesh name if any controls have been updated
  const meshSpectrum: Babylon.Mesh =
    (scene.getMeshByName(mesh.geometry) as Babylon.Mesh) ||
    new Babylon.Mesh(mesh.geometry, scene);

  // apply color material to base mesh
  meshSpectrum.material = materialSpectrum;

  // apply vertex data to base mesh
  vertexData.applyToMesh(meshSpectrum);

  // clone the base mesh and apply material for the additional wireframe effect
  const wireframeMesh: Babylon.Mesh =
    (scene.getMeshByName(mesh.wireframe) as Babylon.Mesh) ||
    meshSpectrum.clone(mesh.wireframe, null, true);

  // apply the material to the wireframe clone
  wireframeMesh.material = materialWireframe;

  // get reference to the in-scene camera
  const camera: Babylon.Nullable<Babylon.ArcRotateCamera> = scene.getCameraByName(
    "camera"
  ) as Babylon.ArcRotateCamera;

  // update camera to focus on XYZ origin
  camera.setTarget(new Babylon.Vector3(0.5, 0.5, 0.5));
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 2;
}

// Renders an indicator within 3d space which utilizes a sphere. This sphere
// represents position of a given color mapped to a reference space as well as
// mapping a gamma corrected color to simulate chroma/value given a reference illuminant.
export function renderRGBPoint(
  rgb_color: number[],
  currentSpace: ColorSpace,
  toColorSpace: ReferenceSpace = ReferenceSpace.XYZ,
  referenceIlluminant: Illuminant,
  scene: Babylon.Scene
) {
  // hold a reference ot entity names to ne used in this render function
  const baseEntityName: string = "rgb-value-indicator";
  const sceneEntityNames: any = {
    transform: `transform.${baseEntityName}`,
    material: `material.${baseEntityName}`,
    mesh: `mesh.${baseEntityName}`,
  };

  // derive location in XYZ space of point center
  let pointPosition: number[] = Transform(ReferenceSpace.RGB).to(
    ReferenceSpace.XYZ
  )(expandRgbColor(rgb_color), currentSpace, {
    referenceIlluminant,
  });

  // locate position coordinates
  pointPosition =
    toColorSpace === ReferenceSpace.LCHuv
      ? [
          Transform(ReferenceSpace.LUV).to(ReferenceSpace.LCHuv)(
            Transform(ReferenceSpace.XYZ).to(ReferenceSpace.LUV)(
              pointPosition,
              referenceIlluminant
            )
          ),
        ]
          .map((Lch_color: number[]) => normalizeLchColor(Lch_color))
          .map((normalizedColor: number[]) =>
            getPolarCoordinatesFor(normalizedColor)
          )
          .flat()
      : pointPosition;

  // derive normalized RGB color for the point within the current space
  // add companding flag to ensure proper gamma correction is applied
  const pointColor: number[] = Transform(ReferenceSpace.RGB).to(
    ReferenceSpace.XYZ
  )(expandRgbColor(rgb_color), currentSpace, {
    referenceIlluminant,
  });

  // Create a transform node, or reference one from a provided entity list.
  // set the transform position based on derived pointPosition.
  // This ultimately moves the sphere to the proper location within XYZ space
  // create new transform node
  const transformNode: Babylon.TransformNode =
    scene.getTransformNodeByName(sceneEntityNames.transform) ||
    new Babylon.TransformNode(sceneEntityNames.transform);

  // move the transformation node to align with the updated position
  transformNode.position.x = pointPosition[0];
  transformNode.position.y = pointPosition[1];
  transformNode.position.z = pointPosition[2];

  // find the material within the scene if it hasnt yet been created
  const material: Babylon.StandardMaterial =
    (scene.getMaterialByName(
      sceneEntityNames.material
    ) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(sceneEntityNames.material, scene);

  // apply the converted color as the material diffuse color
  material.diffuseColor = new Babylon.Color3(...pointColor);

  // search for the existing mesh name if any controls have been updated
  // or create a new one if none are found
  let mesh: Babylon.Mesh =
    (scene.getMeshByName(sceneEntityNames.mesh) as Babylon.Mesh) ||
    Babylon.SphereBuilder.CreateSphere(
      sceneEntityNames.mesh,
      { diameter: 0.04 },
      scene
    );

  // set mesh properties
  mesh.parent = transformNode;
  mesh.material = material;
  mesh.useVertexColors = true;
}

// render a color space given a source space into LUV space. Requires a scene
// and a reference illuminant. Illuminant is configurable from the UI.
export function renderRGBinLUV(
  vertexData: Babylon.VertexData,
  scene: Babylon.Scene
) {
  // entity names
  const { material, mesh } = sceneEntityNames.colorSpace;

  // material to apply to base mesh
  const materialSpectrum: Babylon.StandardMaterial =
    (scene.getMaterialByName(material.geometry) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(material.geometry, scene);

  // spectral mesh properties
  materialSpectrum.alpha = 1;

  // wireframe material effect
  const materialWireframe: Babylon.StandardMaterial =
    (scene.getMaterialByName(material.wireframe) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(material.wireframe, scene);
  
  // set wireframe material properties to always appear as white
  materialWireframe.emissiveColor = new Babylon.Color3(1, 1, 1);
  materialWireframe.useEmissiveAsIllumination = true;
  materialWireframe.wireframe = true;
  materialWireframe.alpha = 0.15;

  const meshSpectrum: Babylon.Mesh =
    (scene.getMeshByName(mesh.geometry) as Babylon.Mesh) ||
    new Babylon.Mesh(mesh.geometry, scene);

  meshSpectrum.material = materialSpectrum;

  vertexData.applyToMesh(meshSpectrum);

  const meshWireframe: Babylon.Mesh =
    (scene.getMeshByName(mesh.wireframe) as Babylon.Mesh) ||
    meshSpectrum.clone(mesh.wireframe);

  //meshWireframe.material = materialWireframe;

  // get reference to the in-scene camera
  const camera: Babylon.Nullable<Babylon.ArcRotateCamera> = scene.getCameraByName(
    "camera"
  ) as Babylon.ArcRotateCamera;

  // update camera to focus on cylindrical origin
  camera.setTarget(new Babylon.Vector3(0, 0.5, 0));
  camera.lowerRadiusLimit = 2.5;
  camera.upperRadiusLimit = 2.5;
}

// takes an LCHuv color that has been normalized to a 0-1 range and
// calculates x,y,z coordinates to be mapped as a point in polar space
function getPolarCoordinatesFor(colorNormalized: number[]): number[] {
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

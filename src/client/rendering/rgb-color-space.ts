import * as Babylon from "babylonjs";
import { sceneEntityNames } from "@res/rendering-constants";

const meshDiffuseOpacity: number = 0.075;
const wireframeDiffuseOpacity: number = 0.25;

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
  materialSpectrum.alpha = meshDiffuseOpacity;

  // creation of material for wireframe effect
  const materialWireframe: Babylon.StandardMaterial =
    (scene.getMaterialByName(material.wireframe) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial(material.wireframe, scene);

  // set material properties
  //materialWireframe.emissiveColor = new Babylon.Color3(1, 1, 1);
  materialWireframe.useEmissiveAsIllumination = true;
  materialWireframe.alpha = wireframeDiffuseOpacity;
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
}

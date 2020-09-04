import * as Babylon from "babylonjs";
import { sceneEntityNames } from "@res/rendering-constants";
import { GraphType } from "@lib/enums";

export function renderFloor(graphType: GraphType, scene: Babylon.Scene) {
  const reflectedMeshes: (Babylon.AbstractMesh | null)[] = [
    scene.getMeshByName(sceneEntityNames.colorSpace.mesh.geometry),
    scene.getMeshByName(sceneEntityNames.colorSpace.mesh.wireframe),
  ];

  const diffuseMat: Babylon.StandardMaterial =
    (scene.getMaterialByName(
      "floor-diffuse-texture"
    ) as Babylon.StandardMaterial) ||
    new Babylon.StandardMaterial("floor-diffuse-texture", scene);
  diffuseMat.diffuseColor = new Babylon.Color3(250, 245, 255);
  diffuseMat.alpha = 0;

  const backgroundMat: Babylon.BackgroundMaterial =
    (scene.getMaterialByName("bg-mat") as Babylon.BackgroundMaterial) ||
    new Babylon.BackgroundMaterial("bg-mat", scene);

  let mirrorMat: Babylon.MirrorTexture =
    (backgroundMat.reflectionTexture as Babylon.MirrorTexture) ||
    new Babylon.MirrorTexture("floor-material", 2048, scene);
  if (!backgroundMat.reflectionTexture) {
    mirrorMat.mirrorPlane = new Babylon.Plane(0, -1, 0, 0);
    mirrorMat.renderList?.push(
      scene.getMeshByName(
        sceneEntityNames.colorSpace.mesh.geometry
      ) as Babylon.AbstractMesh
    );
	}
	backgroundMat.fovMultiplier = 0.2;
  backgroundMat.primaryColor = new Babylon.Color3(255, 0, 255);
  backgroundMat.reflectionFresnel = true;
	backgroundMat.reflectionStandardFresnelWeight = 0.99;
  backgroundMat.reflectionTexture = mirrorMat;
  backgroundMat.alpha = 0.15;

  const floorTransform: Babylon.TransformNode =
    (scene.getTransformNodeByName(
      "floor-transform"
    ) as Babylon.TransformNode) ||
    new Babylon.TransformNode("floor-transform", scene);
  floorTransform.position = new Babylon.Vector3(0.5, 0, 0.5);

  const floorMesh: Babylon.Mesh =
    (scene.getMeshByName("floor-mesh") as Babylon.Mesh) ||
    Babylon.Mesh.CreateGround("floor-mesh", 1, 1, 2, scene);
  floorMesh.material = backgroundMat;
  floorMesh.parent = floorTransform;
  floorMesh.receiveShadows = true;
  floorMesh.isVisible = graphType === GraphType.box;

  let discTransform: Babylon.Nullable<Babylon.TransformNode> = scene.getTransformNodeByName(
    "floor-transform-disc"
  ) as Babylon.TransformNode;

  if (!discTransform) {
    discTransform = new Babylon.TransformNode("floor-transform-disc", scene);
    discTransform.position = new Babylon.Vector3(0, 0, 0);
    discTransform.rotate(
      new Babylon.Vector3(1, 0, 0),
      Math.PI / 2,
      Babylon.Space.WORLD
    );
  }

  const floorDisc: Babylon.Mesh =
    (scene.getMeshByName("floor-mesh-cylinder") as Babylon.Mesh) ||
    Babylon.MeshBuilder.CreateDisc(
      "floor-mesh-cylinder",
      { radius: 0.75, tessellation: 360 },
      scene
    );
  floorDisc.parent = discTransform;
  floorDisc.material = backgroundMat;
  floorDisc.isVisible = graphType === GraphType.cylindrical;

  // push materials to be reflected
  if ((mirrorMat.renderList?.length || 0) < 2) {
    reflectedMeshes.forEach((mesh: Babylon.AbstractMesh | null) => {
      if (mesh) {
        mirrorMat.renderList?.push(mesh);
      }
    });
  }
}

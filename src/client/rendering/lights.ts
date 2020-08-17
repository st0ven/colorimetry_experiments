import * as Babylon from "babylonjs";

// render hemisphere light to 3d graphs
export function renderHemiLight(scene: Babylon.Scene) {
  // define the entity name within the scene as a string
  const entityName: string = "hemi-light-01";
  const positionY: number = 20;

  // search scene for this light or create a new one
  const light: Babylon.HemisphericLight =
    (scene.getLightByName(entityName) as Babylon.HemisphericLight) ||
    new Babylon.HemisphericLight(
      entityName,
      new Babylon.Vector3(0, positionY, 0),
      scene
    );

  // set light properties
  light.diffuse = new Babylon.Color3(1, 1, 1);
  light.groundColor = new Babylon.Color3(1, 1, 1);
  light.specular = new Babylon.Color3(0, 0, 0);
}

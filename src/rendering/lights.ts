import * as Babylon from "babylonjs";
import { findEntityInList } from "../helper/babylon-entities";

// render hemisphere light to 3d graphs
export function renderHemiLight(
  scene: Babylon.Scene,
  entityRefs?: Array<Babylon.Light>
): Babylon.Light | void {
  if (!scene.lights.some((light: Babylon.Light) => light.name === "hemi1")) {
    // lighting instantitation
    const light: Babylon.HemisphericLight = new Babylon.HemisphericLight(
      "hemi1",
      new Babylon.Vector3(0, 20, 0),
      scene
    );
    light.diffuse = new Babylon.Color3(1, 1, 1);
    light.groundColor = new Babylon.Color3(1, 1, 1);
    light.specular = new Babylon.Color3(0, 0, 0);

    return light;
  }
}

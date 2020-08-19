import * as Babylon from "babylonjs";

export function adjustCameraTarget(
  camera: Babylon.ArcRotateCamera,
  targetVector: Babylon.Vector3 = new Babylon.Vector3(0.5, 0.5, 0.5),
  limitLock: number = 2
) {
  // update camera to focus on XYZ origin
  camera.setTarget(targetVector);
  camera.lowerRadiusLimit = limitLock;
  camera.upperRadiusLimit = limitLock;
}

import * as Babylon from "babylonjs";

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

export function findMaterialByName(
  name: string,
  scene: Babylon.Scene
): Babylon.Material | undefined {
  for (let material of scene.materials) {
    if (material.name === name) {
      return material;
    }
  }
  return undefined;
}

// given a list of potential entity references, search through the list
// and return the item if matched by the entity's name to the provided string.
export function findEntityInList(
  list: unknown[] | undefined = [],
  queryName: string
): any | undefined {
  for (let item of list) {
    const { name }: any = item;
    if (name === queryName) {
      return item;
    }
  }
  return undefined;
}

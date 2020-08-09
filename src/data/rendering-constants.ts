const baseEntityNames: any = {
  colorSpace: `color-space`,
};

export const sceneEntityNames: any = {
  colorSpace: {
    mesh: {
      geometry: `mesh.${baseEntityNames}`,
      wireframe: `mesh.${baseEntityNames}-wireframe`,
    },
    material: {
      geometry: `material.${baseEntityNames}`,
      wireframe: `material.${baseEntityNames}-wireframe`,
    },
  },
};

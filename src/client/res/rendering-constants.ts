const baseEntityNames: any = {
  colorIndicator: `rgb-value-indicator`,
  colorSpace: `color-space`,
};

export const sceneEntityNames: any = {
  colorIndicator: {
    material: `material.${baseEntityNames.colorIndicator}`,
    mesh: `mesh.${baseEntityNames.colorIndicator}`,
    transform: `transform.${baseEntityNames.colorIndicator}`,
  },
  colorSpace: {
    mesh: {
      geometry: `mesh.${baseEntityNames.colorSpace}`,
      wireframe: `mesh.${baseEntityNames.colorSpace}-wireframe`,
    },
    material: {
      geometry: `material.${baseEntityNames.colorSpace}`,
      wireframe: `material.${baseEntityNames.colorSpace}-wireframe`,
    },
  },
};

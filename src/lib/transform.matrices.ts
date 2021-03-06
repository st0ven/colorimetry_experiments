// a custom implementation of the esnext supported Array.flat() method.
// Takes an array of any depth, and provided an optional maxDepth parameter,
// will return an array flattened to the desired depth, or if none provided,
// a 1-dimensional list of the original array structure.
export function flatten(array: any[], maxDepth: number = 0): any[] {
  // iterate through array children via invokable recursive function
  return (function iterateDepth(
    array: any[],
    flatArray: any[] = [],
    depth: number
  ): any[] {
    array.forEach((item: any) => {
      // check if this item in the array is also an array
      // ensure the max depth has not been met
      if (item instanceof Array && depth < (maxDepth || Infinity)) {
        iterateDepth(item, flatArray, depth + 1);
      } 
      // this is the deepest array item for this child.
      else {
        flatArray.push(item);
      }
    });
    // recursion is complete, return the flattened result
    return flatArray;
  })(array, [], maxDepth);
}

// convenience method to quickly convert Rads to Degrees
export function convertRadiansToDegrees(rad: number): number {
  return rad * (180 / Math.PI);
}

// a convenience function to quickly convert Degrees to Rads
export function convertDegreesToRadians(degree: number): number {
  return degree * (Math.PI / 180);
}

// a convenience function to scale the values in a 2d matrix by a specified multiplier
export function scaleMatrix(coeff: number, matrix: number[][]): number[][] {
  return matrix.map((row: number[]) => row.map((j: number) => j * coeff));
}

// a method which expects two 2D matrices to multiply. m1 and m2 must be of
// a compatible 'shape' relative to each other, else an error is thrown.
export function matrixMultiply(m1: number[][], m2: number[][]): number[][] {
  if (m1.length && m2.length && m1[0].length === m2.length) {
    return Array(m1.length)
      .fill(Array(m2[0].length).fill(0))
      .map((newRow: number[], newRowIndex: number) =>
        newRow.map((newValue: number, newColIndex: number) =>
          m2
            .map((m2_row: number[]) => m2_row[newColIndex])
            .map(
              (k: number, m2_colIndex: number): number =>
                k * m1[newRowIndex][m2_colIndex]
            )
            .reduce((sum: number = 0, k: number) => sum + k)
        )
      );
  } else {
    throw new Error(
      "error in matrixMultiply(): argument matricies are of the wrong shape"
    );
  }
}

function getDeterminantOf2x2Matrix(matrix: number[][]): number {
  if (
    matrix.length &&
    matrix.length === matrix[0].length &&
    matrix.length === 2
  ) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  } else {
    throw new Error(
      "error in getDeterminantOf2x2Matrix: incompatible matrix received as argument"
    );
  }
}

function getDeterminantOf3x3Matrix(matrix: number[][]): number {
  return matrix[0]
    .map(
      (j: number, colIndex: number): number =>
        j *
        (colIndex % 2 ? -1 : 1) *
        getDeterminantOf2x2Matrix(
          get2x2MatrixOfMinorsFrom3x3Matrix(matrix, 0, colIndex)
        )
    )
    .reduce((sum: number, det: number) => sum + det);
}

function get2x2MatrixOfMinorsFrom3x3Matrix(
  matrix: number[][],
  rowIndex: number,
  columnIndex: number
): number[][] {
  if (
    matrix.length &&
    matrix.length === matrix[0].length &&
    matrix.length === 3
  ) {
    return matrix
      .map((row: number[], i: number): any =>
        i !== rowIndex
          ? row
              .map((j: number, colIndex: number): any =>
                colIndex !== columnIndex ? j : undefined
              )
              .filter((n) => n !== undefined)
          : undefined
      )
      .filter((n) => n);
  } else {
    throw new Error(
      "error in get2x2MatrixOfMinorsFrom3x3Matrix: incompatible matrix error"
    );
  }
}

function getMatrixOfMinorsFrom3x3Matrix(matrix: number[][]) {
  return matrix.map((row: number[], rowIndex: number) =>
    row.map((j: number, colIndex: number) =>
      getDeterminantOf2x2Matrix(
        get2x2MatrixOfMinorsFrom3x3Matrix(matrix, rowIndex, colIndex)
      )
    )
  );
}

function getMatrixOfCofactors(matrix: number[][]): number[][] {
  return matrix.map((row: number[], rowIndex: number): number[] =>
    row.map((j: number, colIndex: number): number =>
      (!(rowIndex % 2) && colIndex % 2) || (rowIndex % 2 && !(colIndex % 2))
        ? -j
        : j
    )
  );
}

function getMatrixAdjugate(matrix: number[][]): number[][] {
  return matrix.map((row: number[], rowIndex: number) =>
    row.map((j: number, colIndex: number): number =>
      rowIndex !== colIndex ? matrix[colIndex][rowIndex] : j
    )
  );
}

export function invertMatrix(m: number[][]): number[][] {
  if (m.length && m.length === m[0].length) {
    const matrix_of_minors: number[][] = getMatrixOfMinorsFrom3x3Matrix(m);
    const matrix_of_cofactors: number[][] = getMatrixOfCofactors(
      matrix_of_minors
    );
    const matrix_adjugate: number[][] = getMatrixAdjugate(matrix_of_cofactors);
    const matrix_det: number = getDeterminantOf3x3Matrix(m);
    return scaleMatrix(1 / matrix_det, matrix_adjugate);
  } else {
    throw new Error(
      "error in invertMatrix(): argument matrix are of wrong shape"
    );
  }
}

export function rotateMatrix(m: number[][]): number[][] {
  const maxAxisSize: number = m.length > m[0].length ? m.length : m[0].length;
  return Array(maxAxisSize)
    .fill(Array(maxAxisSize).fill(undefined))
    .map((row: number[], rowIndex: number) =>
      row
        .map((j: number, colIndex: number) =>
          m[colIndex] !== undefined ? m[colIndex][rowIndex] : j
        )
        .filter((n) => n !== undefined)
    )
    .filter((row: number[]) => (row && row.length ? row : false));
}

export function getColumnFromMatrix(
  m: Array<Array<number>>,
  columnIndex: number
) {
  return m.map((row: Array<number>) => row[columnIndex]);
}

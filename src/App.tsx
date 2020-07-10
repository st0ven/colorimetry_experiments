import React from "react";
import "./App.css";
import { Graph3d } from "./components/graph-3d";

const data = require("./data/cmf_1931_XYZ_0.1nm.csv");
const points = data
  // extract wavelength info
  .map((datum: Array<any>) =>
    datum.slice(1).map((point: string) => Number(point))
  )
  // normalize to a 3d plane
  .map((datum: Array<number>) => {
    const sum = datum[0] + datum[1] + datum[2];
    return [datum[0] / sum, datum[1] / sum, datum[2] / sum];
  });

function App() {
  return (
    <div className="App">
      <Graph3d map={points}></Graph3d>
    </div>
  );
}

export default App;

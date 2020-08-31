import React, { useReducer, useEffect } from "react";
import { VertexData } from "babylonjs";
import styles from "./app.module.scss";
import { ChromaticityVisualization } from "@containers/chromaticity";
import { RGBVisualization } from "@containers/color-space";
import { ParameterList } from "@containers/parameter-list";
import { fetchColorSpaceGeometry } from "@api/geometry.api";
import {
  initialStore,
  StoreContext,
  storeReducer,
  StoreShape,
} from "@hooks/store-context";

// Main application component
function App() {
  // create reducer to control dispatched actions from the parameter list component
  const [store, dispatch] = useReducer(storeReducer, initialStore);

  // destructure store parameters
  const {
    colorSpace,
    sourceColorModel,
    targetColorModel,
    whitepoint,
    fidelity,
  }: StoreShape = store;

  useEffect(() => {
    (async function getApiResult() {
      dispatch({ name: "setWaiting", value: true });
      const geometry: VertexData | undefined = await fetchColorSpaceGeometry(
        fidelity,
        colorSpace,
        sourceColorModel,
        targetColorModel,
        whitepoint
      );
      dispatch({ name: "setGeometry", value: geometry });
      dispatch({ name: "setWaiting", value: false });
    })();
  }, [colorSpace, sourceColorModel, targetColorModel, whitepoint, fidelity]);

  // render output
  return (
    <main className={styles.app}>
      <StoreContext.Provider value={{ store, dispatch }}>
        <aside className={styles.controls}>
          <ParameterList />
        </aside>
        <section className={styles.display}>
          <RGBVisualization geometry={store.geometry}/>
        </section>
      </StoreContext.Provider>
    </main>
  );
}

export default App;

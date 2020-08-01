import React from "react";
import styles from "./App.module.scss";
import { ChromaticityVisualization } from "./containers/chromaticity-visualization";
import { RGBVisualization } from "./containers/rgb-visualization";

// Main application component
function App() {
  // render output
  return (
    <div className={styles.app}>
      <section className={styles.chromaticitySection}>
        <ChromaticityVisualization />
      </section>
      <section>
        <RGBVisualization />
      </section>
    </div>
  );
}

export default App;

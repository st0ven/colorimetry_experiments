import React, { useCallback, useContext, ChangeEvent } from "react";
import { Select } from "@components/select";
import styles from "./parameter-list.module.scss";
import { FieldSet, Field } from "@components/option-group";
import {
  ColorModelOptions,
  ColorSpaceOptions,
  IlluminantOptions,
} from "@components/color-space-options";
import {
  StoreContextShape,
  StoreContext,
  initialStore,
} from "@hooks/store-context";

// a collection of mesh fidelity options defined as the number of vertices to
// create for any given cube fase of the reference vertex data.
const fidelityOptions: any = {
  low: Math.pow(2, 3),
  med: Math.pow(2, 4),
  high: Math.pow(2, 5),
};

// component
export function ParameterList() {
  // destructure initial values to use for parameter controls
  const { colorSpace, targetColorModel, whitepoint, fidelity } = initialStore;

  // grab dispatch method from store context
  const { store, dispatch }: StoreContextShape = useContext(StoreContext);

  // grab reference to whether or not app state is awaitng a response from server
  const { waiting } = store;

  // when a parameter updates, use this generic handler to extract the intended
  // reducer action from a data attribute passed to the control. Dispatch the
  // extracted action along with the value of the control element (as the event target)
  const parameterChangeHandler = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement> | CustomEvent) => {
      const { target } = event instanceof CustomEvent ? event.detail : event;
      const actionName: string | null = target.getAttribute("data-action");

      if (dispatch && actionName) {
        dispatch({
          name: actionName,
          value: target.value,
        });
      }
    },
    [dispatch]
  );

  // render parameter controls
  return (
    <menu className={styles.menu}>
      <section className={styles.topic}>
        <h3 className={styles.title}>Visualization options</h3>
        <Select
          className={styles.control}
          onChange={parameterChangeHandler}
          id="space options"
          action="setColorSpace"
          label="Color space"
          infoText="Determines which RGB color space to visualize"
          initialValue={colorSpace}
          disabled={waiting}
        >
          <ColorSpaceOptions />
        </Select>
        <Select
          className={styles.control}
          onChange={parameterChangeHandler}
          id="destination space"
          action="setTargetColorModel"
          label="Color model"
          infoText="Visualize color space within a selected color model"
          initialValue={targetColorModel}
          disabled={waiting}
        >
          <ColorModelOptions />
        </Select>
        <Select
          className={styles.control}
          onChange={parameterChangeHandler}
          id="illuminant options"
          action="setWhitepoint"
          label="White point"
          infoText="a standard illuminant to represent the brightest white"
          initialValue={whitepoint}
          disabled={waiting}
        >
          <IlluminantOptions />
        </Select>
        {/*<Select
          className={styles.control}
          onChange={parameterChangeHandler}
          id="mesh fidelity"
          action="setFidelity"
          label="Fidelity"
          infoText="precision of the mesh representing the color space"
          initialValue={fidelity}
          disabled={waiting}
        >
          <option value={fidelityOptions.low}>low</option>
          <option value={fidelityOptions.med}>medium</option>
          <option value={fidelityOptions.high}>high</option>
        </Select>*/}
        <FieldSet
          action="setFidelity"
          id="mesh fidelity options"
          label="Fidelity"
          infoText="precision of the mesh representing the color space"
          initialValue={fidelity}
          disabled={waiting}
          onChange={parameterChangeHandler}
        >
          <Field type="radio" value={fidelityOptions.low} defaultChecked={true}>
            low
          </Field>
          <Field type="radio" value={fidelityOptions.med}>
            medium
          </Field>
          <Field type="radio" value={fidelityOptions.high}>
            high
          </Field>
        </FieldSet>
      </section>
    </menu>
  );
}

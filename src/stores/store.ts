import { configureStore } from "@reduxjs/toolkit";

import { appConfigReducer } from "@/stores/slices/appConfigSlice";
import { toolBuilderReducer } from "@/stores/slices/toolBuilderSlice";

/**
 * Create a fresh Redux store instance.
 *
 * A factory (not a singleton) so the App Router can build one store per
 * request on the server while reusing a single store on the client — see
 * `@/providers/StoreProvider`. Register new slices in the `reducer` map.
 */
export const makeStore = () =>
  configureStore({
    reducer: {
      appConfig: appConfigReducer,
      toolBuilder: toolBuilderReducer,
    },
  });

/** Store instance type returned by {@link makeStore}. */
export type AppStore = ReturnType<typeof makeStore>;

/** Root state shape — union of every mounted slice. */
export type RootState = ReturnType<AppStore["getState"]>;

/** Dispatch type, aware of thunks and middleware. */
export type AppDispatch = AppStore["dispatch"];

import { useDispatch, useSelector, useStore } from "react-redux";

import type { AppDispatch, AppStore, RootState } from "@/stores/store";

/**
 * Typed `useDispatch`. Use everywhere instead of the plain react-redux hook so
 * thunks and action creators are correctly typed.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/** Typed `useSelector`, pre-bound to {@link RootState}. */
export const useAppSelector = useSelector.withTypes<RootState>();

/** Typed `useStore`, pre-bound to {@link AppStore}. */
export const useAppStore = useStore.withTypes<AppStore>();

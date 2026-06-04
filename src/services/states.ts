import { createContextState } from 'foxact/create-context-state'

const [ThemeModeProvider, useThemeMode, useSetThemeMode] = createContextState<
  'light' | 'dark'
>()

// save the state of each profile item loading
const [LoadingCacheProvider, useLoadingCache, useSetLoadingCache] =
  createContextState<Set<string>>(new Set())

// save update state
const [UpdateStateProvider, useUpdateState, useSetUpdateState] =
  createContextState<boolean>(false)

// save lazy mode state (default to true)
const [LazyModeProvider, useLazyMode, useSetLazyMode] =
  createContextState<boolean>(true)

export {
  ThemeModeProvider,
  useThemeMode,
  useSetThemeMode,
  LoadingCacheProvider,
  useLoadingCache,
  useSetLoadingCache,
  UpdateStateProvider,
  useUpdateState,
  useSetUpdateState,
  LazyModeProvider,
  useLazyMode,
  useSetLazyMode,
}

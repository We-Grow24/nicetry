"use client";
/**
 * Shared context for the wixclone-derived builder components.
 * Adapted from wixclone/src/Context/contexts.js
 * – react-router-dom removed, replaced with Next.js equivalents
 * – Supabase auth replaces the original JWT / Express auth
 */
import {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  MutableRefObject,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CSSProperty {
  [key: string]: string;
}

export interface PageElement {
  id: string;
  type: string;
  children?: PageElement[];
  styles?: CSSProperty;
}

export interface WebPage {
  pageId: string;
  pageName: string;
  elements?: PageElement[];
}

export interface WebDesignState {
  pages?: WebPage[];
}

export interface PageDesign {
  settigMode: number; // -1 = closed, 0..4 = panel modes matching wixclone
  css?: string;
  elements?: PageElement[];
}

export interface EditorState {
  pageId?: string;
  websiteId?: string;
}

// ─── pageDesignContext ────────────────────────────────────────────────────────

interface PageDesignContextType {
  design: PageDesign;
  setDesign: (d: PageDesign | ((prev: PageDesign) => PageDesign)) => void;
  webDesignState: WebDesignState;
  setWebDesignState: (s: WebDesignState) => void;
  /** Ref tracking the currently active layer element key */
  activeElemLayer: MutableRefObject<string | null>;
}

const defaultPageDesign: PageDesign = { settigMode: -1 };

export const pageDesignContext = createContext<PageDesignContextType>({
  design: defaultPageDesign,
  setDesign: () => {},
  webDesignState: {},
  setWebDesignState: () => {},
  activeElemLayer: { current: null },
});

export function PageDesignProvider({ children }: { children: ReactNode }) {
  const [design, setDesign] = useState<PageDesign>(defaultPageDesign);
  const [webDesignState, setWebDesignState] = useState<WebDesignState>({});
  const activeElemLayer = useRef<string | null>(null);

  return (
    <pageDesignContext.Provider
      value={{ design, setDesign, webDesignState, setWebDesignState, activeElemLayer }}
    >
      {children}
    </pageDesignContext.Provider>
  );
}

export function usePageDesign() {
  return useContext(pageDesignContext);
}

// ─── userDetailsContext ───────────────────────────────────────────────────────

interface UserDetailsContextType {
  editorState: EditorState;
  setEditorState: (s: EditorState) => void;
}

export const userDetailsContext = createContext<UserDetailsContextType>({
  editorState: {},
  setEditorState: () => {},
});

export function UserDetailsProvider({ children }: { children: ReactNode }) {
  const [editorState, setEditorState] = useState<EditorState>({});
  return (
    <userDetailsContext.Provider value={{ editorState, setEditorState }}>
      {children}
    </userDetailsContext.Provider>
  );
}

export function useUserDetails() {
  return useContext(userDetailsContext);
}
